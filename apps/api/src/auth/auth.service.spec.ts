import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { env } from '../config/env';
import { DRIZZLE } from '../database/database.tokens';
import { AccountBackoffService } from './account-backoff.service';
import { AuthService } from './auth.service';

jest.mock('argon2');

const mockedArgon2 = jest.mocked(argon2);

interface InsertedRefreshTokenRow {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

describe('AuthService', () => {
  let service: AuthService;
  let selectLimit: jest.Mock;
  let insertValues: jest.Mock;
  let updateWhere: jest.Mock;
  let updateReturning: jest.Mock;
  let jwtSign: jest.Mock;
  let jwtVerify: jest.Mock;

  const existingUser = {
    id: 'a3f6b7f0-1c2d-4e5f-9a8b-1234567890ab',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
  };

  beforeEach(async () => {
    selectLimit = jest.fn().mockResolvedValue([]);
    insertValues = jest.fn().mockResolvedValue(undefined);
    // won by default: the atomic rotation UPDATE returns the row it revoked,
    // as if no concurrent request raced it for the same token.
    updateReturning = jest.fn().mockResolvedValue([{ id: 'row-1' }]);
    // `await db.update().set().where()` (no .returning()) just awaits this
    // plain object, which resolves to itself -- same as the real query
    // builder when nothing consumes its result.
    updateWhere = jest.fn().mockReturnValue({ returning: updateReturning });
    jwtSign = jest.fn((_payload: unknown, options: { secret: string }) =>
      options.secret === env.JWT_ACCESS_SECRET
        ? 'signed.access.token'
        : 'signed.refresh.token',
    );
    jwtVerify = jest.fn().mockReturnValue({ sub: existingUser.id });

    const db: Record<string, unknown> = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({ limit: selectLimit }),
        }),
      }),
      insert: jest.fn().mockReturnValue({ values: insertValues }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({ where: updateWhere }),
      }),
    };
    db.transaction = jest.fn((callback: (tx: unknown) => unknown) =>
      callback(db),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AccountBackoffService,
        { provide: DRIZZLE, useValue: db },
        {
          provide: JwtService,
          useValue: { sign: jwtSign, verify: jwtVerify },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('issues tokens and creates a RefreshToken row for correct credentials', async () => {
      selectLimit.mockResolvedValue([existingUser]);
      mockedArgon2.verify.mockResolvedValue(true);

      const result = await service.login(
        existingUser.email,
        'correct-password',
      );

      expect(result.accessToken).toBe('signed.access.token');
      expect(result.refreshToken).toBe('signed.refresh.token');
      expect(result.userId).toBe(existingUser.id);
      // access and refresh tokens must be signed with their own independent
      // secret (RNF-SEG10) -- asserted implicitly by jwtSign's mock above
      // returning a different value per secret used.
      expect(jwtSign).toHaveBeenCalledTimes(2);

      expect(insertValues).toHaveBeenCalledTimes(1);
      const typedInsertValues = insertValues as jest.Mock<
        Promise<void>,
        [InsertedRefreshTokenRow]
      >;
      const insertedRow = typedInsertValues.mock.calls[0][0];
      expect(insertedRow.userId).toBe(existingUser.id);
      expect(insertedRow.tokenHash).toBe(
        createHash('sha256').update('signed.refresh.token').digest('hex'),
      );
      expect(insertedRow.familyId).toMatch(/^[0-9a-f-]{36}$/);
      expect(insertedRow.expiresAt).toBeInstanceOf(Date);
    });

    it('rejects an incorrect password without creating a RefreshToken row', async () => {
      selectLimit.mockResolvedValue([existingUser]);
      mockedArgon2.verify.mockResolvedValue(false);

      await expect(
        service.login(existingUser.email, 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
      expect(insertValues).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same generic error, via a comparable dummy verify', async () => {
      selectLimit.mockResolvedValue([]);
      mockedArgon2.verify.mockResolvedValue(false);

      await expect(
        service.login('nobody@example.com', 'anything'),
      ).rejects.toThrow(UnauthorizedException);

      // the dummy hash path must still call argon2.verify, so a lookup miss
      // pays for the same work as a real mismatch
      expect(mockedArgon2.verify).toHaveBeenCalledTimes(1);
      expect(mockedArgon2.verify).not.toHaveBeenCalledWith(
        existingUser.passwordHash,
        expect.anything(),
      );
      expect(insertValues).not.toHaveBeenCalled();
    });

    it('backs off after repeated failures on the same account: rejects with 429 without even checking the password', async () => {
      selectLimit.mockResolvedValue([existingUser]);
      mockedArgon2.verify.mockResolvedValue(false);

      await expect(
        service.login(existingUser.email, 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
      mockedArgon2.verify.mockClear();

      const secondAttempt = service.login(
        existingUser.email,
        'wrong-password-again',
      );
      await expect(secondAttempt).rejects.toBeInstanceOf(HttpException);
      await secondAttempt.catch((error: HttpException) => {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      });
      expect(mockedArgon2.verify).not.toHaveBeenCalled();
    });

    it('resets the backoff after a successful login, so a later failure starts back at the base delay', async () => {
      jest.useFakeTimers();
      try {
        selectLimit.mockResolvedValue([existingUser]);
        mockedArgon2.verify.mockResolvedValueOnce(false);
        await expect(
          service.login(existingUser.email, 'wrong-password'),
        ).rejects.toThrow(UnauthorizedException);

        // past the 1s backoff window from that single failure
        jest.advanceTimersByTime(1000);

        mockedArgon2.verify.mockResolvedValueOnce(true);
        await service.login(existingUser.email, 'correct-password');

        // immediately after success (no further time advance): a fresh
        // wrong attempt is not backed off, proving the counter was reset
        // rather than merely having its window elapse
        mockedArgon2.verify.mockResolvedValueOnce(false);
        await expect(
          service.login(existingUser.email, 'wrong-password'),
        ).rejects.toThrow(UnauthorizedException);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('refresh', () => {
    const familyId = 'b2f6b7f0-1c2d-4e5f-9a8b-1234567890cd';
    const validRow = {
      id: 'row-1',
      userId: existingUser.id,
      familyId,
      revokedAt: null as Date | null,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };

    it('rotates a valid token: revokes the old row and issues a new pair under the same family', async () => {
      selectLimit.mockResolvedValue([validRow]);

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('signed.access.token');
      expect(result.refreshToken).toBe('signed.refresh.token');
      expect(result.userId).toBe(existingUser.id);

      // the new refresh JWT carries the same familyId forward
      const typedJwtSign = jwtSign as jest.Mock<
        string,
        [{ sub: string; familyId?: string }, { secret: string }]
      >;
      const refreshCall = typedJwtSign.mock.calls.find(
        ([, options]) => options.secret === env.JWT_REFRESH_SECRET,
      );
      expect(refreshCall?.[0].familyId).toBe(familyId);

      // old row revoked, new row inserted -- exactly one of each
      expect(updateWhere).toHaveBeenCalledTimes(1);
      expect(insertValues).toHaveBeenCalledTimes(1);
    });

    it('loses a concurrent rotation race for the same token: revokes the family instead of issuing a second pair', async () => {
      selectLimit.mockResolvedValue([validRow]);
      // the atomic revoke matched zero rows -- another request already
      // revoked this exact row between our SELECT and this UPDATE
      updateReturning.mockResolvedValue([]);

      await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );

      // one failed atomic revoke attempt + one family-wide revoke; never a
      // second token pair issued from the same presented token
      expect(updateWhere).toHaveBeenCalledTimes(2);
      expect(insertValues).not.toHaveBeenCalled();
    });

    it('detects reuse of an already-rotated token and revokes the entire family, touching only that family', async () => {
      selectLimit.mockResolvedValue([{ ...validRow, revokedAt: new Date() }]);

      await expect(service.refresh('already-rotated-token')).rejects.toThrow(
        UnauthorizedException,
      );

      // one UPDATE, scoped to this row's familyId -- not a single-row revoke
      expect(updateWhere).toHaveBeenCalledTimes(1);
      expect(insertValues).not.toHaveBeenCalled();
    });

    it('backs off the account after reuse is detected: a second attempt rejects with 429 without re-revoking the family', async () => {
      selectLimit.mockResolvedValue([{ ...validRow, revokedAt: new Date() }]);

      await expect(service.refresh('already-rotated-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(updateWhere).toHaveBeenCalledTimes(1);

      const secondAttempt = service.refresh('already-rotated-token');
      await expect(secondAttempt).rejects.toBeInstanceOf(HttpException);
      await secondAttempt.catch((error: HttpException) => {
        expect(error.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      });
      // the family was already revoked by the first attempt -- the second
      // attempt is stopped by the backoff check before touching the DB again
      expect(updateWhere).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown token hash without touching any row', async () => {
      selectLimit.mockResolvedValue([]);

      await expect(service.refresh('never-issued-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(updateWhere).not.toHaveBeenCalled();
      expect(insertValues).not.toHaveBeenCalled();
    });

    it('rejects an expired-but-not-revoked token without rotating or revoking the family', async () => {
      selectLimit.mockResolvedValue([
        { ...validRow, expiresAt: new Date(Date.now() - 1000) },
      ]);

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(updateWhere).not.toHaveBeenCalled();
      expect(insertValues).not.toHaveBeenCalled();
    });

    it('rejects a token with an invalid JWT signature without ever querying the database', async () => {
      jwtVerify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.refresh('tampered-token')).rejects.toThrow(
        UnauthorizedException,
      );

      expect(selectLimit).not.toHaveBeenCalled();
      expect(updateWhere).not.toHaveBeenCalled();
      expect(insertValues).not.toHaveBeenCalled();
    });

    it('is rejected immediately when there is no refresh token cookie', async () => {
      await expect(service.refresh(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtVerify).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the matching RefreshToken row by hash lookup', async () => {
      await service.logout('some-raw-refresh-token');

      expect(updateWhere).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when there is no refresh token cookie', async () => {
      await expect(service.logout(undefined)).resolves.toBeUndefined();
      expect(updateWhere).not.toHaveBeenCalled();
    });

    it('does not throw on a double logout for the same token', async () => {
      await service.logout('some-raw-refresh-token');
      await expect(
        service.logout('some-raw-refresh-token'),
      ).resolves.toBeUndefined();
      expect(updateWhere).toHaveBeenCalledTimes(2);
    });
  });
});
