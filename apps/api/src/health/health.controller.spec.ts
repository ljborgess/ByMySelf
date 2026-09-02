import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  PUBLIC_READ_THROTTLE_LIMIT,
  PUBLIC_READ_THROTTLE_NAME,
  PUBLIC_READ_THROTTLE_TTL_MS,
} from '../common/throttle.constants';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let check: jest.Mock;

  beforeEach(async () => {
    check = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
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

  it('returns the health body', () => {
    check.mockReturnValue({ status: 'ok', version: 'abc123' });

    expect(controller.check()).toEqual({ status: 'ok', version: 'abc123' });
  });
});

/**
 * A rota faz parte do bucket `public-read`, junto de `/projects` -- errar o
 * bucket faria a sonda do próprio container tomar 429, ser lida como
 * "unhealthy" e virar restart loop.
 */
describe('HealthController rate limiting (HTTP)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
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
          useValue: { check: () => ({ status: 'ok', version: 'abc123' }) },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers requests under the limit', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
