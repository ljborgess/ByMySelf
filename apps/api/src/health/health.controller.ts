import {
  Controller,
  Get,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { AUTH_IP_THROTTLE_NAME } from '../auth/auth.constants';
import { HealthService, HealthStatus } from './health.service';

/**
 * Readiness probe for the deploy orchestrator.
 *
 * Contract (docs/arquitetura.md): no authentication — the orchestrator has no
 * session to present, and gating this behind auth would make an unhealthy app
 * indistinguishable from an unauthorized probe.
 *
 * Rate limiting, though, it does get. The original contract said "no rate
 * limiting" and that was right while the API answered only on a private
 * network. The Deploy epic put it on a public domain (issue #37), and this
 * route runs `select 1` against Postgres on every call -- unauthenticated,
 * uncached and previously unbounded, which is a straight amplification path
 * into the database.
 *
 * On the loose `public-read` bucket, not the strict auth one: the limit has
 * to stay far above any legitimate probe rate. The container's own
 * HEALTHCHECK (every 30s), Dokploy's rollout probe and the CI's post-deploy
 * poll (every 5s for up to 5 minutes) all have to pass comfortably -- a 429
 * to those reads as "unhealthy" and would trigger a restart loop. They also
 * key on their own IPs, so an external flood cannot exhaust their budget.
 */
@SkipThrottle({ [AUTH_IP_THROTTLE_NAME]: true })
@UseGuards(ThrottlerGuard)
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
