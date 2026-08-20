import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { env } from '../config/env';
import { ACCESS_TOKEN_COOKIE } from './auth.constants';

const ADMIN_ROUTE_PREFIX = '/admin';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

interface AccessTokenPayload {
  sub: string;
}

/**
 * Registered globally (APP_GUARD in AuthModule) so a new /admin route is
 * protected the moment it exists, with no per-controller @UseGuards() to
 * remember. Every other route -- /health, /auth/*, the future public
 * /projects* -- is intentionally untouched: this guard only ever looks at
 * requests whose path starts with /admin, everything else passes straight
 * through without even reading the cookie.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!isAdminRoute(request.path)) {
      return true;
    }

    const accessToken = request.cookies?.[ACCESS_TOKEN_COOKIE] as
      string | undefined;

    if (!accessToken) {
      throw new UnauthorizedException('Invalid access token');
    }

    try {
      const payload = this.jwt.verify<AccessTokenPayload>(accessToken, {
        secret: env.JWT_ACCESS_SECRET,
      });
      (request as AuthenticatedRequest).userId = payload.sub;
    } catch {
      // missing vs expired vs tampered all collapse to the same generic
      // 401 -- distinguishing them in the response hands an attacker
      // probing information for free.
      throw new UnauthorizedException('Invalid access token');
    }

    return true;
  }
}

function isAdminRoute(path: string): boolean {
  return (
    path === ADMIN_ROUTE_PREFIX || path.startsWith(`${ADMIN_ROUTE_PREFIX}/`)
  );
}
