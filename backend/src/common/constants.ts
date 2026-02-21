// =============================================================================
// Application Constants
// =============================================================================
// WHY centralized constants: Avoids magic strings scattered across the codebase.
// Single source of truth for token prefixes, default roles, etc.
// =============================================================================

export const AUTH_CONSTANTS = {
  /** Redis key prefix for refresh tokens */
  REFRESH_TOKEN_PREFIX: 'refresh_token:',
  /** Redis key prefix for email verification tokens */
  EMAIL_VERIFY_PREFIX: 'email_verify:',
  /** Redis key prefix for password reset tokens */
  PASSWORD_RESET_PREFIX: 'password_reset:',
  /** Redis key prefix for rate limiting */
  RATE_LIMIT_PREFIX: 'rate_limit:',
  /** Default expiry for email verification tokens (24 hours in seconds) */
  EMAIL_VERIFY_TTL: 86400,
  /** Default expiry for password reset tokens (1 hour in seconds) */
  PASSWORD_RESET_TTL: 3600,
} as const;

export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
} as const;

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'aegis_access_token',
  REFRESH_TOKEN: 'aegis_refresh_token',
} as const;
