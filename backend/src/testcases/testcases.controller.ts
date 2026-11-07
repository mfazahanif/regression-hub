import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Put, Query, Patch, UseInterceptors, UploadedFile, BadRequestException, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TestcasesService } from './testcases.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('testcases')
@UseGuards(JwtAuthGuard)
export class TestcasesController {
  constructor(private readonly testcasesService: TestcasesService) {}

  @Post()
  async create(@Request() req: any, @Body() createTestcaseDto: any) {
    return { data: await this.testcasesService.create(req.user.id, createTestcaseDto) };
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@Request() req: any, @UploadedFile() file: any) {
    if (!file) throw new BadRequestException('File is required');
    return { data: await this.testcasesService.importExcel(req.user.id, file.buffer) };
  }

  @Post('export')
  async exportExcel(@Body('moduleIds') moduleIds: string[], @Res() res: Response) {
    if (!moduleIds || !moduleIds.length) {
      throw new BadRequestException('moduleIds must be provided');
    }
    const buffer = await this.testcasesService.exportExcel(moduleIds);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Testcases_Export.xlsx"');
    res.send(buffer);
  }

  @Get()
  async findAll(@Query() query: any) {
    return { data: await this.testcasesService.findAll(query) };
  }

  @Get('notifications')
  async getNotifications(@Request() req: any) {
    return { data: await this.testcasesService.getNotifications(req.user.id) };
  }

  @Patch('notifications/:id/read')
  async markNotificationRead(@Param('id') id: string) {
    return { data: await this.testcasesService.markNotificationRead(id) };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.testcasesService.findOne(id) };
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() updateTestcaseDto: any) {
    return { data: await this.testcasesService.update(req.user.id, id, updateTestcaseDto) };
  }

  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return { data: await this.testcasesService.remove(req.user.id, req.user.roleName, id) };
  }

  @Post(':id/revive')
  async revive(@Request() req: any, @Param('id') id: string) {
    return { data: await this.testcasesService.revive(req.user.id, id) };
  }
}
