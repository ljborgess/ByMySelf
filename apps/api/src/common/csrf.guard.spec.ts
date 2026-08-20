import {
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { CsrfGuard } from './csrf.guard';

@Controller()
class TestController {
  @Get('safe')
  getSafe(): { ok: boolean } {
    return { ok: true };
  }

  @Post('mutate')
  postMutate(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({
  controllers: [TestController],
  providers: [{ provide: APP_GUARD, useClass: CsrfGuard }],
})
class TestModule {}

describe('CsrfGuard', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [TestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows a GET request through with no CSRF header at all', () => {
    return request(app.getHttpServer()).get('/safe').expect(200);
  });

  it('rejects a mutating request with no CSRF header', () => {
    return request(app.getHttpServer()).post('/mutate').expect(403);
  });

  it('rejects a mutating request with the wrong header value', () => {
    return request(app.getHttpServer())
      .post('/mutate')
      .set('X-Requested-With', 'something-else')
      .expect(403);
  });

  it('allows a mutating request through when the CSRF header is present', () => {
    return request(app.getHttpServer())
      .post('/mutate')
      .set('X-Requested-With', 'XMLHttpRequest')
      .expect(201); // Nest's default status for POST, unrelated to the guard
  });
});
