import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      const response = host.switchToHttp().getResponse<Response>();
      return response.status(exception.getStatus()).json(exception.getResponse());
    }

    const code = (exception as { code?: string })?.code;
    const mapped = this.mapPrismaError(code);
    if (mapped) {
      const response = host.switchToHttp().getResponse<Response>();
      return response.status(mapped.getStatus()).json(mapped.getResponse());
    }

    const response = host.switchToHttp().getResponse<Response>();
    return response.status(500).json({ statusCode: 500, message: 'Internal server error' });
  }

  private mapPrismaError(code?: string) {
    if (code === 'P2002') return new ConflictException('Data dengan nilai unik tersebut sudah ada.');
    if (code === 'P2025') return new NotFoundException('Data yang diminta tidak ditemukan.');
    if (['P2000', 'P2003', 'P2006', 'P2011', 'P2012'].includes(code || '')) {
      return new BadRequestException('Data yang dikirim tidak valid atau masih digunakan.');
    }
    return null;
  }
}
