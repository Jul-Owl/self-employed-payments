/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest matcher return types are any. */
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const user = {
    create: jest.fn(),
    findUnique: jest.fn(),
  };
  const session = {
    create: jest.fn(),
    deleteMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const prisma = { user, session } as unknown as PrismaService;
  const service = new AuthService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    session.create.mockResolvedValue({ id: 'session-id' });
  });

  it('registers a user with a bcrypt password hash and only returns safe fields', async () => {
    user.create.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      name: 'User',
      publicSlug: 'user-public-slug',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.register({
      email: 'USER@example.com',
      name: ' User ',
      password: 'safe-password',
    });

    expect(user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'user@example.com',
        name: 'User',
        passwordHash: expect.stringMatching(/^\$2[aby]\$/),
      }),
      select: expect.any(Object),
    });
    expect(session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-id',
        tokenHash: createHash('sha256').update(result.token).digest('hex'),
        expiresAt: expect.any(Date),
      }),
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('creates a hashed opaque session token after successful login', async () => {
    user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      name: null,
      publicSlug: 'user-public-slug',
      passwordHash: await bcrypt.hash('safe-password', 4),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.login({
      email: 'user@example.com',
      password: 'safe-password',
    });

    expect(session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tokenHash: createHash('sha256').update(result.token).digest('hex'),
      }),
    });
    expect(result.user).toEqual(
      expect.objectContaining({
        id: 'user-id',
        email: 'user@example.com',
      }),
    );
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('rejects an incorrect password', async () => {
    user.findUnique.mockResolvedValue({
      id: 'user-id',
      passwordHash: await bcrypt.hash('safe-password', 4),
    });

    await expect(
      service.login({
        email: 'user@example.com',
        password: 'incorrect-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deletes the matching session on logout', async () => {
    await service.logout('raw-session-token');

    expect(session.deleteMany).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256')
          .update('raw-session-token')
          .digest('hex'),
      },
    });
  });

  it('removes expired sessions and does not authenticate them', async () => {
    session.findUnique.mockResolvedValue({
      id: 'expired-session-id',
      expiresAt: new Date(Date.now() - 1),
      user: {
        id: 'user-id',
        email: 'user@example.com',
        name: null,
        publicSlug: 'user-public-slug',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await expect(
      service.getUserForSessionToken('expired-session-token'),
    ).resolves.toBeNull();
    expect(session.deleteMany).toHaveBeenCalledWith({
      where: { id: 'expired-session-id' },
    });
  });
});
