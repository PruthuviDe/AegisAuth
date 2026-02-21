// =============================================================================
// @Roles() Decorator
// =============================================================================
// WHY SetMetadata: Attaches required roles as metadata to the route handler.
// RolesGuard reads this metadata at request time to enforce access control.
// =============================================================================

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a route or controller.
 * @example @Roles('admin')
 * @example @Roles('admin', 'moderator')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
