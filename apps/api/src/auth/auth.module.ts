import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  // No default secret/expiry: login signs the access token with an explicit
  // secret+expiresIn per call, since access and refresh tokens use
  // independent secrets (RNF-SEG10).
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    // APP_GUARD makes this global (RF-AUT4) -- see AuthGuard's own comment
    // for why that's safe for every non-/admin route.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
