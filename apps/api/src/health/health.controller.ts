import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService, HealthStatus } from './health.service';

/**
 * Readiness probe for the deploy orchestrator.
 *
 * Contract (docs/arquitetura.md): no authentication, no rate limiting — when
 * the global JWT guard and the throttler land in the Auth epic, this route
 * must be explicitly excluded from both, or infrastructure checks start
 * failing against a healthy app.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const health = await this.healthService.check();

    if (health.status !== 'ok') {
      throw new ServiceUnavailableException(health);
    }

    return health;
  }
}
