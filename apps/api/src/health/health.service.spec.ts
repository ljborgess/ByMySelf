import { HealthService } from './health.service';

describe('HealthService', () => {
  it('always reports ok, with the build version', () => {
    const service = new HealthService();

    expect(service.check()).toEqual({ status: 'ok', version: 'unknown' });
  });
});
