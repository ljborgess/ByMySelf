import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { CookieOptions, Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { env } from '../config/env';
import { AuthService, LoginResult } from './auth.service';

function mockResponse(): {
  response: Response;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
} {
  const cookie = jest.fn();
  const clearCookie = jest.fn();
  const response = { cookie, clearCookie } as unknown as Response;
  return { response, cookie, clearCookie };
}

describe('AuthController', () => {
  let controller: AuthController;
  let login: jest.Mock;
  let refresh: jest.Mock;
  let logout: jest.Mock;

  const loginResult: LoginResult = {
    userId: 'a3f6b7f0-1c2d-4e5f-9a8b-1234567890ab',
    accessToken: 'access-token-value',
    accessTokenMaxAgeMs: 900_000,
    refreshToken: 'refresh-token-value',
    refreshTokenMaxAgeMs: 2_592_000_000,
  };

  beforeEach(async () => {
    login = jest.fn();
    refresh = jest.fn();
    logout = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { login, refresh, logout } },
      ],
    })
      // these tests call controller methods directly, bypassing Nest's HTTP
      // pipeline entirely -- @UseGuards(ThrottlerGuard) is still resolved as
      // part of building the DI container, so it needs a stand-in here even
      // though it never actually runs in this test style.
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  describe('login', () => {
    it('sets HttpOnly, Secure, SameSite=Strict cookies for both tokens on success', async () => {
      login.mockResolvedValue(loginResult);
      const { response, cookie } = mockResponse();

      const body = await controller.login(
        { email: 'admin@example.com', password: 'correct-password' },
        response,
      );

      expect(body).toEqual({ status: 'ok' });
      expect(login).toHaveBeenCalledWith(
        'admin@example.com',
        'correct-password',
      );

      expect(cookie).toHaveBeenCalledWith(
        'access_token',
        loginResult.accessToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: loginResult.accessTokenMaxAgeMs,
        }),
      );
      expect(cookie).toHaveBeenCalledWith(
        'refresh_token',
        loginResult.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: loginResult.refreshTokenMaxAgeMs,
        }),
      );
    });

    it('propagates the rejection from AuthService without setting cookies', async () => {
      login.mockRejectedValue(new Error('Invalid credentials'));
      const { response, cookie } = mockResponse();

      await expect(
        controller.login(
          { email: 'admin@example.com', password: 'wrong' },
          response,
        ),
      ).rejects.toThrow('Invalid credentials');

      expect(cookie).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('reads the refresh token cookie and sets new rotated cookies on success', async () => {
      refresh.mockResolvedValue(loginResult);
      const { response, cookie } = mockResponse();
      const request = {
        cookies: { refresh_token: 'old-refresh-token' },
      } as unknown as Request;

      const body = await controller.refresh(request, response);

      expect(body).toEqual({ status: 'ok' });
      expect(refresh).toHaveBeenCalledWith('old-refresh-token');
      expect(cookie).toHaveBeenCalledWith(
        'access_token',
        loginResult.accessToken,
        expect.any(Object),
      );
      expect(cookie).toHaveBeenCalledWith(
        'refresh_token',
        loginResult.refreshToken,
        expect.any(Object),
      );
    });

    it('propagates the rejection from AuthService without setting cookies', async () => {
      refresh.mockRejectedValue(new Error('Invalid refresh token'));
      const { response, cookie } = mockResponse();
      const request = { cookies: {} } as unknown as Request;

      await expect(controller.refresh(request, response)).rejects.toThrow(
        'Invalid refresh token',
      );
      expect(cookie).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('reads the refresh token cookie, revokes it, and clears both cookies', async () => {
      logout.mockResolvedValue(undefined);
      const { response, clearCookie } = mockResponse();
      const request = {
        cookies: { refresh_token: 'raw-refresh-token' },
      } as unknown as Request;

      const body = await controller.logout(request, response);

      expect(body).toEqual({ status: 'ok' });
      expect(logout).toHaveBeenCalledWith('raw-refresh-token');
      expect(clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.any(Object),
      );
      expect(clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.any(Object),
      );
    });

    it('clears cookies even when no refresh token cookie is present', async () => {
      logout.mockResolvedValue(undefined);
      const { response, clearCookie } = mockResponse();
      const request = { cookies: {} } as unknown as Request;

      await controller.logout(request, response);

      expect(logout).toHaveBeenCalledWith(undefined);
      expect(clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * `Domain=localhost` é um domínio de rótulo único, e browsers divergem
   * sobre aceitá-lo. Quando um descarta o cookie, o login responde 200 sem
   * sessão nenhuma e o painel volta para a tela de login sem nada explicando
   * o porquê — foi exatamente o sintoma visto rodando isto localmente.
   *
   * Host-only é o que um cookie de loopback deveria ser de qualquer forma:
   * não há subdomínio com quem compartilhar.
   */
  describe('escopo de domínio', () => {
    it('omits Domain on loopback, leaving the cookie host-only', async () => {
      // o .env de dev e o de teste usam localhost; se isso mudar, o teste
      // abaixo estaria medindo outra coisa
      expect(env.COOKIE_DOMAIN.toLowerCase()).toBe('localhost');

      login.mockResolvedValue(loginResult);
      const { response, cookie } = mockResponse();

      await controller.login(
        { email: 'admin@example.com', password: 'correct-password' },
        response,
      );

      const options = cookie.mock.calls.map(
        (call: unknown[]) => call[2] as CookieOptions,
      );
      expect(options).not.toHaveLength(0);
      for (const option of options) {
        expect(option).not.toHaveProperty('domain');
      }
    });

    it('still clears cookies with the same options it set them with', async () => {
      // opções divergentes entre set e clear fazem o browser tratar como
      // outro cookie, e o antigo sobreviveria ao logout
      logout.mockResolvedValue(undefined);
      const { response, clearCookie } = mockResponse();

      await controller.logout({ cookies: {} } as unknown as Request, response);

      const options = clearCookie.mock.calls.map(
        (call: unknown[]) => call[1] as CookieOptions,
      );
      expect(options).not.toHaveLength(0);
      for (const option of options) {
        expect(option).not.toHaveProperty('domain');
        expect(option).toMatchObject({ httpOnly: true, secure: true });
      }
    });
  });
});
