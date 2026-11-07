import { Controller, Get, Post, Patch, Body, Param, Query, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ExecutionService } from './execution.service.js';
import { GetTestcasesQueryDto, UpdateExecutionStatusDto } from './execution.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('sessions/:sessionId')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Get('testcases')
  async getExecutions(
    @Param('sessionId') sessionId: string,
    @Query() query: GetTestcasesQueryDto
  ) {
    return await this.executionService.getSessionExecutions(sessionId, query);
  }

  @Post('modules/:moduleId/claim')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async claimModule(
    @Param('sessionId') sessionId: string,
    @Param('moduleId') moduleId: string,
    @Req() request: Request & { user: { id: string } },
  ) {
    const claim = await this.executionService.claimModule(sessionId, moduleId, request.user.id);
    return { message: 'Module berhasil diklaim', data: claim };
  }

  @Patch('testcases/:testcaseId/status')
  async updateStatus(
    @Param('sessionId') sessionId: string,
    @Param('testcaseId') testcaseId: string,
    @Body() dto: UpdateExecutionStatusDto,
    @Body('userId') userId: string 
  ) {
    const result = await this.executionService.updateExecutionStatus(sessionId, testcaseId, userId, dto);
    return { message: 'Status eksekusi berhasil diupdate', data: result };
  }

  @Patch('testcases/:testcaseId/steps/:stepId/status')
  async updateStepStatus(
    @Param('sessionId') sessionId: string,
    @Param('testcaseId') testcaseId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateExecutionStatusDto,
    @Body('userId') userId: string 
  ) {
    const result = await this.executionService.updateStepExecutionStatus(sessionId, testcaseId, stepId, userId, dto);
    return { message: 'Status step berhasil diupdate', data: result };
  }
}
