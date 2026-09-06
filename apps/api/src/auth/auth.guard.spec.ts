import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthGuard', () => {
  const getUserForSessionToken = jest.fn();
  const authService = {
    getUserForSessionToken,
  } as unknown as AuthService;
  const guard = new AuthGuard(authService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without an authentication cookie', async () => {
    await expect(
      guard.canActivate(createContext({ cookies: {} })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects requests with an invalid session token', async () => {
    getUserForSessionToken.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        createContext({ cookies: { auth_session: 'invalid' } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the authenticated user to valid requests', async () => {
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      name: null,
      publicSlug: 'user-public-slug',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const request = { cookies: { auth_session: 'valid-token' } };
    getUserForSessionToken.mockResolvedValue(user);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(getUserForSessionToken).toHaveBeenCalledWith('valid-token');
    expect(request).toMatchObject({ user });
  });

  function createContext(request: object): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }
});
