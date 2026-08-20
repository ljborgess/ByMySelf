import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { setupSwagger } from './swagger';

describe('setupSwagger', () => {
  const app = {} as INestApplication;
  let setupSpy: jest.SpyInstance;

  beforeEach(() => {
    jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue({} as OpenAPIObject);
    setupSpy = jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => {
      return app;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not register Swagger routes in production', () => {
    setupSwagger(app, 'production');

    expect(setupSpy).not.toHaveBeenCalled();
  });

  it('registers Swagger routes outside production', () => {
    setupSwagger(app, 'development');

    expect(setupSpy).toHaveBeenCalledTimes(1);
    expect(setupSpy).toHaveBeenCalledWith('docs', app, expect.anything());
  });

  it('registers Swagger routes in the test environment too', () => {
    setupSwagger(app, 'test');

    expect(setupSpy).toHaveBeenCalledTimes(1);
  });
});
