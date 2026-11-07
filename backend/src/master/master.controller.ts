import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { MasterService } from './master.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@Controller('master')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('environments')
  async getEnvironments() {
    const data = await this.masterService.getEnvironments();
    return { data };
  }

  @Get('statuses')
  async getStatuses() {
    const data = await this.masterService.getStatuses();
    return { data };
  }

  @Roles('Super Admin')
  @Post('statuses')
  async createStatus(@Body() data: any) {
    const result = await this.masterService.createStatus(data);
    return { data: result };
  }

  @Roles('Super Admin')
  @Put('statuses/:id')
  async updateStatus(@Param('id') id: string, @Body() data: any) {
    const result = await this.masterService.updateStatus(Number(id), data);
    return { data: result };
  }

  @Roles('Super Admin')
  @Delete('statuses/:id')
  async deleteStatus(@Param('id') id: string) {
    const result = await this.masterService.deleteStatus(Number(id));
    return { data: result };
  }

  @Get('modules')
  async getModules() {
    const data = await this.masterService.getModules();
    return { data };
  }

  @Get('users')
  async getUsers() {
    const data = await this.masterService.getUsers();
    return { data };
  }

  @Roles('Super Admin', 'Tech Lead', 'BA')
  @Post('users')
  async createUser(@Body() data: any, @Request() req: any) {
    if (['Tech Lead', 'BA'].includes(req.user.roleName)) {
      const roles = await this.masterService.getRoles();
      const qaRole = roles.find((r: any) => r.name === 'QA Member');
      if (!qaRole || Number(data.roleId) !== qaRole.id) {
        throw new ForbiddenException('Tech Leads and BAs can only create QA Member');
      }
    }
    const result = await this.masterService.createUser(data);
    return { data: result };
  }

  @Roles('Super Admin', 'Tech Lead', 'BA')
  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    let allowedData = data;
    if (['Tech Lead', 'BA'].includes(req.user.roleName)) {
      const targetRole = await this.masterService.getUserRole(id);
      if (targetRole !== 'QA Member') {
        throw new ForbiddenException('Tech Leads and BAs can only edit QA Member');
      }
      allowedData = { isActive: data.isActive };
    }
    const result = await this.masterService.updateUser(id, allowedData);
    return { data: result };
  }

  @Roles('Super Admin', 'Tech Lead', 'BA')
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string, @Request() req: any) {
    if (['Tech Lead', 'BA'].includes(req.user.roleName)) {
      const targetRole = await this.masterService.getUserRole(id);
      if (targetRole !== 'QA Member') {
        throw new ForbiddenException('Tech Leads and BAs can only delete QA Member');
      }
    }
    const result = await this.masterService.deleteUser(id);
    return { data: result };
  }

  @Get('roles')
  async getRoles() {
    const data = await this.masterService.getRoles();
    return { data };
  }

  @Roles('Super Admin')
  @Post('roles')
  async createRole(@Body() data: any) {
    const result = await this.masterService.createRole(data);
    return { data: result };
  }

  @Roles('Super Admin')
  @Put('roles/:id')
  async updateRole(@Param('id') id: string, @Body() data: any) {
    const result = await this.masterService.updateRole(Number(id), data);
    return { data: result };
  }

  @Roles('Super Admin')
  @Delete('roles/:id')
  async deleteRole(@Param('id') id: string) {
    const result = await this.masterService.deleteRole(Number(id));
    return { data: result };
  }
}
