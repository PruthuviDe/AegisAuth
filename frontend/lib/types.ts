// =============================================================================
// API Types — Shared between API client and components
// =============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
  isTwoFactorEnabled?: boolean;
}

export interface AuthResponse {
  user: Omit<User, "isActive" | "createdAt" | "updatedAt">;
  accessToken: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
  timestamp: string;
  path: string;
}
