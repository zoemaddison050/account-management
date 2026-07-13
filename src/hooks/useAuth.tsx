import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import type { AuthSession, MagicLinkRequest, MagicLinkVerify } from '../types';
import { requestMagicLink as apiRequestMagicLink, verifyMagicLink as apiVerifyMagicLink, logout as apiLogout } from '../lib/api';

const SESSION_KEY = 'prime-exchanges.session';

function loadSession(): AuthSession | null {
  try {
    // Check both stores — the user may have logged in with remember=true
    // previously, or without it (sessionStorage only).
    for (const storage of [localStorage, sessionStorage]) {
      const raw = storage.getItem(SESSION_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as AuthSession;
      // Check expiry
      if (new Date(parsed.expiresAt).getTime() < Date.now()) {
        storage.removeItem(SESSION_KEY);
        continue;
      }
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession, remember: boolean) {
  const storage = remember ? localStorage : sessionStorage;
  // Clear the other store to avoid stale sessions
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(SESSION_KEY);
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  requestMagicLink: (payload: MagicLinkRequest) => Promise<{ email: string; expiresInMinutes: number }>;
  verifyMagicLink: (payload: MagicLinkVerify) => Promise<AuthSession>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    setSession(loadSession());
  }, []);

  const requestMagicLink = useCallback(async (payload: MagicLinkRequest): Promise<{ email: string; expiresInMinutes: number }> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequestMagicLink(payload);
      return result;
    } catch (err: unknown) {
      let message = 'Unable to send sign-in code. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('429')) {
          message = 'Too many sign-in attempts. Please wait a few minutes and try again.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          message = 'Unable to reach the server. Please check your connection and try again.';
        }
      }
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyMagicLink = useCallback(async (payload: MagicLinkVerify): Promise<AuthSession> => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiVerifyMagicLink(payload);
      saveSession(result, payload.remember ?? false);
      setSession(result);
      return result;
    } catch (err: unknown) {
      let message = 'Sign in failed. Please try again.';
      if (err instanceof Error) {
        // Parse HTTP error codes from apiFetch's error format: "API 401: ..."
        if (err.message.includes('401')) {
          message = 'Invalid or expired code. Please check your code and try again.';
        } else if (err.message.includes('429')) {
          message = 'Too many sign-in attempts. Please wait a few minutes and try again.';
        } else if (err.message.includes('403')) {
          message = 'Your account is not authorized to access the client portal. Contact support if you believe this is an error.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          message = 'Unable to reach the server. Please check your connection and try again.';
        }
      }
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setError(null);
    // Best-effort server-side revocation
    void apiLogout();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextValue = {
    session,
    isAuthenticated: session !== null,
    loading,
    error,
    requestMagicLink,
    verifyMagicLink,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
