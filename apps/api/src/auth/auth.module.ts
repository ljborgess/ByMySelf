import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  // No default secret/expiry: login signs the access token with an explicit
  // secret+expiresIn per call, since access and refresh tokens use
  // independent secrets (RNF-SEG10).
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
