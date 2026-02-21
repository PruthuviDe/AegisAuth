// =============================================================================
// JWT Payload Interface
// =============================================================================
// WHY typed payloads: Ensures consistency between token creation and
// verification. TypeScript catches mismatches at compile time.
// =============================================================================

export interface JwtPayload {
  /** User's UUID */
  sub: string;
  /** User's email */
  email: string;
  /** User's roles */
  roles: string[];
  /** Token type: 'access' or 'refresh' */
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    isEmailVerified: boolean;
    roles: string[];
  };
  tokens: TokenPair;
}
