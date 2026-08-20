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

/**
 * Lowercased before comparing because Express routes case-insensitively by
 * default: a controller registered at /admin/projects also answers
 * /ADMIN/projects. A case-sensitive check here would let those variants
 * through unauthenticated while Express still served the handler -- the
 * exact "protected by default" guarantee this guard exists to provide.
 */
function isAdminRoute(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized === ADMIN_ROUTE_PREFIX ||
    normalized.startsWith(`${ADMIN_ROUTE_PREFIX}/`)
  );
}
