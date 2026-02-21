// =============================================================================
// JWT Strategy — Passport Strategy for Access Token Validation
// =============================================================================
// WHY Passport: Industry-standard auth middleware with extensible strategies.
// WHY extract from cookie OR header: Supports both SPA (cookie) and API
// (Bearer) clients with one strategy.
// =============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../../../common/interfaces';
import { COOKIE_NAMES } from '../../../common/constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      // Try cookie first, then Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.[COOKIE_NAMES.ACCESS_TOKEN] || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') || 'fallback-secret',
    });
  }

  // WHY validate: Passport calls this after verifying the JWT signature.
  // The returned object becomes req.user in controllers.
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return payload;
  }
}
