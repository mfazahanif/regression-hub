import { SessionsService } from './sessions.service.js';

describe('SessionsService session closure', () => {
  it('records closure separately from the scheduled end date and clears it on reopen', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'session-1' });
    const service = new SessionsService({ session: { update } } as any);

    await service.updateSessionStatus('session-1', 'Finished');
    expect(update).toHaveBeenLastCalledWith({
      where: { id: 'session-1' },
      data: { status: 'Finished', isOpen: false, closedAt: expect.any(Date) },
    });

    await service.updateSessionStatus('session-1', 'On Progress');
    expect(update).toHaveBeenLastCalledWith({
      where: { id: 'session-1' },
      data: { status: 'On Progress', isOpen: true, closedAt: null },
    });
  });

  it('lists sessions when the database has not applied the closedAt migration yet', async () => {
    const missingColumn = Object.assign(new Error('The column `sessions.closedAt` does not exist.'), {
      code: 'P2022',
      meta: { column: 'sessions.closedAt' },
    });
    const oldSession = {
      id: 'session-1',
      name: 'Regression',
      environmentId: 1,
      isOpen: false,
      status: 'Finished',
      startDate: new Date('2026-11-01T00:00:00.000Z'),
      endDate: new Date('2026-11-02T00:00:00.000Z'),
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
      updatedAt: new Date('2026-11-02T00:00:00.000Z'),
      isDeleted: false,
      deletedAt: null,
      environment: { id: 1, name: 'Staging' },
      _count: { sessionModules: 1, executions: 3 },
    };
    const findMany = vi.fn().mockRejectedValueOnce(missingColumn).mockResolvedValueOnce([oldSession]);
    const service = new SessionsService({ session: { findMany } } as any);

    const sessions = await service.getSessions();

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(sessions).toEqual([{ ...oldSession, closedAt: null }]);
  });
});
