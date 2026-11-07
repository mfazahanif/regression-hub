import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSessionDto } from './sessions.dto.js';
import { randomUUID } from 'node:crypto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(private prisma: PrismaService) {}

  async deleteSession(id: string) {
    try {
      return await this.prisma.session.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });
    } catch (error) {
      if (!this.isMissingClosedAtColumn(error)) throw error;
      const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
        UPDATE "sessions"
        SET "isDeleted" = true, "deletedAt" = NOW(), "updatedAt" = NOW()
        WHERE "id" = ${id}
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundException('Session not found');
      return { ...rows[0], closedAt: null };
    }
  }

  async createSession(dto: CreateSessionDto) {
    const sessionStatus = this.getInitialSessionStatus(dto.startDate);
    const defaultStatus = await this.prisma.status.findFirst({
      where: { name: 'TO DO' }
    });

    // Fallback if 'TO DO' doesn't exist, try 'UNTESTED'
    const fallbackStatus = await this.prisma.status.findFirst({
      where: { name: 'UNTESTED' }
    });

    const initialStatusId = defaultStatus?.id || fallbackStatus?.id;
    if (!initialStatusId) {
      throw new NotFoundException('Default execution status not found in database');
    }

    try {
      return await this.createSessionTransaction(dto, initialStatusId, false, sessionStatus);
    } catch (error) {
      if (!this.isMissingClosedAtColumn(error)) throw error;
      this.logger.warn('Creating a session without the pending sessions.closedAt column. Apply pending Prisma migrations.');
      return this.createSessionTransaction(dto, initialStatusId, true, sessionStatus);
    }
  }

  private createSessionTransaction(dto: CreateSessionDto, initialStatusId: number, legacySchema: boolean, sessionStatus: string) {
    return this.prisma.$transaction(async (tx: any) => {
      const session = legacySchema
        ? (await tx.$queryRaw`
            INSERT INTO "sessions" ("id", "name", "environmentId", "status", "startDate", "endDate", "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${dto.name}, ${Number(dto.environmentId)}, ${sessionStatus}, ${dto.startDate ? new Date(dto.startDate) : new Date()}, ${dto.endDate ? new Date(dto.endDate) : null}, NOW(), NOW())
            RETURNING *
          `)[0]
        : await tx.session.create({
            data: {
              name: dto.name,
              environmentId: Number(dto.environmentId),
              status: sessionStatus,
              ...(dto.startDate && { startDate: new Date(dto.startDate) }),
              ...(dto.endDate && { endDate: new Date(dto.endDate) }),
            }
          });

      if (dto.moduleIds && dto.moduleIds.length > 0) {
        const sessionModules = dto.moduleIds.map(moduleId => ({
          sessionId: session.id,
          moduleId
        }));
        await tx.sessionModule.createMany({ data: sessionModules });

        const testcases = await tx.masterTestcase.findMany({
          where: { 
            moduleId: { in: dto.moduleIds },
            isDeleted: false
          }
        });

        if (testcases.length > 0) {
          const executions = testcases.map((tc: any) => ({
            sessionId: session.id,
            testcaseId: tc.id,
            statusId: initialStatusId,
          }));
          await tx.sessionExecution.createMany({ data: executions });
        }

        if (dto.assignments && Object.keys(dto.assignments).length > 0) {
          const claims = Object.entries(dto.assignments).map(([moduleId, userId]) => ({
            sessionId: session.id,
            moduleId,
            claimedById: userId,
            isActive: true,
          }));
          await tx.claimHistory.createMany({ data: claims });
        }
      }

      return { ...session, closedAt: session.closedAt ?? null };
    });
  }

  private isMissingClosedAtColumn(error: unknown) {
    const prismaError = error as { code?: string; meta?: { column?: string }; message?: string };
    return prismaError.code === 'P2022'
      && (prismaError.meta?.column?.includes('closedAt') || prismaError.message?.includes('closedAt'));
  }

  private getInitialSessionStatus(startDate?: string) {
    const start = startDate ? new Date(startDate) : new Date();
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Tanggal mulai sesi tidak valid');

    const appDate = (date: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    };

    return appDate(start) <= appDate(new Date()) ? 'On Progress' : 'TO DO';
  }

  
  
  async cloneSession(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        environmentId: true,
        endDate: true,
        sessionModules: { select: { moduleId: true } },
        claimHistories: { where: { isActive: true } }
      }
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const defaultStatus = await this.prisma.status.findFirst({ where: { name: 'TO DO' } });
    const fallbackStatus = await this.prisma.status.findFirst({ where: { name: 'UNTESTED' } });
    const initialStatusId = defaultStatus?.id || fallbackStatus?.id;
    if (!initialStatusId) {
      throw new NotFoundException('Default execution status not found in database');
    }

    try {
      return await this.cloneSessionTransaction(session, initialStatusId, false);
    } catch (error) {
      if (!this.isMissingClosedAtColumn(error)) throw error;
      this.logger.warn('Cloning a session without the pending sessions.closedAt column. Apply pending Prisma migrations.');
      return this.cloneSessionTransaction(session, initialStatusId, true);
    }
  }

  private cloneSessionTransaction(
    session: {
      name: string;
      environmentId: number;
      endDate: Date | null;
      sessionModules: { moduleId: string }[];
      claimHistories: { moduleId: string; claimedById: string }[];
    },
    initialStatusId: number,
    legacySchema: boolean,
  ) {
    return this.prisma.$transaction(async (tx: any) => {
      const clonedSession = legacySchema
        ? (await tx.$queryRaw`
            INSERT INTO "sessions" ("id", "name", "environmentId", "status", "startDate", "endDate", "createdAt", "updatedAt")
            VALUES (${randomUUID()}, ${session.name + ' (Clone)'}, ${session.environmentId}, 'TO DO', NOW(), ${session.endDate}, NOW(), NOW())
            RETURNING *
          `)[0]
        : await tx.session.create({
            data: {
              name: session.name + ' (Clone)',
              environmentId: session.environmentId,
              status: 'TO DO',
              startDate: new Date(),
              endDate: session.endDate,
            }
          });

      if (session.sessionModules.length > 0) {
        const moduleIds = session.sessionModules.map(sm => sm.moduleId);
        const newSessionModules = moduleIds.map(moduleId => ({
          sessionId: clonedSession.id,
          moduleId
        }));
        await tx.sessionModule.createMany({ data: newSessionModules });

        const testcases = await tx.masterTestcase.findMany({
          where: { 
            moduleId: { in: moduleIds },
            isDeleted: false
          }
        });

        if (testcases.length > 0) {
          const executions = testcases.map((tc: any) => ({
            sessionId: clonedSession.id,
            testcaseId: tc.id,
            statusId: initialStatusId,
          }));
          await tx.sessionExecution.createMany({ data: executions });
        }

        if (session.claimHistories.length > 0) {
          const claims = session.claimHistories.map((claim: any) => ({
            sessionId: clonedSession.id,
            moduleId: claim.moduleId,
            claimedById: claim.claimedById,
            isActive: true,
          }));
          await tx.claimHistory.createMany({ data: claims });
        }
      }

      return legacySchema ? { ...clonedSession, closedAt: null } : clonedSession;
    });
  }

  async updateSession(id: string, dto: any) {
    const defaultStatus = await this.prisma.status.findFirst({
      where: { name: 'TO DO' }
    });
    const fallbackStatus = await this.prisma.status.findFirst({
      where: { name: 'UNTESTED' }
    });
    const initialStatusId = defaultStatus?.id || fallbackStatus?.id;

    const updateSessionTransaction = (legacySchema: boolean) => this.prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.environmentId) updateData.environmentId = Number(dto.environmentId);
      if (dto.startDate) updateData.startDate = new Date(dto.startDate);
      if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;

      let session;
      if (legacySchema) {
        const rows = await tx.$queryRaw`
          UPDATE "sessions"
          SET "name" = COALESCE(${dto.name ?? null}, "name"),
              "environmentId" = COALESCE(${dto.environmentId ? Number(dto.environmentId) : null}, "environmentId"),
              "startDate" = COALESCE(${dto.startDate ? new Date(dto.startDate) : null}, "startDate"),
              "endDate" = CASE WHEN ${dto.endDate !== undefined} THEN ${dto.endDate ? new Date(dto.endDate) : null}::timestamp ELSE "endDate" END,
              "updatedAt" = NOW()
          WHERE "id" = ${id}
          RETURNING *
        `;
        session = rows[0];
        if (!session) throw new NotFoundException('Session not found');
      } else {
        session = await tx.session.update({ where: { id }, data: updateData });
      }

      if (dto.moduleIds) {
        const existingModules = await tx.sessionModule.findMany({ where: { sessionId: id } });
        const existingModuleIds = existingModules.map((m: any) => m.moduleId);
        
        const toRemove = existingModuleIds.filter((mid: string) => !dto.moduleIds.includes(mid));
        const toAdd = dto.moduleIds.filter((mid: string) => !existingModuleIds.includes(mid));

        if (toRemove.length > 0) {
          await tx.sessionModule.deleteMany({ where: { sessionId: id, moduleId: { in: toRemove } } });
          const testcasesToRemove = await tx.masterTestcase.findMany({ where: { moduleId: { in: toRemove } } });
          const tcIds = testcasesToRemove.map((tc: any) => tc.id);
          if (tcIds.length > 0) {
            await tx.sessionExecution.deleteMany({ where: { sessionId: id, testcaseId: { in: tcIds } } });
          }
          await tx.claimHistory.deleteMany({ where: { sessionId: id, moduleId: { in: toRemove } } });
        }

        if (toAdd.length > 0) {
          const newSessionModules = toAdd.map((moduleId: string) => ({ sessionId: id, moduleId }));
          await tx.sessionModule.createMany({ data: newSessionModules });
          const testcasesToAdd = await tx.masterTestcase.findMany({ where: { moduleId: { in: toAdd }, isDeleted: false } });
          if (testcasesToAdd.length > 0 && initialStatusId) {
            const executionsToAdd = testcasesToAdd.map((tc: any) => ({
              sessionId: id,
              testcaseId: tc.id,
              statusId: initialStatusId
            }));
            await tx.sessionExecution.createMany({ data: executionsToAdd });
          }
        }
      }
      
      // Update assignments for existing and new modules
      if (dto.assignments) {
        for (const [moduleId, userId] of Object.entries(dto.assignments)) {
          // Find existing active claim
          const existingClaim = await tx.claimHistory.findFirst({
            where: { sessionId: id, moduleId, isActive: true }
          });
          
          if (userId) {
            if (!existingClaim || existingClaim.claimedById !== userId) {
               if (existingClaim) {
                 await tx.claimHistory.update({ where: { id: existingClaim.id }, data: { isActive: false } });
               }
               await tx.claimHistory.create({
                 data: { sessionId: id, moduleId, claimedById: userId, isActive: true }
               });
            }
          } else {
             if (existingClaim) {
               await tx.claimHistory.update({ where: { id: existingClaim.id }, data: { isActive: false } });
             }
          }
        }
      }

      return legacySchema ? { ...session, closedAt: null } : session;
    });

    try {
      return await updateSessionTransaction(false);
    } catch (error) {
      if (!this.isMissingClosedAtColumn(error)) throw error;
      this.logger.warn('Updating a session without the pending sessions.closedAt column. Apply pending Prisma migrations.');
      return updateSessionTransaction(true);
    }
  }

  async getSessions() {
    const where = { isDeleted: false };
    const orderBy = { createdAt: 'desc' as const };
    let sessions: any[];

    try {
      sessions = await this.prisma.session.findMany({
        where,
        include: {
          environment: true,
          _count: {
            select: { sessionModules: true, executions: true }
          }
        },
        orderBy
      });
    } catch (error) {
      const prismaError = error as { code?: string; meta?: { column?: string }; message?: string };
      const missingClosedAt = prismaError.code === 'P2022'
        && (prismaError.meta?.column?.includes('closedAt') || prismaError.message?.includes('closedAt'));

      if (!missingClosedAt) throw error;

      this.logger.warn('Database is missing sessions.closedAt; apply pending Prisma migrations to restore closure timestamps.');
      const legacySessions = await this.prisma.session.findMany({
        where,
        select: {
          id: true,
          name: true,
          environmentId: true,
          isOpen: true,
          status: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
          deletedAt: true,
          environment: true,
          _count: { select: { sessionModules: true, executions: true } }
        },
        orderBy
      });
      sessions = legacySessions.map(session => ({ ...session, closedAt: null }));
    }

    const statusWeight: Record<string, number> = {
      'ON PROGRESS': 1,
      'TO DO': 2,
      'FINISHED': 3,
      'DONE': 3
    };

    return sessions.sort((a, b) => {
      const weightA = statusWeight[a.status?.toUpperCase()] || 99;
      const weightB = statusWeight[b.status?.toUpperCase()] || 99;
      if (weightA !== weightB) {
        return weightA - weightB;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  async getSessionModules(sessionId: string) {
    const sessionModules = await this.prisma.sessionModule.findMany({
      where: { sessionId },
      include: {
        module: true
      }
    });

    const claims = await this.prisma.claimHistory.findMany({
      where: { sessionId, isActive: true },
      include: { claimedBy: true }
    });

    const executions = await this.prisma.sessionExecution.findMany({
      where: { sessionId },
      include: { testcase: true, status: true }
    });

    return sessionModules.map((sm: any) => {
      const { module } = sm;
      const claim = claims.find((c: any) => c.moduleId === module.id);
      
      const moduleExecutions = executions.filter(e => e.testcase.moduleId === module.id);
      const statusBreakdown: Record<string, number> = {};
      moduleExecutions.forEach(e => {
        const sName = e.status.name;
        statusBreakdown[sName] = (statusBreakdown[sName] || 0) + 1;
      });

      return {
        id: module.id,
        code: module.code,
        name: module.name,
        description: module.description,
        testcaseCount: moduleExecutions.length,
        claimedBy: claim ? claim.claimedBy.name : null,
        claimedById: claim ? claim.claimedById : null,
        isClaimed: !!claim,
        statusBreakdown
      };
    });
  }

  async updateSessionStatus(sessionId: string, status: string) {
    if (typeof status !== 'string' || !status.trim()) {
      throw new BadRequestException('Status sesi wajib diisi.');
    }

    const normalized = status.trim().toUpperCase();
    const isFinished = normalized === 'FINISHED';
    const isInProgress = normalized === 'ON PROGRESS';
    const nextStatus = isFinished ? 'Finished' : isInProgress ? 'On Progress' : status.trim();
    const data = isFinished
      ? { status: nextStatus, isOpen: false, closedAt: new Date() }
      : isInProgress
        ? { status: nextStatus, isOpen: true, closedAt: null }
        : { status: nextStatus };

    try {
      return await this.prisma.session.update({ where: { id: sessionId }, data });
    } catch (error) {
      if (!this.isMissingClosedAtColumn(error)) throw error;
      const rows = await this.prisma.$queryRaw<Record<string, unknown>[]>`
        UPDATE "sessions"
        SET "status" = ${nextStatus},
            "isOpen" = CASE WHEN ${isFinished} THEN false WHEN ${isInProgress} THEN true ELSE "isOpen" END,
            "updatedAt" = NOW()
        WHERE "id" = ${sessionId}
        RETURNING *
      `;
      if (!rows[0]) throw new NotFoundException('Session not found');
      return { ...rows[0], closedAt: null };
    }
  }

  async getMyTasks(userId: string) {
    const claims = await this.prisma.claimHistory.findMany({
      where: { 
        claimedById: userId, 
        isActive: true,
        session: {
          isOpen: true,
          status: {
            notIn: ['COMPLETED', 'Finished']
          }
        }
      },
      include: {
        session: {
          select: { id: true, name: true, status: true, environment: true }
        },
        module: {
          select: { id: true, code: true, name: true, description: true }
        }
      }
    });

    const sessionIds = [...new Set(claims.map(c => c.sessionId))];
    const executions = await this.prisma.sessionExecution.findMany({
      where: { 
        sessionId: { in: sessionIds } 
      },
      include: {
        status: true,
        testcase: { select: { moduleId: true } }
      }
    });

    const tasks = claims.map(claim => {
      const moduleExecs = executions.filter(e => 
        e.sessionId === claim.sessionId && 
        e.testcase.moduleId === claim.moduleId
      );

      const totalTestcases = moduleExecs.length;
      const executedTestcases = moduleExecs.filter(e => {
        const sName = e.status.name.toUpperCase();
        return sName !== 'TO DO' && sName !== 'UNTESTED';
      }).length;

      const statusBreakdown: Record<string, number> = {};
      moduleExecs.forEach(e => {
        const sName = e.status.name;
        statusBreakdown[sName] = (statusBreakdown[sName] || 0) + 1;
      });

      return {
        sessionId: claim.sessionId,
        sessionName: claim.session.name,
        sessionStatus: claim.session.status,
        environmentName: (claim.session as any).environment?.name || '',
        moduleId: claim.moduleId,
        moduleCode: claim.module.code,
        moduleName: claim.module.name,
        moduleDescription: claim.module.description,
        totalTestcases,
        executedTestcases,
        progress: totalTestcases > 0 ? Math.round((executedTestcases / totalTestcases) * 100) : 0,
        statusBreakdown
      };
    });

    const totalStatusBreakdown: Record<string, number> = {};
    tasks.forEach(t => {
      Object.keys(t.statusBreakdown).forEach(status => {
        totalStatusBreakdown[status] = (totalStatusBreakdown[status] || 0) + t.statusBreakdown[status];
      });
    });

    const totalModules = tasks.length;
    const totalAssignedTestcases = tasks.reduce((sum, t) => sum + t.totalTestcases, 0);
    const totalExecutedTestcases = tasks.reduce((sum, t) => sum + t.executedTestcases, 0);
    const totalRemainingTestcases = totalAssignedTestcases - totalExecutedTestcases;

    return {
      summary: {
        totalModules,
        totalAssignedTestcases,
        totalExecutedTestcases,
        totalRemainingTestcases,
        statusBreakdown: totalStatusBreakdown
      },
      tasks
    };
  }
}
