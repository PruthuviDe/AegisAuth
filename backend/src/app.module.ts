// =============================================================================
// AppModule — Root Module
// =============================================================================
// WHY this structure:
// - ConfigModule.forRoot(): Loads .env globally — available everywhere via DI.
// - ThrottlerModule: Global rate limiting to prevent brute-force attacks.
// - PrismaModule & RedisModule: Global infrastructure, imported once here.
// - Feature modules will be added as they're built.
// =============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma';
import { RedisModule } from './redis';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // ── Rate Limiting ──────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
      },
    ]),

    // ── Infrastructure ─────────────────────────────────────────────────
    PrismaModule,
    RedisModule,

    // ── Feature Modules ────────────────────────────────────────────────
    AuthModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
