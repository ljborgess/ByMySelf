import { INestApplication, NotFoundException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  AUTH_IP_THROTTLE_LIMIT,
  AUTH_IP_THROTTLE_NAME,
  AUTH_IP_THROTTLE_TTL_MS,
  PUBLIC_READ_THROTTLE_LIMIT,
  PUBLIC_READ_THROTTLE_NAME,
  PUBLIC_READ_THROTTLE_TTL_MS,
} from '../auth/auth.constants';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfGuard } from '../common/csrf.guard';
import { ProjectsService } from './projects.service';
import { PublicProjectsController } from './public-projects.controller';

/**
 * Registers both global guards on purpose. These routes must be reachable
 * with no session at all (user story 4), and the only way to show that is to
 * put the guards in place and watch the request through anyway.
 *
 * The throttler is registered with the app's real buckets for the same
 * reason: which bucket these routes answer to is the point, so a stubbed
 * guard would test nothing.
 */
describe('PublicProjectsController', () => {
  let app: INestApplication<App>;
  let service: {
    findPublished: jest.Mock;
    findPublishedBySlug: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findPublished: jest.fn().mockResolvedValue([]),
      findPublishedBySlug: jest.fn().mockResolvedValue({ slug: 'meu-projeto' }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        JwtModule.register({}),
        ThrottlerModule.forRoot([
          {
            name: AUTH_IP_THROTTLE_NAME,
            ttl: AUTH_IP_THROTTLE_TTL_MS,
            limit: AUTH_IP_THROTTLE_LIMIT,
          },
          {
            name: PUBLIC_READ_THROTTLE_NAME,
            ttl: PUBLIC_READ_THROTTLE_TTL_MS,
            limit: PUBLIC_READ_THROTTLE_LIMIT,
          },
        ]),
      ],
      controllers: [PublicProjectsController],
      providers: [
        { provide: ProjectsService, useValue: service },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ZodValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('reachable without authentication', () => {
    it('serves the listing with no cookie at all', async () => {
      await request(app.getHttpServer()).get('/projects').expect(200);

      expect(service.findPublished).toHaveBeenCalled();
    });

    it('serves a detail page with no cookie at all', async () => {
      await request(app.getHttpServer())
        .get('/projects/meu-projeto')
        .expect(200);
    });
  });

  describe('rate limiting', () => {
    /**
     * The failure this guards against is not "no limit" but "the wrong
     * limit": ThrottlerGuard applies every configured bucket unless a
     * handler opts out, and the auth bucket allows 10 requests per 15
     * minutes. Inherited here, that would take the public site down for an
     * ordinary visitor browsing a handful of pages.
     */
    it('does not subject public reads to the strict auth bucket', async () => {
      const overAuthLimit = AUTH_IP_THROTTLE_LIMIT + 5;

      for (let i = 0; i < overAuthLimit; i++) {
        await request(app.getHttpServer()).get('/projects').expect(200);
      }
    });

    it('still caps the public bucket, so the endpoint is not unbounded', async () => {
      // sitemap.xml puts this route in front of crawlers, and it is
      // unauthenticated -- the ceiling is what keeps a scripted loop from
      // becoming an open path into the database
      for (let i = 0; i < PUBLIC_READ_THROTTLE_LIMIT; i++) {
        await request(app.getHttpServer()).get('/projects').expect(200);
      }

      await request(app.getHttpServer()).get('/projects').expect(429);
    });
  });

  describe('locale', () => {
    it('defaults to pt when no locale is given', async () => {
      await request(app.getHttpServer()).get('/projects').expect(200);

      expect(service.findPublished).toHaveBeenCalledWith('pt');
    });

    it('honours ?locale=en', async () => {
      await request(app.getHttpServer()).get('/projects?locale=en').expect(200);

      expect(service.findPublished).toHaveBeenCalledWith('en');
    });

    it('passes the locale through on the detail route', async () => {
      await request(app.getHttpServer())
        .get('/projects/meu-projeto?locale=en')
        .expect(200);

      expect(service.findPublishedBySlug).toHaveBeenCalledWith(
        'meu-projeto',
        'en',
      );
    });

    it('rejects an unsupported locale rather than silently defaulting', async () => {
      await request(app.getHttpServer()).get('/projects?locale=fr').expect(400);

      expect(service.findPublished).not.toHaveBeenCalled();
    });
  });

  it('answers 404 for a slug that does not resolve', async () => {
    service.findPublishedBySlug.mockRejectedValue(
      new NotFoundException('Projeto não encontrado'),
    );

    await request(app.getHttpServer()).get('/projects/nao-existe').expect(404);
  });
});
