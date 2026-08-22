import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  AUTH_IP_THROTTLE_LIMIT,
  AUTH_IP_THROTTLE_NAME,
  AUTH_IP_THROTTLE_TTL_MS,
  PUBLIC_READ_THROTTLE_LIMIT,
  PUBLIC_READ_THROTTLE_NAME,
  PUBLIC_READ_THROTTLE_TTL_MS,
} from '../auth/auth.constants';
import request from 'supertest';
import { App } from 'supertest/types';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let check: jest.Mock;

  beforeEach(async () => {
    check = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      // Estes testes chamam o método do controller direto, sem passar pelo
      // pipeline HTTP -- mas `@UseGuards(ThrottlerGuard)` é resolvido ao
      // montar o container de DI, então o módulo precisa estar aqui mesmo que
      // o guard nunca execute. Registrado com os buckets reais, e não
      // stubado, para a escolha de bucket continuar sendo testável.
      imports: [
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
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: { check } }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('returns the health body when the database is reachable', async () => {
    check.mockResolvedValue({ status: 'ok', db: 'ok' });

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      db: 'ok',
    });
  });

  it('raises 503 carrying the health body when the database is unreachable', async () => {
    check.mockResolvedValue({ status: 'error', db: 'error' });

    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );

    await expect(controller.check()).rejects.toMatchObject({
      response: { status: 'error', db: 'error' },
    });
  });
});

/**
 * A rota passou a ser publicamente alcançável na épica de Deploy (#37) e faz
 * `select 1` no Postgres a cada chamada. Estes testes fixam as duas metades
 * da proteção — e a primeira é a que importa mais: errar o bucket faria a
 * sonda do próprio container tomar 429, ser lida como "unhealthy" e virar
 * restart loop.
 */
describe('HealthController rate limiting (HTTP)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
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
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn().mockResolvedValue({
              status: 'ok',
              db: 'ok',
              version: 'test',
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('is not subject to the strict auth bucket, which would break the probes', async () => {
    // 10 requests por 15 minutos derrubaria a sonda do container (a cada 30s),
    // o probe do Dokploy e o polling do CI no deploy.
    for (let i = 0; i < AUTH_IP_THROTTLE_LIMIT + 5; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });

  it('is still bounded, so it is not an open path into the database', async () => {
    for (let i = 0; i < PUBLIC_READ_THROTTLE_LIMIT; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }

    await request(app.getHttpServer()).get('/health').expect(429);
  });
});
