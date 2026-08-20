import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CsrfGuard } from './common/csrf.guard';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ProjectsModule } from './projects/projects.module';

@Module({
  imports: [DatabaseModule, HealthModule, AuthModule, ProjectsModule],
  controllers: [AppController],
  providers: [
    AppService,
    // RNF-SEG3: global, not just auth routes -- see CsrfGuard's own comment.
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
})
export class AppModule {}
