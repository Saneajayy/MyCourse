'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  apiClient,
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
  getAccessToken,
} from '../lib/api-client';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: string;
  emailVerifiedAt: string | null;
  twoFactorEnabled?: boolean;
}

interface LoginResult {
  requires2FA: boolean;
  tempToken?: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  verify2FA: (tempToken: string, code: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async (): Promise<User | null> => {
    try {
      const data = await apiClient<{ user: User }>('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      clearAccessToken();
      return null;
    }
  }, []);

  // Initialize session on app load via silent refresh
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const token = await refreshAccessToken();
        if (token && mounted) {
          await fetchCurrentUser();
        }
      } catch {
        if (mounted) {
          setUser(null);
          clearAccessToken();
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    const res = await apiClient<{
      requires2FA: boolean;
      tempToken?: string;
      accessToken?: string;
      user?: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    if (res.requires2FA && res.tempToken) {
      return { requires2FA: true, tempToken: res.tempToken };
    }

    if (res.accessToken && res.user) {
      setAccessToken(res.accessToken);
      setUser(res.user);
    }

    return { requires2FA: false };
  };

  const verify2FA = async (tempToken: string, code: string): Promise<void> => {
    const res = await apiClient<{
      accessToken: string;
      user: User;
    }>('/auth/2fa/login', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code }),
      skipAuth: true,
    });

    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ): Promise<void> => {
    const res = await apiClient<{
      accessToken: string;
      user: User;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
      skipAuth: true,
    });

    setAccessToken(res.accessToken);
    setUser(res.user);
  };

  const logout = async (): Promise<void> => {
    try {
      await apiClient('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Continue client cleanup even if network fails
    } finally {
      clearAccessToken();
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<User | null> => {
    if (!getAccessToken()) {
      await refreshAccessToken();
    }
    return fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        verify2FA,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
