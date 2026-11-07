import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ModulesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { name: string, code: string, description?: string }) {
    return this.prisma.module.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
      }
    });
  }

  async findAll(query: { page?: number, limit?: number, search?: string, sortBy?: string, sortOrder?: string }) {
    const page = Number.isInteger(query.page) && query.page! > 0 ? query.page! : 1;
    const limit = Number.isInteger(query.limit) && query.limit! > 0 ? Math.min(query.limit!, 200) : 50;
    const skip = (page - 1) * limit;
    const sortableFields = new Set(['name', 'code', 'createdAt', 'updatedAt']);
    const sortBy = query.sortBy === 'testcaseCount' || sortableFields.has(query.sortBy || '')
      ? query.sortBy
      : undefined;

    const where: any = { isDeleted: false };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.module.count({ where }),
      this.prisma.module.findMany({
        where,
        skip,
        take: limit,
        orderBy: sortBy ? (sortBy === 'testcaseCount' ? { testcases: { _count: (query.sortOrder === 'asc' ? 'asc' : 'desc') } } : { [sortBy]: (query.sortOrder === 'desc' ? 'desc' : 'asc') }) : { createdAt: 'desc' },
        include: {
          _count: { select: { testcases: { where: { isDeleted: false } } } }
        }
      })
    ]);

    return {
      metadata: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data,
    };
  }

  async findOne(id: string) {
    const module = await this.prisma.module.findUnique({
      where: { id },
      include: {
        testcases: {
          orderBy: { sequence: 'asc' },
          include: {
            createdBy: { select: { name: true } },
            updatedBy: { select: { name: true } },
            steps: { orderBy: { sequence: 'asc' } }
          }
        }
      }
    });
    if (!module) throw new NotFoundException('Module not found');
    return module;
  }

  async update(id: string, data: { name?: string, code?: string, description?: string }) {
    return this.prisma.module.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    return this.prisma.module.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() }
    });
  }
}
