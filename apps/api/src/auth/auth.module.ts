import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AccountBackoffService } from './account-backoff.service';
import {
  AUTH_IP_THROTTLE_LIMIT,
  AUTH_IP_THROTTLE_NAME,
  AUTH_IP_THROTTLE_TTL_MS,
  PUBLIC_READ_THROTTLE_LIMIT,
  PUBLIC_READ_THROTTLE_NAME,
  PUBLIC_READ_THROTTLE_TTL_MS,
} from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [
    // No default secret/expiry: login signs the access token with an
    // explicit secret+expiresIn per call, since access and refresh tokens
    // use independent secrets (RNF-SEG10).
    JwtModule.register({}),
    // Two named per-IP fixed-window buckets, both applied per handler via
    // @UseGuards(ThrottlerGuard) + @Throttle rather than globally, so /health
    // stays unlimited: a tight one for login/refresh, and a much looser one
    // for the public reads. A handler opts into exactly one by name.
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
  controllers: [AuthController],
  providers: [
    AuthService,
    AccountBackoffService,
    // APP_GUARD makes this global (RF-AUT4) -- see AuthGuard's own comment
    // for why that's safe for every non-/admin route.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
