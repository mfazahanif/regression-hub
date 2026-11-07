import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as xlsx from 'xlsx';

@Injectable()
export class TestcasesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: any) {
    // 1. Get module to increment testcaseCount
    const module = await this.prisma.module.findUnique({ where: { id: data.moduleId } });
    if (!module) throw new NotFoundException('Module not found');

    const newCount = module.testcaseCount + 1;
    await this.prisma.module.update({
      where: { id: module.id },
      data: { testcaseCount: newCount }
    });

    const paddedCount = String(newCount).padStart(3, '0');
    const testcaseIdStr = `${module.code}-${paddedCount}`;

    // 2. Create testcase
    return this.prisma.masterTestcase.create({
      data: {
        testcaseId: testcaseIdStr,
        moduleId: data.moduleId,
        title: data.title,
        description: data.description,
        expectedResult: data.expectedResult,
        priority: data.priority || 'Sedang',
        severity: data.severity || 'Minor',
        createdById: userId,
        updatedById: userId,
        steps: {
          create: data.steps || []
        }
      }
    });
  }

  async findAll(filters: any) {
    const where: any = {};
    if (filters.moduleId) where.moduleId = filters.moduleId;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.isDeleted !== undefined) where.isDeleted = filters.isDeleted === 'true';

    return this.prisma.masterTestcase.findMany({
      where,
      orderBy: { sequence: 'asc' },
      include: {
        module: { select: { name: true, code: true } },
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
        steps: { orderBy: { sequence: 'asc' } }
      }
    });
  }

  async findOne(id: string) {
    const tc = await this.prisma.masterTestcase.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { sequence: 'asc' } },
        module: true,
      }
    });
    if (!tc) throw new NotFoundException('Testcase not found');
    return tc;
  }

  async update(userId: string, id: string, data: any) {
    const existing = await this.prisma.masterTestcase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testcase not found');

    // Notification if someone else updates
    if (existing.createdById && existing.createdById !== userId) {
      await this.prisma.testcaseNotification.create({
        data: {
          testcaseId: id,
          userId: existing.createdById,
          message: `Your testcase "${existing.testcaseId}" was updated.`,
        }
      });
    }

    // Delete old steps and recreate
    if (data.steps) {
      await this.prisma.testcaseStep.deleteMany({ where: { testcaseId: id } });
    }

    return this.prisma.masterTestcase.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        expectedResult: data.expectedResult,
        priority: data.priority,
        severity: data.severity,
        updatedById: userId,
        ...(data.steps ? { steps: { create: data.steps } } : {})
      }
    });
  }

  async remove(userId: string, userRole: string, id: string) {
    const existing = await this.prisma.masterTestcase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Testcase not found');

    if (userRole === 'Super Admin' || userRole === 'Tech Lead' || userRole === 'BA') {
      // Hard delete
      return this.prisma.masterTestcase.delete({ where: { id } });
    } else {
      // Soft delete
      return this.prisma.masterTestcase.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() }
      });
    }
  }

  async revive(userId: string, id: string) {
    return this.prisma.masterTestcase.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null }
    });
  }

  async getNotifications(userId: string) {
    return this.prisma.testcaseNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async markNotificationRead(id: string) {
    return this.prisma.testcaseNotification.update({
      where: { id },
      data: { isRead: true }
    });
  }

  async importExcel(userId: string, fileBuffer: Buffer) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = xlsx.utils.sheet_to_json(sheet);

    const groupedData = [];
    let currentTC: any = null;
    const errors: { row: number, message: string }[] = [];

    let rowNum = 2; // header is row 1
    for (const row of data) {
      const tcIdRaw = row['TC ID'] || row['ID'];
      const moduleCodeRaw = row['Modul ID'] || row['Modul ID '];
      const titleRaw = row['Title'] || row['Nama test case'];
      const expectedResultRaw = row['Expected Result'];
      
      const hasMainInfo = tcIdRaw || moduleCodeRaw || titleRaw || expectedResultRaw;

      if (hasMainInfo) {
         if (currentTC) groupedData.push(currentTC);

         currentTC = {
            rowNum,
            moduleCode: moduleCodeRaw,
            title: titleRaw,
            desc: row['Description'] || row['Deskripsi'] || '',
            severity: row['Severity'] || 'Minor',
            priority: row['Priority'] || row['Prioritas'] || 'Sedang',
            expectedResult: expectedResultRaw,
            tcIdFromExcel: tcIdRaw,
            steps: []
         };

         if (!currentTC.tcIdFromExcel) errors.push({ row: rowNum, message: "TC ID wajib diisi." });
         if (!currentTC.moduleCode) errors.push({ row: rowNum, message: "Modul ID wajib diisi." });
         if (!currentTC.title) errors.push({ row: rowNum, message: "Title wajib diisi." });
         if (!currentTC.expectedResult) errors.push({ row: rowNum, message: "Expected Result wajib diisi." });

         if (currentTC.tcIdFromExcel) {
           const existing = await this.prisma.masterTestcase.findFirst({
             where: { testcaseId: String(currentTC.tcIdFromExcel) }
           });
           if (existing) {
             errors.push({ row: rowNum, message: `TC ID '${currentTC.tcIdFromExcel}' duplikat / sudah ada di database.` });
           }
         }
      }

      if (currentTC) {
         const action = String(row['Action'] || '').trim();
         const stepExpected = String(row['Step Expected Result'] || '').trim();
         
         if (action || stepExpected) {
            if (!action) errors.push({ row: rowNum, message: "Action wajib diisi pada step." });
            if (!stepExpected) errors.push({ row: rowNum, message: "Step Expected Result wajib diisi pada step." });
            
            if (action && stepExpected) {
              currentTC.steps.push({
                 sequence: currentTC.steps.length + 1,
                 action: action,
                 expectedResult: stepExpected
              });
            }
         }
      } else {
         if (row['Action'] || row['Step Expected Result']) {
            errors.push({ row: rowNum, message: "Ditemukan step tanpa informasi Testcase induk. Pastikan TC ID/Modul ID diisi." });
         }
      }
      rowNum++;
    }
    if (currentTC) groupedData.push(currentTC);

    // Validate modules and steps length
    for (const tcData of groupedData) {
      if (tcData.steps.length === 0) {
        errors.push({ row: tcData.rowNum, message: `Testcase '${tcData.title || tcData.tcIdFromExcel}' tidak memiliki step satupun. Action dan Step Expected Result wajib diisi.` });
      }

      if (tcData.moduleCode) {
        const module = await this.prisma.module.findFirst({
          where: { OR: [{ id: String(tcData.moduleCode) }, { code: String(tcData.moduleCode) }] }
        });

        if (!module) {
          errors.push({ row: tcData.rowNum, message: `Modul '${tcData.moduleCode}' tidak ada pada sistem, tolong perbaiki atau tambah modul '${tcData.moduleCode}' pada Menu Modules.` });
        } else {
          tcData.moduleId = module.id;
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Validation Failed', errors });
    }

    let importedCount = 0;
    for (const tcData of groupedData) {
      await this.create(userId, {
        moduleId: tcData.moduleId,
        title: tcData.title,
        description: tcData.desc,
        severity: tcData.severity,
        priority: tcData.priority,
        expectedResult: tcData.expectedResult,
        steps: tcData.steps
      });

      importedCount++;
    }
    
    return { success: true, importedCount };
  }

  async exportExcel(moduleIds: string[]) {
    const modules = await this.prisma.module.findMany({
      where: { id: { in: moduleIds } }
    });

    const wb = xlsx.utils.book_new();
    
    for (const mod of modules) {
      const testcases = await this.prisma.masterTestcase.findMany({
        where: { moduleId: mod.id, isDeleted: false },
        include: { steps: { orderBy: { sequence: 'asc' } } }
      });

      const rows: any[] = [];
      
      testcases.forEach(tc => {
        let desc = tc.description || '';

        if (tc.steps && tc.steps.length > 0) {
          tc.steps.forEach((step, index) => {
            if (index === 0) {
              rows.push({
                'TC ID': tc.testcaseId,
                'Modul ID': mod.code,
                'Title': tc.title,
                'Description': desc,
                'Expected Result': tc.expectedResult || '',
                'Priority': tc.priority,
                'Severity': tc.severity,
                'Action': step.action,
                'Step Expected Result': step.expectedResult
              });
            } else {
              rows.push({
                'TC ID': '',
                'Modul ID': '',
                'Title': '',
                'Description': '',
                'Expected Result': '',
                'Priority': '',
                'Severity': '',
                'Action': step.action,
                'Step Expected Result': step.expectedResult
              });
            }
          });
        } else {
          rows.push({
            'TC ID': tc.testcaseId,
            'Modul ID': mod.code,
            'Title': tc.title,
            'Description': desc,
            'Expected Result': tc.expectedResult || '',
            'Priority': tc.priority,
            'Severity': tc.severity,
            'Action': '',
            'Step Expected Result': ''
          });
        }
      });

      // if module has no testcases, add a dummy row so the headers exist
      if (rows.length === 0) {
        rows.push({
          'TC ID': '', 'Modul ID': mod.code, 'Title': '', 'Description': '', 'Expected Result': '', 'Priority': '', 'Severity': '', 'Action': '', 'Step Expected Result': ''
        });
      }

      const ws = xlsx.utils.json_to_sheet(rows, { header: ['TC ID', 'Modul ID', 'Title', 'Description', 'Expected Result', 'Priority', 'Severity', 'Action', 'Step Expected Result'] });
      
      // Ensure specific column widths for better UX
      ws['!cols'] = [
        { wch: 15 }, // TC ID
        { wch: 15 }, // Modul ID
        { wch: 30 }, // Title
        { wch: 30 }, // Description
        { wch: 30 }, // Expected Result
        { wch: 10 }, // Priority
        { wch: 10 }, // Severity
        { wch: 50 }, // Action
        { wch: 50 }, // Step Expected Result
      ];

      xlsx.utils.book_append_sheet(wb, ws, mod.name.substring(0, 31));
    }

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
