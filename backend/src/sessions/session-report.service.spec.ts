import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { SessionReportService } from './session-report.service.js';

describe('SessionReportService', () => {
  const session = {
    id: 'session-1',
    name: 'Release Regression',
    status: 'Finished',
    startDate: new Date('2026-11-01T00:00:00.000Z'),
    endDate: null,
    closedAt: new Date('2026-11-02T03:00:00.000Z'),
    environment: { name: 'Staging' },
    sessionModules: [
      { module: { code: 'AUTH', name: 'Authentication' } },
      { module: { code: 'EMPTY', name: 'No Testcases' } },
    ],
    executions: [
      { status: { name: 'PASSED' }, testcase: { sequence: 1, title: 'Valid login', module: { code: 'AUTH', name: 'Authentication' } } },
      { status: { name: 'PASSED WITH NOTES' }, testcase: { sequence: 2, title: 'Remember me', module: { code: 'AUTH', name: 'Authentication' } } },
      { status: { name: 'DROPPED' }, testcase: { sequence: 3, title: 'Legacy login', module: { code: 'AUTH', name: 'Authentication' } } },
      { status: { name: 'FAILED' }, testcase: { sequence: 4, title: 'Locked account', module: { code: 'AUTH', name: 'Authentication' } } },
    ],
  };

  const makeService = (result: typeof session | null) => {
    const prisma = { session: { findUnique: vi.fn().mockResolvedValue(result) } };
    return new SessionReportService(prisma as any);
  };

  it('generates an Excel workbook with summary and every testcase status', async () => {
    const report = await makeService(session).createReport('session-1', 'xlsx');
    const workbook = XLSX.read(report.buffer, { type: 'buffer' });
    const summary = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets.Summary, { header: 1 });
    const testcases = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets.Testcases, { header: 1 });

    expect(workbook.SheetNames).toEqual(['Summary', 'Testcases']);
    expect(summary[3][1]).toBe('Nov 1, 2026');
    expect(summary[5][1]).toContain('WIB');
    expect(summary[10][1]).toBe('67%');
    expect(summary[14]).toEqual(['AUTH', 'Authentication', 3, 2, '67%']);
    expect(testcases).toHaveLength(5);
    expect(testcases[2][4]).toBe('PASSED WITH NOTES');
    expect(testcases[2][5]).toBe('Yes');
    expect(report.filename).toBe('Release_Regression_report.xlsx');
  });

  it('generates a PDF attachment', async () => {
    const report = await makeService(session).createReport('session-1', 'pdf');

    expect(report.contentType).toBe('application/pdf');
    expect(report.buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('generates both formats when the database has not applied the closedAt migration', async () => {
    const missingColumn = Object.assign(new Error('The column `sessions.closedAt` does not exist.'), {
      code: 'P2022',
      meta: { column: 'sessions.closedAt' },
    });
    const legacySession = { ...session, endDate: new Date('2026-11-02T03:00:00.000Z') };

    for (const format of ['xlsx', 'pdf'] as const) {
      const findUnique = vi.fn().mockRejectedValueOnce(missingColumn).mockResolvedValueOnce(legacySession);
      const service = new SessionReportService({ session: { findUnique } } as any);
      const report = await service.createReport('session-1', format);

      expect(findUnique).toHaveBeenCalledTimes(2);
      expect(report.buffer.length).toBeGreaterThan(0);
      if (format === 'pdf') expect(report.buffer.subarray(0, 4).toString()).toBe('%PDF');
    }
  });

  it('rejects reports for sessions that are not finished', async () => {
    const service = makeService({ ...session, status: 'On Progress' });

    await expect(service.createReport('session-1', 'pdf')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found when the session does not exist', async () => {
    await expect(makeService(null).createReport('missing', 'pdf')).rejects.toBeInstanceOf(NotFoundException);
  });
});
