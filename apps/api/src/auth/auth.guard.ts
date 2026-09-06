import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_SESSION_COOKIE_NAME } from './auth.constants';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & AuthenticatedRequest>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[AUTH_SESSION_COOKIE_NAME];

    if (typeof token !== 'string') {
      throw new UnauthorizedException('Authentication is required');
    }

    const user = await this.authService.getUserForSessionToken(token);

    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }

    request.user = user;
    return true;
  }
}
