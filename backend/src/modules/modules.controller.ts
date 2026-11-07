import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request, Put, Query } from '@nestjs/common';
import { ModulesService } from './modules.service.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

@Controller('modules')
@UseGuards(JwtAuthGuard)
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  async create(@Body() createModuleDto: any) {
    return { data: await this.modulesService.create(createModuleDto) };
  }

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string, @Query('sortBy') sortBy?: string, @Query('sortOrder') sortOrder?: string) {
    const query = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      search,
      sortBy,
      sortOrder
    };
    const result = await this.modulesService.findAll(query);
    return { data: result.data, metadata: result.metadata };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return { data: await this.modulesService.findOne(id) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateModuleDto: any) {
    return { data: await this.modulesService.update(id, updateModuleDto) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return { data: await this.modulesService.remove(id) };
  }
}
