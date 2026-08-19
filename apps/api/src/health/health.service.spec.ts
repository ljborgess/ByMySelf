import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../database/database.tokens';
import { HealthService } from './health.service';

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
    });
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('reports error when the database query throws', async () => {
    execute.mockRejectedValue(new Error('connection refused'));

    await expect(service.check()).resolves.toEqual({
      status: 'error',
      db: 'error',
    });
  });

  it('reports error when the database query exceeds the timeout', async () => {
    jest.useFakeTimers();
    execute.mockReturnValue(new Promise(() => {}));

    const result = service.check();
    await jest.advanceTimersByTimeAsync(2000);

    await expect(result).resolves.toEqual({ status: 'error', db: 'error' });
  });
});
