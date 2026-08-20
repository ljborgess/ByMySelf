import { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthGuard } from '../auth/auth.guard';
import { CsrfGuard } from '../common/csrf.guard';
import { env } from '../config/env';
import { AdminProjectsController } from './admin-projects.controller';
import { ProjectsService } from './projects.service';

const USER_ID = 'a3f6b7f0-1c2d-4e5f-9a8b-1234567890ab';
const PROJECT_ID = 'b2f6b7f0-1c2d-4e5f-9a8b-1234567890cd';

const validBody = {
  title: { pt: 'Meu projeto' },
  description: { pt: 'Descrição' },
  content: { pt: '# Conteúdo' },
  slug: 'meu-projeto',
};

/**
 * Drives the controller through the real HTTP stack -- guards, pipes and
 * routing included -- because that wiring is precisely what a unit test on
 * the controller class cannot check. The AuthGuard bug found reviewing the
 * auth epic (a path comparison that disagreed with how Express routes) is
 * exactly the shape of defect only this level catches.
 */
describe('AdminProjectsController', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let service: {
    findAll: jest.Mock;
    findById: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    reorder: jest.Mock;
  };

  function authCookie(): string {
    const token = jwt.sign(
      { sub: USER_ID },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: 900 },
    );
    return `access_token=${token}`;
  }

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue({ id: PROJECT_ID }),
      create: jest.fn().mockResolvedValue({ id: PROJECT_ID }),
      update: jest.fn().mockResolvedValue({ id: PROJECT_ID }),
      softDelete: jest.fn().mockResolvedValue(undefined),
      reorder: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [AdminProjectsController],
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

    jwt = moduleRef.get(JwtService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('authentication', () => {
    it('rejects an unauthenticated read', async () => {
      await request(app.getHttpServer()).get('/admin/projects').expect(401);
    });

    it('rejects an unauthenticated create even with a valid body', async () => {
      await request(app.getHttpServer())
        .post('/admin/projects')
        .set('X-Requested-With', 'XMLHttpRequest')
        .send(validBody)
        .expect(401);

      expect(service.create).not.toHaveBeenCalled();
    });

    it('rejects a tampered access token', async () => {
      const forged = jwt.sign(
        { sub: USER_ID },
        { secret: 'a-different-secret-entirely', expiresIn: 900 },
      );

      await request(app.getHttpServer())
        .get('/admin/projects')
        .set('Cookie', `access_token=${forged}`)
        .expect(401);
    });

    // Express routes case-insensitively, so these reach the same handler
    it.each(['/ADMIN/projects', '/Admin/Projects'])(
      'still requires auth on %s',
      async (path) => {
        const response = await request(app.getHttpServer()).get(path);

        expect(response.status).toBe(401);
        expect(service.findAll).not.toHaveBeenCalled();
      },
    );
  });

  describe('CSRF', () => {
    it('rejects a reorder without the required header', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/projects/${PROJECT_ID}/order`)
        .set('Cookie', authCookie())
        .send({ order: 0 })
        .expect(403);

      expect(service.reorder).not.toHaveBeenCalled();
    });

    it('rejects a mutation without the required header', async () => {
      await request(app.getHttpServer())
        .post('/admin/projects')
        .set('Cookie', authCookie())
        .send(validBody)
        .expect(403);

      expect(service.create).not.toHaveBeenCalled();
    });

    it('allows a read without the header', async () => {
      await request(app.getHttpServer())
        .get('/admin/projects')
        .set('Cookie', authCookie())
        .expect(200);
    });
  });

  describe('authenticated requests', () => {
    it('creates a project from a valid body', async () => {
      await request(app.getHttpServer())
        .post('/admin/projects')
        .set('Cookie', authCookie())
        .set('X-Requested-With', 'XMLHttpRequest')
        .send(validBody)
        .expect(201);

      expect(service.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'meu-projeto' }),
      );
    });

    it('rejects a body missing the required pt title before the service runs', async () => {
      await request(app.getHttpServer())
        .post('/admin/projects')
        .set('Cookie', authCookie())
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ ...validBody, title: { en: 'Only English' } })
        .expect(400);

      expect(service.create).not.toHaveBeenCalled();
    });

    it('patches a subset of fields', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/projects/${PROJECT_ID}`)
        .set('Cookie', authCookie())
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ featured: true })
        .expect(200);

      expect(service.update).toHaveBeenCalledWith(PROJECT_ID, {
        featured: true,
      });
    });

    it('soft-deletes and answers 204 with no body', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/admin/projects/${PROJECT_ID}`)
        .set('Cookie', authCookie())
        .set('X-Requested-With', 'XMLHttpRequest')
        .expect(204);

      expect(response.body).toEqual({});
      expect(service.softDelete).toHaveBeenCalledWith(PROJECT_ID);
    });

    // PATCH :id is declared before PATCH :id/order, so this also confirms
    // the two-segment route is not swallowed by the single-segment one
    it('routes the reorder to its own handler, not to the generic patch', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/projects/${PROJECT_ID}/order`)
        .set('Cookie', authCookie())
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ order: 2 })
        .expect(200);

      expect(service.reorder).toHaveBeenCalledWith(PROJECT_ID, 2);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('rejects a negative order before the service runs', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/projects/${PROJECT_ID}/order`)
        .set('Cookie', authCookie())
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ order: -1 })
        .expect(400);

      expect(service.reorder).not.toHaveBeenCalled();
    });

    it('rejects a non-integer order', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/projects/${PROJECT_ID}/order`)
        .set('Cookie', authCookie())
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ order: 1.5 })
        .expect(400);

      expect(service.reorder).not.toHaveBeenCalled();
    });

    it('rejects an id that is not a uuid before hitting the service', async () => {
      await request(app.getHttpServer())
        .get('/admin/projects/not-a-uuid')
        .set('Cookie', authCookie())
        .expect(400);

      expect(service.findById).not.toHaveBeenCalled();
    });
  });
});
