import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

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

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: 'ok' }> {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE] as
      string | undefined;
    await this.authService.logout(refreshToken);
    clearAuthCookies(response);
    return { status: 'ok' };
  }
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
