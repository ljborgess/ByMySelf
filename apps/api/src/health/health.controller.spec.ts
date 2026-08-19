import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let check: jest.Mock;

  beforeEach(async () => {
    check = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
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
