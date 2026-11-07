import { BadRequestException, Controller, Get, Put, Query, Body, UseGuards } from '@nestjs/common';
import { TrashService } from './trash.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('trash')
@UseGuards(JwtAuthGuard)
export class TrashController {
  @Put('delete-permanent')
  async permanentlyDelete(@Body() body: { type: string, ids: string[] }) {
    this.validateBulkRequest(body);
    const data = await this.trashService.permanentlyDelete(body.type, body.ids);
    return { message: 'Data permanently deleted', data };
  }

  constructor(private readonly trashService: TrashService) {}

  @Get()
  async getTrash(@Query('type') type: string) {
    const data = await this.trashService.getTrash(type);
    return { data };
  }

  @Put('restore')
  async restore(@Body() body: { type: string, ids: string[] }) {
    this.validateBulkRequest(body);
    const data = await this.trashService.restore(body.type, body.ids);
    return { message: 'Data restored successfully', data };
  }

  private validateBulkRequest(body: { type: string, ids: string[] }) {
    const allowedTypes = ['users', 'modules', 'sessions', 'testcases'];
    if (!body || !allowedTypes.includes(body.type) || !Array.isArray(body.ids) || body.ids.some(id => typeof id !== 'string')) {
      throw new BadRequestException('type dan ids yang valid wajib diberikan.');
    }
  }
}
