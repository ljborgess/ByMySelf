import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { env } from '../config/env';
import { AuthenticatedRequest, AuthGuard } from './auth.guard';

function createContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  // JWT verification is the core logic under test, so a real JwtService
  // signs real tokens rather than mocking `verify` -- per RNF-QUA1's
  // instruction for this guard specifically.
  const jwt = new JwtService();
  const guard = new AuthGuard(jwt);
  const userId = 'a3f6b7f0-1c2d-4e5f-9a8b-1234567890ab';

  function signAccessToken(expiresIn: number): string {
    return jwt.sign(
      { sub: userId },
      { secret: env.JWT_ACCESS_SECRET, expiresIn },
    );
  }

  describe('on an /admin route', () => {
    it('allows a request with a valid access token and attaches the user id', () => {
      const token = signAccessToken(900);
      const request = {
        path: '/admin/projects',
        cookies: { access_token: token },
      };

      expect(guard.canActivate(createContext(request))).toBe(true);
      expect((request as unknown as AuthenticatedRequest).userId).toBe(userId);
    });

    it('rejects a request with no access token cookie', () => {
      const request = { path: '/admin/projects', cookies: {} };

      expect(() => guard.canActivate(createContext(request))).toThrow(
        UnauthorizedException,
      );
    });

    it('rejects an expired access token', () => {
      const token = signAccessToken(-10);
      const request = {
        path: '/admin/projects',
        cookies: { access_token: token },
      };

      expect(() => guard.canActivate(createContext(request))).toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a token with an invalid signature', () => {
      const tamperedToken = jwt.sign(
        { sub: userId },
        { secret: 'a-completely-different-secret-value', expiresIn: 900 },
      );
      const request = {
        path: '/admin/projects',
        cookies: { access_token: tamperedToken },
      };

      expect(() => guard.canActivate(createContext(request))).toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('on a non-/admin route', () => {
    it('does not gate /health, even with no cookie at all', () => {
      const request = { path: '/health', cookies: {} };

      expect(guard.canActivate(createContext(request))).toBe(true);
    });

    it('does not gate /auth/login', () => {
      const request = { path: '/auth/login', cookies: {} };

      expect(guard.canActivate(createContext(request))).toBe(true);
    });

    it('does not gate the public /projects listing', () => {
      const request = { path: '/projects', cookies: {} };

      expect(guard.canActivate(createContext(request))).toBe(true);
    });
  });
});
