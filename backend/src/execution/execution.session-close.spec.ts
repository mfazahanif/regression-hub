import { ExecutionService } from './execution.service.js';

describe('ExecutionService automatic session closure', () => {
  it('records a closure timestamp when all executions are complete', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'session-1' });
    const prisma = {
      sessionExecution: { findMany: vi.fn().mockResolvedValue([{ status: { name: 'PASSED' } }]) },
      session: { update },
    };
    const service = new ExecutionService(prisma as any);

    await (service as any).checkAndFinishSession('session-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { status: 'Finished', isOpen: false, closedAt: expect.any(Date) },
    });
  });
});
