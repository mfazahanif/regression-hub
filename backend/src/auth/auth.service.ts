import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './auth.dto.js';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';

const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '15m';
const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);
const IDLE_TIMEOUT_MINUTES = Number(process.env.AUTH_IDLE_TIMEOUT_MINUTES || 30);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Kredensial tidak valid');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun pengguna dinonaktifkan');
    }

    const payload = { 
      sub: user.id, 
      email: user.email, 
      roleId: user.roleId,
      roleName: user.role.name 
    };

    const sessionId = randomUUID();
    const refreshToken = this.jwtService.sign({ sub: user.id, sid: sessionId, type: 'refresh' }, {
      expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d`,
    });
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.authSession.create({ data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshToken),
      expiresAt,
    } });

    return {
      access_token: this.jwtService.sign({ ...payload, sid: sessionId, type: 'access' }, { expiresIn: ACCESS_TOKEN_TTL as any }),
      refresh_token: refreshToken,
      expires_in: ACCESS_TOKEN_TTL,
      refresh_expires_at: expiresAt.toISOString(),
      idle_timeout_minutes: IDLE_TIMEOUT_MINUTES,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name
      }
    };
  }

  async refresh(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau kedaluwarsa');
    }
    if (payload.type !== 'refresh' || !payload.sid) throw new UnauthorizedException('Refresh token tidak valid');
    const session = await this.prisma.authSession.findUnique({ where: { id: payload.sid }, include: { user: { include: { role: true } } } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.userId !== payload.sub ||
        session.refreshTokenHash !== this.hashToken(refreshToken) || !session.user.isActive ||
        Date.now() - session.lastActivityAt.getTime() > IDLE_TIMEOUT_MINUTES * 60 * 1000) {
      if (session && !session.revokedAt) await this.prisma.authSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Sesi berakhir, silakan login kembali');
    }
    const nextRefresh = this.jwtService.sign({ sub: session.userId, sid: session.id, type: 'refresh' }, { expiresIn: `${REFRESH_TOKEN_TTL_DAYS}d` });
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.authSession.update({ where: { id: session.id }, data: {
      refreshTokenHash: this.hashToken(nextRefresh), expiresAt, lastActivityAt: new Date(),
    } });
    const user = session.user;
    return {
      access_token: this.jwtService.sign({ sub: user.id, email: user.email, roleId: user.roleId, roleName: user.role.name, sid: session.id, type: 'access' }, { expiresIn: ACCESS_TOKEN_TTL as any }),
      refresh_token: nextRefresh,
      expires_in: ACCESS_TOKEN_TTL,
      refresh_expires_at: expiresAt.toISOString(),
      idle_timeout_minutes: IDLE_TIMEOUT_MINUTES,
    };
  }

  async signout(sessionId: string) {
    if (sessionId) await this.prisma.authSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }

  async validateSession(sessionId: string, userId: string) {
    const session = await this.prisma.authSession.findUnique({ where: { id: sessionId } });
    if (!session || session.userId !== userId || session.revokedAt || session.expiresAt <= new Date() ||
        Date.now() - session.lastActivityAt.getTime() > IDLE_TIMEOUT_MINUTES * 60 * 1000) return false;
    await this.prisma.authSession.update({ where: { id: sessionId }, data: { lastActivityAt: new Date() } });
    return true;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
