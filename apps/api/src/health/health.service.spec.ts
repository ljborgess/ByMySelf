import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  DB_CONNECTION_TIMEOUT_MS,
  DB_STATEMENT_TIMEOUT_MS,
  DRIZZLE,
} from '../database/database.tokens';
import { HealthService } from './health.service';

/**
 * O sha do build é capturado quando o módulo carrega, então aqui vale o que
 * o ambiente de teste tem — `unknown`, já que ninguém passa `GIT_SHA` fora do
 * pipeline. Escrito como a mesma expressão do código, e não como literal,
 * para o teste não passar a mentir se alguém definir a variável no CI.
 */
const EXPECTED_VERSION = process.env.GIT_SHA ?? 'unknown';

describe('HealthService', () => {
  let service: HealthService;
  let execute: jest.Mock;

  beforeEach(async () => {
    execute = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthService, { provide: DRIZZLE, useValue: { execute } }],
    }).compile();

    service = module.get(HealthService);

    // the service logs failures at error level; keep spec output readable
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('reports ok when the database query succeeds', async () => {
    execute.mockResolvedValue(undefined);

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      db: 'ok',
      version: EXPECTED_VERSION,
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('reports error when the database query throws', async () => {
    execute.mockRejectedValue(new Error('connection refused'));

    await expect(service.check()).resolves.toEqual({
      status: 'error',
      db: 'error',
      version: EXPECTED_VERSION,
    });
  });

  /**
   * O pipeline usa este campo para saber que está falando com o container que
   * ele acabou de publicar, e não com a versão anterior — que continua
   * respondendo `ok` durante todo o rollout. Se ele sumir do payload, o
   * portão de deploy passa a aceitar qualquer coisa de pé.
   */
  it('carries the build sha, which the deploy gate matches on', async () => {
    execute.mockResolvedValue(undefined);

    await expect(service.check()).resolves.toMatchObject({
      version: EXPECTED_VERSION,
    });
  });

  it('reports error when the database never answers, via the backstop timeout', async () => {
    jest.useFakeTimers();
    execute.mockReturnValue(new Promise(() => {}));

    const result = service.check();
    await jest.advanceTimersByTimeAsync(
      DB_CONNECTION_TIMEOUT_MS + DB_STATEMENT_TIMEOUT_MS + 1000,
    );

    await expect(result).resolves.toEqual({
      status: 'error',
      db: 'error',
      version: EXPECTED_VERSION,
    });
  });

  it('does not fire its backstop before the driver has had its full budget', async () => {
    jest.useFakeTimers();
    execute.mockReturnValue(new Promise(() => {}));

    const result = service.check();
    let settled = false;
    void result.then(() => {
      settled = true;
    });

    // the driver, not this service, must be what cancels a slow query and
    // releases the pooled client
    await jest.advanceTimersByTimeAsync(
      DB_CONNECTION_TIMEOUT_MS + DB_STATEMENT_TIMEOUT_MS,
    );

    expect(settled).toBe(false);
  });
});
