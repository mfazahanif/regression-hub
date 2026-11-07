import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getGlobalAnalytics(sessionId?: string) {
    const whereClause = sessionId ? { sessionId } : { session: { isOpen: true } };

    const statusCounts = await this.prisma.sessionExecution.groupBy({
      by: ['statusId'],
      where: whereClause,
      _count: { statusId: true },
    });

    const statuses = await this.prisma.status.findMany();
    let totalExecutions = 0;
    
    const summary = statuses.reduce((acc: Record<string, number>, status: any) => {
      const count = statusCounts.find((sc: any) => sc.statusId === status.id)?._count.statusId || 0;
      acc[status.name] = count;
      totalExecutions += count;
      return acc;
    }, {} as Record<string, number>);

    // Fetch user module assignments from claim history
    // Since claimHistory tracks who claimed what module in what session
    const claimHistories = await this.prisma.claimHistory.findMany({
      where: sessionId ? { sessionId, isActive: true } : { isActive: true, session: { isOpen: true } },
      include: {
        claimedBy: { select: { id: true, name: true, email: true } },
        module: { 
          select: { 
            id: true, 
            name: true,
            _count: { select: { testcases: { where: { isDeleted: false } } } }
          } 
        },
        session: { select: { id: true, name: true } }
      }
    });

    // Fetch executions to get status breakdown per module
    const sessionExecutions = await this.prisma.sessionExecution.findMany({
      where: whereClause,
      include: {
        status: { select: { name: true } },
        testcase: { select: { moduleId: true } }
      }
    });

    const moduleStats = new Map();
    sessionExecutions.forEach(se => {
      const key = `${se.sessionId}_${se.testcase.moduleId}`;
      if (!moduleStats.has(key)) moduleStats.set(key, {});
      const stats = moduleStats.get(key);
      const sName = se.status.name;
      stats[sName] = (stats[sName] || 0) + 1;
    });

    // Group by user
    const userAssignmentsMap = new Map();
    claimHistories.forEach(ch => {
      const userId = ch.claimedBy.id;
      if (!userAssignmentsMap.has(userId)) {
        userAssignmentsMap.set(userId, {
          user: ch.claimedBy,
          modules: []
        });
      }
      userAssignmentsMap.get(userId).modules.push({
        module: ch.module,
        session: ch.session,
        stats: moduleStats.get(`${ch.sessionId}_${ch.moduleId}`) || {}
      });
    });

    const userAssignments = Array.from(userAssignmentsMap.values());

    return {
      summary: { ...summary, total: totalExecutions },
      userAssignments
    };
  }

  async getSessionAnalytics(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, name: true, status: true, isOpen: true, startDate: true }
    });

    const statusCounts = await this.prisma.sessionExecution.groupBy({
      by: ['statusId'],
      where: { sessionId },
      _count: { statusId: true },
    });

    const statuses = await this.prisma.status.findMany();
    let totalExecutions = 0;
    
    const summary = statuses.reduce((acc: Record<string, number>, status: any) => {
      const count = statusCounts.find((sc: any) => sc.statusId === status.id)?._count.statusId || 0;
      acc[status.name] = count;
      totalExecutions += count;
      return acc;
    }, {} as Record<string, number>);

    const topFailedModules = await this.prisma.$queryRaw`
      SELECT 
        m.name as "moduleName",
        COUNT(se.id)::int as "totalTestcases",
        SUM(CASE WHEN s.name = 'FAILED' THEN 1 ELSE 0 END)::int as "failedCount",
        ROUND((SUM(CASE WHEN s.name = 'FAILED' THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(se.id), 0)::decimal) * 100, 2)::float as "failedRate"
      FROM session_executions se
      JOIN master_testcases mt ON se."testcaseId" = mt.id
      JOIN modules m ON mt."moduleId" = m.id
      JOIN statuses s ON se."statusId" = s.id
      WHERE se."sessionId" = ${sessionId}
      GROUP BY mt."moduleId", m.name
      HAVING SUM(CASE WHEN s.name = 'FAILED' THEN 1 ELSE 0 END) > 0
      ORDER BY "failedRate" DESC
      LIMIT 5;
    `;

    return {
      session,
      summary: { ...summary, total: totalExecutions },
      topFailedModules,
    };
  }
}
