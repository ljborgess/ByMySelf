import {
  Controller,
  ExecutionContext,
  Get,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Request } from 'express';
import request from 'supertest';
import { App } from 'supertest/types';
import { env } from '../config/env';
import { AuthenticatedRequest, AuthGuard } from './auth.guard';

function createContext(req: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

@Controller('admin')
class AdminProbeController {
  @Get('projects')
  projects(): { secret: string } {
    return { secret: 'admin-only' };
  }
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

    // Express routes case-insensitively by default, so a controller at
    // /admin/projects also answers these -- the guard has to recognise them
    // as admin routes or they reach the handler unauthenticated.
    it.each([
      '/ADMIN/projects',
      '/Admin/Projects',
      '/aDmIn/projects',
      '/ADMIN',
    ])('still gates %s despite the differing case', (path) => {
      const request = { path, cookies: {} };

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

  /**
   * The checks above drive canActivate with a hand-built context, which
   * cannot catch a mismatch between what the guard considers an admin path
   * and what Express actually routes to the admin handler. These go through
   * a real app so the guard and the router have to agree.
   */
  describe('against real Express routing', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [JwtModule.register({})],
        controllers: [AdminProbeController],
        providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
      }).compile();

      app = moduleRef.createNestApplication();
      // the guard reads request.cookies, populated by this middleware in
      // main.ts -- without it every request looks cookie-less here
      app.use(cookieParser());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it.each([
      '/admin/projects',
      '/ADMIN/projects',
      '/Admin/Projects',
      '/admin/projects/',
    ])('rejects %s with 401 rather than serving the handler', async (path) => {
      const response = await request(app.getHttpServer()).get(path);

      expect(response.status).toBe(401);
      expect(response.body).not.toHaveProperty('secret');
    });

    it('serves the handler once a valid access token cookie is present', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/projects')
        .set('Cookie', `access_token=${signAccessToken(900)}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ secret: 'admin-only' });
    });
  });
});
