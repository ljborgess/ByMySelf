import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { and, eq, isNull } from 'drizzle-orm';
import ms from 'ms';
import { createHash, randomUUID } from 'node:crypto';
import { env } from '../config/env';
import { DRIZZLE } from '../database/database.tokens';
import type { DrizzleDatabase } from '../database/database.tokens';
import { users } from '../users/users.schema';
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

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDatabase,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
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
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessTokenMaxAgeMs = parseDuration(env.JWT_ACCESS_EXPIRATION);
    const accessToken = this.jwt.sign(
      { sub: user.id },
      {
        secret: env.JWT_ACCESS_SECRET,
        expiresIn: env.JWT_ACCESS_EXPIRATION as ms.StringValue,
      },
    );

    const refreshTokenMaxAgeMs = parseDuration(env.JWT_REFRESH_EXPIRATION);
    const familyId = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: user.id, familyId },
      {
        secret: env.JWT_REFRESH_SECRET,
        expiresIn: env.JWT_REFRESH_EXPIRATION as ms.StringValue,
      },
    );

    await this.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: new Date(Date.now() + refreshTokenMaxAgeMs),
    });

    return {
      userId: user.id,
      accessToken,
      accessTokenMaxAgeMs,
      refreshToken,
      refreshTokenMaxAgeMs,
    };
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
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// env.schema.ts only checks JWT_*_EXPIRATION is non-empty, not that it is a
// valid `ms` duration string (e.g. "15m") -- the cast is safe because the
// value is a trusted, operator-controlled env var, not user input.
function parseDuration(value: string): number {
  return ms(value as ms.StringValue);
}
