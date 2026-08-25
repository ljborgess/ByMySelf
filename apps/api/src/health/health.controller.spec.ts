import { INestApplication, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  ADMIN_THROTTLE_LIMIT,
  ADMIN_THROTTLE_NAME,
  ADMIN_THROTTLE_TTL_MS,
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
          {
            name: ADMIN_THROTTLE_NAME,
            ttl: ADMIN_THROTTLE_TTL_MS,
            limit: ADMIN_THROTTLE_LIMIT,
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
          {
            name: ADMIN_THROTTLE_NAME,
            ttl: ADMIN_THROTTLE_TTL_MS,
            limit: ADMIN_THROTTLE_LIMIT,
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

/**
 * A escolha de bucket, verificada no metadado e não por HTTP.
 *
 * Motivo: com os limites atuais é **impossível** observar o bucket `admin`
 * atuando aqui. O `public-read` corta em 120/min e o `admin` em 240, então o
 * primeiro sempre dispara antes — uma tentativa de exceder o segundo bate no
 * 429 do primeiro. Foi assim que a primeira versão deste teste falhou.
 *
 * Isso não torna o skip decorativo. O `ThrottlerGuard` avalia todo bucket
 * configurado a menos que o handler dispense por nome, então o `admin` (#83)
 * *estava* aplicado a esta rota até a #90 — e passaria a morder no dia em que
 * alguém baixasse o limite dele ou subisse o do `public-read`. A regra que os
 * outros dois controllers declaram é que um handler responde a exatamente um
 * bucket; é ela que este teste fixa.
 */
/**
 * O bucket `admin` não se aplica a esta rota — verificado por comportamento.
 *
 * Com os limites de produção isso é **impossível** de observar: `public-read`
 * corta em 120/min e `admin` em 240, então o primeiro sempre dispara antes e
 * uma tentativa de exceder o segundo bate no 429 do primeiro. Foi assim que a
 * primeira versão deste teste falhou.
 *
 * Aqui o `admin` entra com limite deliberadamente baixo, abaixo do
 * `public-read`, o que torna a diferença observável: se a rota estivesse
 * sujeita a ele, o 429 viria na quarta chamada. Não é o limite de produção, e
 * não deveria ser — o que está sob teste é *qual bucket se aplica*, não quanto
 * ele permite.
 *
 * Ler o metadado do `@SkipThrottle` seria a alternativa, e foi descartada: a
 * chave (`THROTTLER:SKIP<nome>`) é interna do @nestjs/throttler e não é
 * exportada na raiz do pacote. Um teste amarrado a ela quebraria numa
 * renomeação sem que nada de fato mudasse.
 *
 * Por que importa, se hoje é inobservável: o `ThrottlerGuard` avalia todo
 * bucket configurado a menos que o handler dispense por nome, então o `admin`
 * (#83) *estava* aplicado aqui até a #90 — e voltaria a morder no dia em que
 * alguém baixasse o limite dele ou subisse o do `public-read`.
 */
describe('HealthController bucket selection', () => {
  const ADMIN_LIMIT_UNDER_TEST = 3;
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
          {
            name: ADMIN_THROTTLE_NAME,
            ttl: ADMIN_THROTTLE_TTL_MS,
            limit: ADMIN_LIMIT_UNDER_TEST,
          },
        ]),
      ],
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest
              .fn()
              .mockResolvedValue({ status: 'ok', db: 'ok', version: 'test' }),
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

  it('is not subject to the admin bucket', async () => {
    for (let i = 0; i < ADMIN_LIMIT_UNDER_TEST + 5; i++) {
      await request(app.getHttpServer()).get('/health').expect(200);
    }
  });
});
