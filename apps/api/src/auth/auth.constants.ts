import { CookieOptions } from 'express';
import { getRuntimeConfiguration } from '../config/app-environment';

export const AUTH_SESSION_COOKIE_NAME = 'auth_session';
export const AUTH_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function getSessionCookieOptions(): CookieOptions {
  const { appEnvironment } = getRuntimeConfiguration();

  return {
    httpOnly: true,
    secure: appEnvironment !== 'local',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_SESSION_DURATION_MS,
  };
}

export function getClearedSessionCookieOptions(): CookieOptions {
  const { appEnvironment } = getRuntimeConfiguration();

  return {
    httpOnly: true,
    secure: appEnvironment !== 'local',
    sameSite: 'lax',
    path: '/',
  };
}
