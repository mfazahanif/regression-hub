import { BadRequestException, Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SessionsService } from './sessions.service.js';
import { SessionReportService } from './session-report.service.js';
import { CreateSessionDto, UpdateSessionDto } from './sessions.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly sessionReportService: SessionReportService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createSession(@Body() dto: CreateSessionDto) {
    const data = await this.sessionsService.createSession(dto);
    return { message: 'Session created successfully', data };
  }


  @UseGuards(JwtAuthGuard)
  @Post(':id/clone')
  async cloneSession(
    @Param('id') id: string
  ) {
    const data = await this.sessionsService.cloneSession(id);
    return { message: 'Session cloned successfully', data };
  }

  @Get()
  async getSessions() {
    const data = await this.sessionsService.getSessions();
    return { data };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':sessionId/report')
  async downloadReport(
    @Param('sessionId') sessionId: string,
    @Query('format') format: string,
    @Res() response: Response,
  ) {
    if (format !== 'pdf' && format !== 'xlsx') {
      throw new BadRequestException('Format report harus pdf atau xlsx.');
    }

    const report = await this.sessionReportService.createReport(sessionId, format);
    response.setHeader('Content-Type', report.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    response.setHeader('Content-Length', report.buffer.length);
    response.send(report.buffer);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-tasks')
  async getMyTasks(@Request() req: any) {
    const data = await this.sessionsService.getMyTasks(req.user.id);
    return { data };
  }

  @Get(':sessionId/modules')
  async getSessionModules(@Param('sessionId') sessionId: string) {
    const data = await this.sessionsService.getSessionModules(sessionId);
    return { data };
  }

  @Patch(':sessionId/status')
  async updateSessionStatus(
    @Param('sessionId') sessionId: string,
    @Body('status') status: string
  ) {
    const data = await this.sessionsService.updateSessionStatus(sessionId, status);
    return { message: 'Session status updated', data };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto
  ) {
    const data = await this.sessionsService.updateSession(id, dto);
    return { message: 'Session updated successfully', data };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteSession(
    @Param('id') id: string
  ) {
    const data = await this.sessionsService.deleteSession(id);
    return { message: 'Session deleted successfully', data };
  }
}
