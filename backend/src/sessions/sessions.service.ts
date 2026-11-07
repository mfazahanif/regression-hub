import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSessionDto } from './sessions.dto.js';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async deleteSession(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async createSession(dto: CreateSessionDto) {
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

    return this.prisma.$transaction(async (tx: any) => {
      const session = await tx.session.create({
        data: {
          name: dto.name,
          environmentId: Number(dto.environmentId),
          status: 'TO DO',
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

      return session;
    });
  }

  
  
  async cloneSession(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        sessionModules: true,
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

    return this.prisma.$transaction(async (tx: any) => {
      const clonedSession = await tx.session.create({
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

      return clonedSession;
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

    return this.prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (dto.name) updateData.name = dto.name;
      if (dto.environmentId) updateData.environmentId = Number(dto.environmentId);
      if (dto.startDate) updateData.startDate = new Date(dto.startDate);
      if (dto.endDate !== undefined) updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;

      const session = await tx.session.update({
        where: { id },
        data: updateData
      });

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

      return session;
    });
  }

  async getSessions() {
    const sessions = await this.prisma.session.findMany({
      where: { isDeleted: false },
      include: {
        environment: true,
        _count: {
          select: { sessionModules: true, executions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

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
    if (status.toUpperCase() === 'FINISHED') {
      return this.prisma.session.update({
        where: { id: sessionId },
        data: { 
          status: 'Finished', 
          isOpen: false,
          endDate: new Date()
        }
      });
    }

    if (status.toUpperCase() === 'ON PROGRESS') {
      return this.prisma.session.update({
        where: { id: sessionId },
        data: { 
          status: 'On Progress',
          isOpen: true,
          endDate: null
        }
      });
    }

    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status }
    });
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
