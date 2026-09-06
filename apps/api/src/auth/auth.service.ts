import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AUTH_SESSION_DURATION_MS } from './auth.constants';
import type { AuthenticatedUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const PASSWORD_HASH_ROUNDS = 12;

const authenticatedUserSelect = {
  id: true,
  email: true,
  name: true,
  publicSlug: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface AuthResult {
  user: AuthenticatedUser;
  token: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    this.assertPasswordByteLength(dto.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: this.normalizeEmail(dto.email),
          name: dto.name?.trim() || null,
          publicSlug: this.createPublicSlug(),
          passwordHash: await bcrypt.hash(dto.password, PASSWORD_HASH_ROUNDS),
        },
        select: authenticatedUserSelect,
      });

      return {
        user,
        token: await this.createSession(user.id),
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists');
      }

      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    this.assertPasswordByteLength(dto.password);

    const user = await this.prisma.user.findUnique({
      where: { email: this.normalizeEmail(dto.email) },
    });

    if (
      !user?.passwordHash ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        publicSlug: user.publicSlug,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token: await this.createSession(user.id),
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }

    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(token) },
    });
  }

  async getUserForSessionToken(
    token: string,
  ): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        user: {
          select: authenticatedUserSelect,
        },
      },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt <= new Date()) {
      await this.prisma.session.deleteMany({
        where: { id: session.id },
      });
      return null;
    }

    return session.user;
  }

  private async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + AUTH_SESSION_DURATION_MS),
      },
    });

    return token;
  }

  private createPublicSlug(): string {
    return `user-${randomBytes(16).toString('hex')}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private assertPasswordByteLength(password: string): void {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException('Password must not exceed 72 bytes');
    }
  }
}
