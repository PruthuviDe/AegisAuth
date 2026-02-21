// =============================================================================
// TokensService — JWT + Refresh Token Management
// =============================================================================
// WHY this architecture:
// - Access tokens (15min): Stateless, validated by signature only. Fast.
// - Refresh tokens (7d): Stateful, stored in Redis + DB. Enables revocation.
// - On refresh: old token is revoked, new pair is issued (token rotation).
// - Token rotation prevents replay attacks if a refresh token is stolen.
// =============================================================================

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma';
import { RedisService } from '../../redis';
import {
  JwtPayload,
  TokenPair,
} from '../../common/interfaces';
import { AUTH_CONSTANTS } from '../../common/constants';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Generate Token Pair ──────────────────────────────────────────────────
  async generateTokenPair(
    userId: string,
    email: string,
    roles: string[],
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, roles),
      this.generateRefreshToken(userId, email, roles, metadata),
    ]);

    return { accessToken, refreshToken };
  }

  // ── Generate Access Token ────────────────────────────────────────────────
  private async generateAccessToken(
    userId: string,
    email: string,
    roles: string[],
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      roles,
      type: 'access',
    };

    return this.jwtService.signAsync(payload as any, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
    });
  }

  // ── Generate Refresh Token ───────────────────────────────────────────────
  private async generateRefreshToken(
    userId: string,
    email: string,
    roles: string[],
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<string> {
    const tokenId = uuidv4();
    const expiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRATION',
      '7d',
    );

    const payload: JwtPayload = {
      sub: userId,
      email,
      roles,
      type: 'refresh',
    };

    const token = await this.jwtService.signAsync(
      { ...payload, jti: tokenId } as any,
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: expiresIn as any,
      },
    );

    // Calculate expiry date from duration string
    const expiresAt = this.calculateExpiry(expiresIn);

    // Store in database (source of truth for revocation)
    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        token,
        userId,
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        expiresAt,
      },
    });

    // Cache in Redis for fast lookup (TTL auto-expires)
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    await this.redis.set(
      `${AUTH_CONSTANTS.REFRESH_TOKEN_PREFIX}${tokenId}`,
      JSON.stringify({ userId, token }),
      ttlSeconds,
    );

    return token;
  }

  // ── Verify Access Token ──────────────────────────────────────────────────
  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  // ── Refresh Tokens (Token Rotation) ──────────────────────────────────────
  // WHY rotation: If a refresh token is stolen, the attacker can only use it
  // once. The real user's next refresh attempt will fail (token already
  // revoked), alerting them to the compromise.
  async refreshTokens(
    currentRefreshToken: string,
    metadata?: { userAgent?: string; ipAddress?: string },
  ): Promise<TokenPair> {
    let payload: JwtPayload & { jti: string };

    try {
      payload = await this.jwtService.verifyAsync(currentRefreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if token exists and is not revoked
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });

    if (!storedToken || storedToken.isRevoked) {
      // Possible token reuse attack — revoke ALL user tokens
      if (storedToken?.isRevoked) {
        this.logger.warn(
          `Potential token reuse attack for user ${payload.sub}`,
        );
        await this.revokeAllUserTokens(payload.sub);
      }
      throw new UnauthorizedException('Token has been revoked');
    }

    // Revoke the current refresh token
    await this.revokeToken(payload.jti);

    // Issue new token pair
    return this.generateTokenPair(
      payload.sub,
      payload.email,
      payload.roles,
      metadata,
    );
  }

  // ── Revoke Single Token ──────────────────────────────────────────────────
  async revokeToken(tokenId: string): Promise<void> {
    await Promise.all([
      this.prisma.refreshToken.update({
        where: { id: tokenId },
        data: { isRevoked: true },
      }),
      this.redis.del(`${AUTH_CONSTANTS.REFRESH_TOKEN_PREFIX}${tokenId}`),
    ]);
  }

  // ── Revoke All User Tokens (logout everywhere) ──────────────────────────
  async revokeAllUserTokens(userId: string): Promise<void> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId, isRevoked: false },
      select: { id: true },
    });

    await Promise.all([
      this.prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      }),
      ...tokens.map((t) =>
        this.redis.del(`${AUTH_CONSTANTS.REFRESH_TOKEN_PREFIX}${t.id}`),
      ),
    ]);

    this.logger.log(`All tokens revoked for user ${userId}`);
  }

  // ── Helper: Parse duration string to Date ────────────────────────────────
  private calculateExpiry(duration: string): Date {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}
