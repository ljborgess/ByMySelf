import { Controller, Get, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { HealthService } from './health.service';
import type { HealthStatus } from './health.service';

/**
 * Readiness probe for the deploy orchestrator.
 *
 * Contract (docs/arquitetura.md): no authentication — the orchestrator has no
 * session to present.
 *
 * On the loose `public-read` bucket, same as `/projects`: the container's own
 * HEALTHCHECK (every 30s), Dokploy's rollout probe and the CI's post-deploy
 * poll (every 5s for up to 5 minutes) all have to pass comfortably.
 */
@UseGuards(ThrottlerGuard)
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check(): HealthStatus {
    return this.healthService.check();
  }
}
