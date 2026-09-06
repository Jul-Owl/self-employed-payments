import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AUTH_SESSION_COOKIE_NAME,
  getClearedSessionCookieOptions,
  getSessionCookieOptions,
} from './auth.constants';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedUser> {
    const result = await this.authService.register(dto);
    response.cookie(
      AUTH_SESSION_COOKIE_NAME,
      result.token,
      getSessionCookieOptions(),
    );

    return result.user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedUser> {
    const result = await this.authService.login(dto);
    response.cookie(
      AUTH_SESSION_COOKIE_NAME,
      result.token,
      getSessionCookieOptions(),
    );

    return result.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ): Promise<void> {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[AUTH_SESSION_COOKIE_NAME];
    await this.authService.logout(
      typeof token === 'string' ? token : undefined,
    );
    response.clearCookie(
      AUTH_SESSION_COOKIE_NAME,
      getClearedSessionCookieOptions(),
    );
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
