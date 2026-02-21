// =============================================================================
// JwtAuthGuard — Protects Routes Requiring Authentication
// =============================================================================
// WHY a custom guard: Extends Passport's AuthGuard to provide better error
// messages and allow future customization (e.g., checking isActive flag).
// =============================================================================

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    _info: any,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
