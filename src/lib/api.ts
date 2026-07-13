import type { AccountManager, AuthSession, MagicLinkRequest, MagicLinkVerify, ClientProfile } from '../types';
import { accountManagers, demoClient } from '../data/mockData';

/**
 * Base URL for the portal API server.
 *
 * In production this is the same origin as the SPA (e.g. `https://accounts.primexchanges.com/api`).
 * During local development it can be set via `VITE_API_BASE_URL` in a `.env` file,
 * or left unset to use the built-in mock-data fallback.
 *
 * Per MONSTERASP_INTEGRATION.md the preferred production shape is an ASP.NET Core
 * application that serves both the compiled React files and `/api` from the same origin,
 * avoiding CORS complexity.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const SESSION_KEY = 'prime-exchanges.session';

/**
 * Whether the API client will attempt real network calls.
 * When false, all fetch helpers return synthetic demo data immediately.
 */
export const isApiConfigured = API_BASE_URL !== '';

/**
 * Reads the current JWT token from local/session storage.
 * Returns null when the user is not authenticated or the session has expired.
 */
function getAuthToken(): string | null {
  try {
    for (const storage of [localStorage, sessionStorage]) {
      const raw = storage.getItem(SESSION_KEY);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as AuthSession;
      if (new Date(parsed.expiresAt).getTime() < Date.now()) {
        storage.removeItem(SESSION_KEY);
        continue;
      }
      return parsed.token;
    }
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

/**
 * Wrapper around `fetch` that prepends the configured API base URL,
 * attaches the JWT Authorization header when a session exists, and
 * parses JSON. Throws on non-2xx responses.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} for ${path}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Fetches the list of approved account managers from the server.
 *
 * The server endpoint `GET /api/managers` should return managers that are
 * currently active and accepting new client assignments. In production the
 * server enforces access control — only managers approved for public display
 * should appear here.
 *
 * When no API base URL is configured (local prototype, no backend) the call
 * falls back to the synthetic demo roster so the UI remains functional.
 */
export async function getManagers(): Promise<AccountManager[]> {
  if (!isApiConfigured) {
    return accountManagers;
  }
  return apiFetch<AccountManager[]>('/managers');
}

/**
 * Requests a magic-link / OTP email for the given address.
 *
 * The server endpoint `POST /api/auth/magic-link` should:
 *   - validate the email format
 *   - check that the email belongs to an approved/pending client
 *   - generate a short-lived single-use token
 *   - send an email containing the token / magic link
 *
 * When no API base URL is configured the call falls back to a simulated
 * request so the UI flow remains testable locally.
 */
export async function requestMagicLink(payload: MagicLinkRequest): Promise<{ email: string; expiresInMinutes: number }> {
  if (!isApiConfigured) {
    // Simulate network latency and a successful "email sent" response.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { email: payload.email, expiresInMinutes: 15 };
  }
  return apiFetch<{ email: string; expiresInMinutes: number }>('/auth/magic-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Verifies a magic-link / OTP token and returns a session.
 *
 * The server endpoint `POST /api/auth/verify` should:
 *   - validate the email + token pair
 *   - mark the token as used
 *   - issue a time-limited session token
 *
 * When no API base URL is configured the call falls back to a simulated
 * successful verification. For local testing, the mock accepts any 6-digit
 * code (e.g. "123456").
 */
export async function verifyMagicLink(payload: MagicLinkVerify): Promise<AuthSession> {
  if (!isApiConfigured) {
    // Simulate network latency and validate the token shape.
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (!/^\d{6}$/.test(payload.token)) {
      throw new Error('API 401: Invalid or expired code for /auth/verify');
    }
    return {
      token: `dev-token-${Date.now()}`,
      clientId: 'CL-2024-0042',
      clientName: 'James Whitfield',
      email: payload.email,
      role: 'client',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };
  }
  return apiFetch<AuthSession>('/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Fetches the current authenticated client's profile.
 *
 * The server endpoint `GET /api/clients/me` should return the client
 * associated with the JWT bearer token. Requires authentication.
 *
 * When no API base URL is configured the call falls back to the synthetic
 * demo client so the UI remains functional.
 */
export async function getCurrentClient(): Promise<ClientProfile> {
  if (!isApiConfigured) {
    // Simulate network latency and return a synthetic demo profile.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      clientId: demoClient.id,
      name: demoClient.name,
      email: demoClient.email,
      managerId: demoClient.managerId,
      managerName: demoClient.managerName,
      since: demoClient.since,
      status: demoClient.status,
    };
  }
  return apiFetch<ClientProfile>('/clients/me');
}

/**
 * Invalidates the current session on the server.
 *
 * The server endpoint `POST /api/auth/logout` should revoke the session
 * token and clear any server-side session state.
 *
 * When no API base URL is configured this is a no-op.
 */
export async function logout(): Promise<void> {
  if (!isApiConfigured) return;
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST' });
  } catch {
    // Best-effort — the local session is cleared regardless
  }
}
