import { CookieOptions } from 'express';

export const AUTH_SESSION_COOKIE_NAME = 'auth_session';
export const AUTH_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_SESSION_DURATION_MS,
  };
}

export function getClearedSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}
