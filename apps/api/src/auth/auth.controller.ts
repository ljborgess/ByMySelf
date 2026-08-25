import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';
import {
  ACCESS_TOKEN_COOKIE,
  ADMIN_THROTTLE_NAME,
  PUBLIC_READ_THROTTLE_NAME,
  REFRESH_TOKEN_COOKIE,
} from './auth.constants';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

/**
 * Every bucket but `auth-ip` is skipped for the whole controller:
 * ThrottlerGuard applies every configured bucket unless told otherwise, so
 * without this the loose public-site and admin limits would also be
 * evaluated on login/refresh. Each handler is meant to answer to exactly one
 * bucket.
 */
@SkipThrottle({
  [PUBLIC_READ_THROTTLE_NAME]: true,
  [ADMIN_THROTTLE_NAME]: true,
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // RNF-SEG5: per-IP throttle on top of AuthService.login's own per-account
  // backoff -- login/refresh are the only two routes that carry it, so it's
  // applied here rather than globally.
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() { email, password }: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: 'ok' }> {
    const result = await this.authService.login(email, password);
    setAuthCookies(response, result);
    return { status: 'ok' };
  }

  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: 'ok' }> {
    const result = await this.authService.refresh(
      readRefreshTokenCookie(request),
    );
    setAuthCookies(response, result);
    return { status: 'ok' };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: 'ok' }> {
    await this.authService.logout(readRefreshTokenCookie(request));
    clearAuthCookies(response);
    return { status: 'ok' };
  }
}

function readRefreshTokenCookie(request: Request): string | undefined {
  return request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
}

/**
 * Loopback hosts, where an explicit `Domain` is wrong -- see cookieOptions.
 * Same set env.schema.ts refuses in production, for the same reason: these
 * are development values.
 */
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * RNF-SEG2: HttpOnly + Secure + SameSite=Strict on both tokens, unreadable
 * from client JS. Secure works over http://localhost too -- browsers treat
 * localhost as a secure context, so this never needs a NODE_ENV toggle.
 *
 * `Domain` is omitted for loopback, which makes the cookie host-only.
 * `Domain=localhost` is a single-label domain, and browsers disagree about
 * whether to accept one at all -- when a browser drops it, the login answers
 * 200 with no session attached, and the panel bounces straight back to the
 * login screen with nothing on screen explaining why. Host-only is what a
 * cookie for localhost should be anyway: there are no subdomains to share
 * it with.
 *
 * Production is unaffected. env.schema.ts already refuses a loopback
 * COOKIE_DOMAIN there, so this branch is unreachable outside development.
 */
function cookieOptions(maxAgeMs: number): CookieOptions {
  const isLoopback = LOOPBACK_HOSTS.has(env.COOKIE_DOMAIN.toLowerCase());

  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    ...(isLoopback ? {} : { domain: env.COOKIE_DOMAIN }),
    maxAge: maxAgeMs,
  };
}

function setAuthCookies(response: Response, result: LoginResult): void {
  response.cookie(
    ACCESS_TOKEN_COOKIE,
    result.accessToken,
    cookieOptions(result.accessTokenMaxAgeMs),
  );
  response.cookie(
    REFRESH_TOKEN_COOKIE,
    result.refreshToken,
    cookieOptions(result.refreshTokenMaxAgeMs),
  );
}

function clearAuthCookies(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions(0));
  response.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions(0));
}
