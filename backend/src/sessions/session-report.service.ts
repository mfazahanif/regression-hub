import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service.js';

type ReportFormat = 'pdf' | 'xlsx';
type ReportRow = {
  moduleCode: string;
  moduleName: string;
  testcaseId: string;
  testcaseTitle: string;
  status: string;
  passed: boolean;
};

const TIME_ZONE = 'Asia/Jakarta';
const PASSED_STATUSES = new Set(['PASSED', 'PASSED WITH NOTES']);

function dateTime(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: TIME_ZONE,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(value)
    : 'Not recorded';
}

function dateOnly(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, dateStyle: 'medium' }).format(value)
    : 'Not recorded';
}

function closedTime(value: Date | null) {
  return value ? `${dateTime(value)} WIB` : 'Not recorded';
}

function passRate(rows: ReportRow[]) {
  const eligible = rows.filter(row => row.status.toUpperCase() !== 'DROPPED');
  const passed = eligible.filter(row => row.passed).length;
  return {
    total: eligible.length,
    passed,
    rate: eligible.length ? Math.round((passed / eligible.length) * 100) : 0,
  };
}

@Injectable()
export class SessionReportService {
  private readonly logger = new Logger(SessionReportService.name);

  constructor(private prisma: PrismaService) {}

  async createReport(sessionId: string, format: ReportFormat) {
    let session: any;
    try {
      session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          environment: true,
          sessionModules: { include: { module: true } },
          executions: {
            include: {
              status: true,
              testcase: { include: { module: true } },
            },
          },
        },
      });
    } catch (error) {
      const prismaError = error as { code?: string; meta?: { column?: string }; message?: string };
      const missingClosedAt = prismaError.code === 'P2022'
        && (prismaError.meta?.column?.includes('closedAt') || prismaError.message?.includes('closedAt'));

      if (!missingClosedAt) throw error;

      this.logger.warn('Database is missing sessions.closedAt; using endDate as the legacy close time. Apply pending Prisma migrations.');
      const legacySession = await this.prisma.session.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          environment: true,
          sessionModules: { select: { module: true } },
          executions: {
            select: {
              status: true,
              testcase: {
                select: {
                  sequence: true,
                  title: true,
                  module: true,
                },
              },
            },
          },
        },
      });
      session = legacySession && {
        ...legacySession,
        closedAt: legacySession.status === 'Finished' ? legacySession.endDate : null,
      };
    }

    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'Finished') {
      throw new BadRequestException('Report hanya tersedia untuk session Finished.');
    }

    const rows: ReportRow[] = (session.executions as any[])
      .map((execution: any) => ({
        moduleCode: execution.testcase.module.code,
        moduleName: execution.testcase.module.name,
        testcaseId: `${execution.testcase.module.code}-${String(execution.testcase.sequence).padStart(3, '0')}`,
        testcaseTitle: execution.testcase.title,
        status: execution.status.name,
        passed: PASSED_STATUSES.has(execution.status.name.toUpperCase()),
      }))
      .sort((a: ReportRow, b: ReportRow) =>
        a.moduleName.localeCompare(b.moduleName) || a.testcaseId.localeCompare(b.testcaseId),
      );

    const modules = (session.sessionModules as { module: { code: string; name: string } }[])
      .map(({ module }) => {
        const moduleRows = rows.filter(row => row.moduleCode === module.code);
        return {
          code: module.code,
          name: module.name,
          rows: moduleRows,
          summary: passRate(moduleRows),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const summary = passRate(rows);
    const filenameBase = session.name
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'session';

    if (format === 'pdf') {
      return {
        filename: `${filenameBase}_report.pdf`,
        contentType: 'application/pdf',
        buffer: await this.createPdf(session, modules, rows, summary),
      };
    }

    if (format === 'xlsx') {
      return {
        filename: `${filenameBase}_report.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer: this.createWorkbook(session, modules, rows, summary),
      };
    }

    throw new BadRequestException('Format report harus pdf atau xlsx.');
  }

  private createWorkbook(
    session: any,
    modules: { code: string; name: string; summary: ReturnType<typeof passRate> }[],
    rows: ReportRow[],
    summary: ReturnType<typeof passRate>,
  ) {
    const workbook = XLSX.utils.book_new();
    const summaryRows: (string | number)[][] = [
      ['Session Report'],
      ['Session Name', session.name],
      ['Environment', session.environment.name],
      ['Start Date', dateOnly(session.startDate)],
      ['End Date', dateOnly(session.endDate)],
      ['Closed At', closedTime(session.closedAt)],
      [],
      ['Overall Summary'],
      ['Testcases counted', summary.total],
      ['Passed', summary.passed],
      ['Pass Rate', `${summary.rate}%`],
      ['Pass rate counts PASSED and PASSED WITH NOTES; DROPPED is excluded.'],
      [],
      ['Module Code', 'Module', 'Testcases counted', 'Passed', 'Pass Rate'],
      ...modules.map(module => [
        module.code,
        module.name,
        module.summary.total,
        module.summary.passed,
        `${module.summary.rate}%`,
      ]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 20 }, { wch: 42 }, { wch: 22 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const testcaseRows = [
      ['Module Code', 'Module', 'Testcase ID', 'Testcase', 'Status', 'Passed'],
      ...rows.map(row => [
        row.moduleCode,
        row.moduleName,
        row.testcaseId,
        row.testcaseTitle,
        row.status,
        row.passed ? 'Yes' : 'No',
      ]),
    ];
    const testcaseSheet = XLSX.utils.aoa_to_sheet(testcaseRows);
    testcaseSheet['!cols'] = [{ wch: 18 }, { wch: 34 }, { wch: 18 }, { wch: 64 }, { wch: 24 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, testcaseSheet, 'Testcases');
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  }

  private createPdf(
    session: any,
    modules: { code: string; name: string; rows: ReportRow[]; summary: ReturnType<typeof passRate> }[],
    rows: ReportRow[],
    summary: ReturnType<typeof passRate>,
  ) {
    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      const pageWidth = 842;
      const margin = 36;
      const bottom = 560;
      const columns = [
        { title: 'Module', width: 140 },
        { title: 'Testcase ID', width: 90 },
        { title: 'Testcase', width: 350 },
        { title: 'Status', width: 140 },
        { title: 'Passed', width: 50 },
      ];
      let y = 36;

      const addPage = () => {
        document.addPage({ size: 'A4', layout: 'landscape', margin });
        y = 36;
        document.font('Helvetica-Bold').fontSize(10).fillColor('#24415d')
          .text(session.name, margin, y, { width: pageWidth - margin * 2 });
        y += 22;
      };

      const drawTableHeader = () => {
        const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
        document.rect(margin, y, totalWidth, 24).fill('#e9f1f8');
        let x = margin + 6;
        document.font('Helvetica-Bold').fontSize(9).fillColor('#24415d');
        columns.forEach(column => {
          document.text(column.title, x, y + 7, { width: column.width - 10, height: 14 });
          x += column.width;
        });
        y += 28;
      };

      const drawRows = (tableRows: ReportRow[], repeatTitle: string) => {
        if (tableRows.length === 0) {
          if (y + 24 > bottom) addPage();
          document.font('Helvetica-Bold').fontSize(13).fillColor('#18334f').text(repeatTitle, margin, y);
          y += 20;
          document.font('Helvetica').fontSize(10).fillColor('#60758a').text('No testcases are attached to this session.', margin, y);
          return;
        }
        if (y + 30 > bottom) addPage();
        document.font('Helvetica-Bold').fontSize(13).fillColor('#18334f').text(repeatTitle, margin, y);
        y += 22;
        drawTableHeader();

        tableRows.forEach((row, index) => {
          const values = [row.moduleName, row.testcaseId, row.testcaseTitle, row.status, row.passed ? 'Yes' : 'No'];
          document.font('Helvetica').fontSize(9);
          const heights = values.map((value, columnIndex) =>
            document.heightOfString(value, { width: columns[columnIndex].width - 10 }),
          );
          const height = Math.max(22, ...heights) + 8;
          if (y + height > bottom) {
            addPage();
            document.font('Helvetica-Bold').fontSize(11).fillColor('#18334f').text(repeatTitle, margin, y);
            y += 20;
            drawTableHeader();
          }
          if (index % 2 === 0) document.rect(margin, y - 2, 770, height).fill('#f5f8fb');
          let x = margin + 6;
          values.forEach((value, columnIndex) => {
            const isPassed = columnIndex === 4 && row.passed;
            document.font(columnIndex === 1 || columnIndex === 4 ? 'Helvetica-Bold' : 'Helvetica')
              .fontSize(9)
              .fillColor(isPassed ? '#147d57' : '#34495e')
              .text(value, x, y + 2, { width: columns[columnIndex].width - 10, height: height - 4 });
            x += columns[columnIndex].width;
          });
          y += height;
        });
      };

      document.font('Helvetica-Bold').fontSize(22).fillColor('#18334f').text('Session Execution Report', margin, y);
      y += 34;
      document.font('Helvetica').fontSize(10).fillColor('#34495e');
      [
        `Session: ${session.name}`,
        `Environment: ${session.environment.name}`,
        `Start Date: ${dateOnly(session.startDate)}`,
        `End Date: ${dateOnly(session.endDate)}`,
        `Closed At: ${closedTime(session.closedAt)}`,
      ].forEach(line => {
        document.text(line, margin, y);
        y += 15;
      });
      y += 8;
      document.font('Helvetica-Bold').fontSize(13).fillColor('#18334f').text('Overall Summary', margin, y);
      y += 20;
      document.font('Helvetica').fontSize(10).fillColor('#34495e')
        .text(`Testcases counted: ${summary.total}   Passed: ${summary.passed}   Pass Rate: ${summary.rate}%`, margin, y);
      y += 16;
      document.fontSize(8).fillColor('#60758a')
        .text('Pass rate counts PASSED and PASSED WITH NOTES; DROPPED is excluded.', margin, y);
      y += 20;

      if (y + (modules.length + 2) * 20 > bottom) addPage();
      document.font('Helvetica-Bold').fontSize(13).fillColor('#18334f').text('Summary by Module', margin, y);
      y += 21;
      const drawModuleHeader = () => {
        document.font('Helvetica-Bold').fontSize(9).fillColor('#24415d')
          .text('Module', margin, y, { width: 280 })
          .text('Testcases', margin + 290, y, { width: 90 })
          .text('Passed', margin + 390, y, { width: 90 })
          .text('Pass Rate', margin + 490, y, { width: 100 });
        y += 15;
      };
      drawModuleHeader();
      modules.forEach(module => {
        document.font('Helvetica').fontSize(9);
        const moduleLabel = `${module.code}  ${module.name}`;
        const rowHeight = Math.max(17, document.heightOfString(moduleLabel, { width: 280 }) + 4);
        if (y + rowHeight > bottom) {
          addPage();
          document.font('Helvetica-Bold').fontSize(13).fillColor('#18334f').text('Summary by Module', margin, y);
          y += 21;
          drawModuleHeader();
        }
        document.font('Helvetica').fontSize(9).fillColor('#34495e')
          .text(moduleLabel, margin, y, { width: 280, height: rowHeight })
          .text(String(module.summary.total), margin + 290, y, { width: 90 })
          .text(String(module.summary.passed), margin + 390, y, { width: 90 })
          .text(`${module.summary.rate}%`, margin + 490, y, { width: 100 });
        y += rowHeight;
      });
      y += 12;
      drawRows(rows, 'Testcases');
      document.end();
    });
  }
}
