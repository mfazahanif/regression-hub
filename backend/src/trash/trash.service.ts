import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TrashService {
  async permanentlyDelete(type: string, ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };
    
    if (type === 'users') {
      return this.prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
    if (type === 'modules') {
      return this.prisma.$transaction(async (tx) => {
        await tx.sessionModule.deleteMany({ where: { moduleId: { in: ids } } });
        await tx.claimHistory.deleteMany({ where: { moduleId: { in: ids } } });
        const testcases = await tx.masterTestcase.findMany({ where: { moduleId: { in: ids } } });
        const tcIds = testcases.map((t: any) => t.id);
        if (tcIds.length > 0) {
           await tx.sessionExecution.deleteMany({ where: { testcaseId: { in: tcIds } } });
           await tx.masterTestcase.deleteMany({ where: { id: { in: tcIds } } });
        }
        return tx.module.deleteMany({ where: { id: { in: ids } } });
      });
    }
    if (type === 'sessions') {
      return this.prisma.$transaction(async (tx) => {
        await tx.sessionExecution.deleteMany({ where: { sessionId: { in: ids } } });
        await tx.claimHistory.deleteMany({ where: { sessionId: { in: ids } } });
        await tx.sessionModule.deleteMany({ where: { sessionId: { in: ids } } });
        return tx.session.deleteMany({ where: { id: { in: ids } } });
      });
    }
    if (type === 'testcases') {
      return this.prisma.$transaction(async (tx) => {
        await tx.sessionExecution.deleteMany({ where: { testcaseId: { in: ids } } });
        return tx.masterTestcase.deleteMany({ where: { id: { in: ids } } });
      });
    }
    throw new BadRequestException('Invalid type');
  }

  constructor(private prisma: PrismaService) {}

  async getTrash(type: string) {
    if (type === 'users') {
      return this.prisma.user.findMany({
        where: { isDeleted: true },
        include: { role: true },
        orderBy: { deletedAt: 'desc' }
      });
    }
    if (type === 'modules') {
      return this.prisma.module.findMany({
        where: { isDeleted: true },
        orderBy: { deletedAt: 'desc' }
      });
    }
    if (type === 'sessions') {
      return this.prisma.session.findMany({
        where: { isDeleted: true },
        select: {
          id: true,
          name: true,
          environmentId: true,
          status: true,
          isDeleted: true,
          deletedAt: true,
          environment: true,
        },
        orderBy: { deletedAt: 'desc' },
      });
    }
    if (type === 'testcases') {
      return this.prisma.masterTestcase.findMany({
        where: { isDeleted: true },
        include: { module: true },
        orderBy: { deletedAt: 'desc' }
      });
    }
    return [];
  }

  async restore(type: string, ids: string[]) {
    if (!ids || ids.length === 0) return { count: 0 };

    if (type === 'users') {
      return this.prisma.user.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted: false, deletedAt: null }
      });
    }
    if (type === 'modules') {
      return this.prisma.module.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted: false, deletedAt: null }
      });
    }
    if (type === 'sessions') {
      return this.prisma.session.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted: false, deletedAt: null }
      });
    }
    if (type === 'testcases') {
      // Prevent restoring testcase if its module is deleted
      const testcases = await this.prisma.masterTestcase.findMany({
        where: { id: { in: ids } },
        include: { module: true }
      });
      
      const missingModules = testcases.filter(tc => tc.module.isDeleted);
      if (missingModules.length > 0) {
        throw new BadRequestException(`Cannot restore testcases because the parent module is deleted for: ${missingModules.map(m => m.testcaseId).join(', ')}`);
      }

      return this.prisma.masterTestcase.updateMany({
        where: { id: { in: ids } },
        data: { isDeleted: false, deletedAt: null }
      });
    }

    return { count: 0 };
  }
}
