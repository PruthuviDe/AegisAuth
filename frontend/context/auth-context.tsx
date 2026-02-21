"use client";

// =============================================================================
// AuthContext — Global Auth State Management
// =============================================================================
// WHY context + access token in memory: 
// - Access token never touches localStorage (XSS safe)
// - Context provides reactive state for components
// - Refresh token lives in HTTP-only cookie (handled by backend)
// =============================================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, setAccessToken, clearAccessToken } from "@/lib/api";
import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // On mount: try to restore session using the refresh token cookie
  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const { data } = await authApi.refresh();
      setAccessToken(data.data.accessToken);
      const userResp = await authApi.getMe();
      setState({ user: userResp.data.data, isLoading: false, isAuthenticated: true });
    } catch {
      // No valid session — user needs to log in
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authApi.login({ email, password });
    setAccessToken(data.data.accessToken);
    const userResp = await authApi.getMe();
    setState({ user: userResp.data.data, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(
    async (formData: { email: string; password: string; firstName?: string; lastName?: string }) => {
      const { data } = await authApi.register(formData);
      setAccessToken(data.data.accessToken);
      const userResp = await authApi.getMe();
      setState({ user: userResp.data.data, isLoading: false, isAuthenticated: true });
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAccessToken();
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authApi.getMe();
    setState((prev) => ({ ...prev, user: data.data }));
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
