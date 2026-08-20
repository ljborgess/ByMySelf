import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './auth.constants';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
 * RNF-SEG2: HttpOnly + Secure + SameSite=Strict on both tokens, unreadable
 * from client JS. Secure works over http://localhost too -- browsers treat
 * localhost as a secure context, so this never needs a NODE_ENV toggle.
 */
function cookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    domain: env.COOKIE_DOMAIN,
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
