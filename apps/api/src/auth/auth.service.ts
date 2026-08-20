import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import ms from 'ms';
import { createHash, randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { DRIZZLE } from '../database/database.tokens';
import type { DrizzleDatabase } from '../database/database.tokens';
import { users } from '../users/users.schema';
import { AccountBackoffService } from './account-backoff.service';
import { refreshTokens } from './refresh-token.schema';

/**
 * Precomputed Argon2id hash of an arbitrary fixed value, verified against the
 * submitted password whenever no user matches the email. Without this, a
 * lookup miss would return immediately while a wrong-password attempt pays
 * for a real argon2.verify() call -- the timing gap alone lets an attacker
 * enumerate which emails have an account without ever seeing a different
 * response body.
 */
const DUMMY_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$GKVex5yU84EC86Sn9w0l7Q$mcc9U0kNvD49cXEdn/eym8NbWneDxDPbppNRcPNRJuA';

export interface LoginResult {
  userId: string;
  accessToken: string;
  accessTokenMaxAgeMs: number;
  refreshToken: string;
  refreshTokenMaxAgeMs: number;
}

// The callback param of DrizzleDatabase['transaction'] -- issueTokenPair
// runs its INSERT against either the top-level db or a transaction handed
// in by refresh(), so it needs a type covering both call sites.
type Tx = Parameters<Parameters<DrizzleDatabase['transaction']>[0]>[0];

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    private readonly jwt: JwtService,
    private readonly accountBackoff: AccountBackoffService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    rejectIfBackingOff(this.accountBackoff, email);

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const passwordMatches = await argon2.verify(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      password,
    );

    if (!user || !passwordMatches) {
      this.accountBackoff.recordFailure(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.accountBackoff.recordSuccess(email);
    return this.issueTokenPair(user.id, randomUUID());
  }

  /**
   * Rotates a refresh token: the presented token must have a valid JWT
   * signature and match a RefreshToken row that is neither expired nor
   * already revoked. Any failure -- garbage token, unknown hash, expired,
   * already-revoked -- rejects with the same generic 401.
   *
   * A row that is *already revoked* is the reuse case: this exact token was
   * legitimately issued and already rotated away once, so its reappearance
   * means it leaked and someone else is replaying it. The entire family is
   * revoked, not just this attempt, since the legitimate owner's current
   * token (and every other token in the chain) must be assumed compromised
   * too.
   */
  async refresh(refreshToken: string | undefined): Promise<LoginResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    try {
      this.jwt.verify(refreshToken, { secret: env.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)))
      .limit(1);

    if (!row) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Keyed by the resolved account (not available until here) rather than
    // the presented token itself -- repeated reuse attempts against the
    // same account share this backoff regardless of which token they
    // present it with.
    rejectIfBackingOff(this.accountBackoff, row.userId);

    if (row.revokedAt) {
      // reuse of an already-rotated token is the one refresh failure mode
      // that is actual evidence of compromise, not mere staleness -- see
      // the account-wide family revoke just below.
      this.accountBackoff.recordFailure(row.userId);
      await this.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(refreshTokens.familyId, row.familyId),
            isNull(refreshTokens.revokedAt),
          ),
        );
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (row.expiresAt <= new Date()) {
      // plain expiry is not an attack signal -- does not count against the
      // account's backoff, unlike reuse of an already-revoked token above.
      throw new UnauthorizedException('Invalid refresh token');
    }

    const result = await this.db.transaction(async (tx) => {
      // Guarded by `isNull(revokedAt)` and read back via RETURNING so the
      // revoke is atomic: if a concurrent refresh call already won this
      // exact row between our SELECT above and this UPDATE, it comes back
      // empty here instead of both requests treating the token as valid and
      // each minting an independent pair from a single presented token.
      const revoked = await tx
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(
          and(eq(refreshTokens.id, row.id), isNull(refreshTokens.revokedAt)),
        )
        .returning({ id: refreshTokens.id });

      if (revoked.length === 0) {
        this.accountBackoff.recordFailure(row.userId);
        await tx
          .update(refreshTokens)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(refreshTokens.familyId, row.familyId),
              isNull(refreshTokens.revokedAt),
            ),
          );
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.issueTokenPair(row.userId, row.familyId, tx);
    });

    // outside the transaction: only reset the backoff once rotation has
    // actually committed, not the moment the callback returns.
    this.accountBackoff.recordSuccess(row.userId);
    return result;
  }

  /**
   * A double logout (already revoked, or a cookie for a row that no longer
   * exists) must not throw -- the WHERE simply matches zero rows and the
   * UPDATE is a no-op.
   */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(refreshTokens.tokenHash, hashToken(refreshToken)),
          isNull(refreshTokens.revokedAt),
        ),
      );
  }

  /**
   * Shared by login (new familyId) and refresh (same familyId carried
   * forward) -- issuing a pair always means: sign both JWTs, persist the new
   * RefreshToken row under its hash, hand back everything the controller
   * needs to set both cookies.
   */
  private async issueTokenPair(
    userId: string,
    familyId: string,
    db: DrizzleDatabase | Tx = this.db,
  ): Promise<LoginResult> {
    const accessTokenMaxAgeMs = parseDuration(env.JWT_ACCESS_EXPIRATION);
    const accessToken = this.jwt.sign(
      { sub: userId },
      {
        secret: env.JWT_ACCESS_SECRET,
        expiresIn: env.JWT_ACCESS_EXPIRATION as ms.StringValue,
      },
    );

    const refreshTokenMaxAgeMs = parseDuration(env.JWT_REFRESH_EXPIRATION);
    const refreshToken = this.jwt.sign(
      { sub: userId, familyId },
      {
        secret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_REFRESH_EXPIRATION as ms.StringValue,
      },
    );

    await db.insert(refreshTokens).values({
      userId,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
    });

    return {
      userId,
      accessToken,
      accessTokenMaxAgeMs,
      refreshToken,
      refreshTokenMaxAgeMs,
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function rejectIfBackingOff(
  accountBackoff: AccountBackoffService,
  key: string,
): void {
  if (accountBackoff.getRetryAfterMs(key) > 0) {
    throw new HttpException(
      'Too many attempts, try again later',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// env.schema.ts validates JWT_*_EXPIRATION is a parseable `ms` duration
// string at startup, so this cast is guaranteed safe by the time env exists.
function parseDuration(value: string): number {
  return ms(value as ms.StringValue);
}
