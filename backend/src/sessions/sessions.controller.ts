import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { SessionsService } from './sessions.service.js';
import { CreateSessionDto } from './sessions.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createSession(@Request() req: any, @Body() dto: CreateSessionDto) {
    if (req.user?.roleName === 'QA Member') {
      throw new ForbiddenException('Only Super Admin, Tech Lead, or BA can create sessions');
    }
    const data = await this.sessionsService.createSession(dto);
    return { message: 'Session created successfully', data };
  }


  @UseGuards(JwtAuthGuard)
  @Post(':id/clone')
  async cloneSession(
    @Request() req: any,
    @Param('id') id: string
  ) {
    if (req.user?.roleName === 'QA Member') {
      throw new ForbiddenException('Only Super Admin, Tech Lead, or BA can clone sessions');
    }
    const data = await this.sessionsService.cloneSession(id);
    return { message: 'Session cloned successfully', data };
  }

  @Get()
  async getSessions() {
    const data = await this.sessionsService.getSessions();
    return { data };
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
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: any
  ) {
    if (req.user?.roleName === 'QA Member') {
      throw new ForbiddenException('Only Super Admin, Tech Lead, or BA can edit sessions');
    }
    const data = await this.sessionsService.updateSession(id, dto);
    return { message: 'Session updated successfully', data };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteSession(
    @Request() req: any,
    @Param('id') id: string
  ) {
    if (req.user?.roleName === 'QA Member') {
      throw new ForbiddenException('Only Super Admin, Tech Lead, or BA can delete sessions');
    }
    const data = await this.sessionsService.deleteSession(id);
    return { message: 'Session deleted successfully', data };
  }
}
