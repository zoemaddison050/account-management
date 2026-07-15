import type {
  AccountManager,
  AuthSession,
  MagicLinkRequest,
  MagicLinkVerify,
  ClientProfile,
  StaffLoginVerify,
  ActivityEvent,
  ClientDocument,
  Application,
  Client,
  AuditEvent
} from '../types';
import {
  accountManagers,
  demoClient,
  activityEvents,
  clientDocuments,
  applications,
  allClients,
  auditEvents
} from '../data/mockData';

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
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : '');
const SESSION_KEY = 'prime-exchanges.session';

/**
 * Whether the API client will attempt real network calls.
 * When false, all fetch helpers return synthetic demo data immediately.
 */
export const isApiConfigured = API_BASE_URL !== '';

export interface SubmitApplicationRequest {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  preferredManager: string;
  referralSource?: string;
  serviceInterest?: string;
  consentVersion: string;
}

export interface SubmitApplicationResponse {
  reference?: string;
  pdfToken?: string;
  message: string;
}

export interface UpsertAccountManagerRequest {
  name: string;
  title: string;
  email: string;
  activeClients: number;
  capacity: number;
  status: AccountManager['status'];
}

export interface InvitationPreview {
  reference: string;
  applicantName: string;
  email: string;
  assignedManager: string;
  expiresAt: string;
}

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
      return parsed.token ?? null;
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
  if (res.status === 204) {
    return undefined as T;
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
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

/**
 * Submits a new client application inquiry to the server.
 */
export async function submitApplication(payload: SubmitApplicationRequest): Promise<SubmitApplicationResponse> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return {
      reference: `PX-${new Date().getFullYear().toString().slice(-2)}${Math.floor(10000 + Math.random() * 90000)}`,
      pdfToken: `mock-pdf-token-${Date.now()}`,
      message: "Your application has been received. We'll be in touch shortly.",
    };
  }
  return apiFetch<SubmitApplicationResponse>('/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Saves an application draft to the server.
 */
export async function apiSaveDraft(email: string, draftDataJson: string): Promise<void> {
  if (!isApiConfigured) {
    localStorage.setItem(`px-draft-${email.trim().toLowerCase()}`, draftDataJson);
    return;
  }
  await apiFetch<void>('/applications/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, draftDataJson }),
  });
}

/**
 * Requests a verification code to resume a draft.
 */
export async function apiRequestDraftResume(email: string): Promise<void> {
  if (!isApiConfigured) {
    return;
  }
  await apiFetch<void>('/applications/draft/request-resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

/**
 * Verifies code and resumes an application draft.
 */
export async function apiResumeDraft(email: string, code: string): Promise<{ email: string; draftDataJson: string }> {
  if (!isApiConfigured) {
    const data = localStorage.getItem(`px-draft-${email.trim().toLowerCase()}`);
    if (!data) {
      throw new Error('API 400: No draft found for this email');
    }
    if (code !== '123456') {
      throw new Error('API 400: Invalid verification code');
    }
    return { email, draftDataJson: data };
  }
  return apiFetch<{ email: string; draftDataJson: string }>('/applications/draft/resume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
}

/**
 * Log in a staff member using email and password.
 */
export async function staffLogin(payload: StaffLoginVerify): Promise<AuthSession> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (payload.password !== 'Admin@PrimeX2026!') {
      throw new Error('API 401: Invalid credentials for staff login');
    }
    return {
      token: `dev-staff-token-${Date.now()}`,
      clientId: 'USR-001',
      clientName: 'Prime Accounts Admin',
      email: payload.email,
      role: 'Administrator',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };
  }
  return apiFetch<AuthSession>('/auth/staff-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });
}

/**
 * Verify staff MFA code.
 */
export async function staffMfaVerify(mfaToken: string, code: string): Promise<AuthSession> {
  if (!isApiConfigured) {
    if (code !== '123456') {
      throw new Error('API 401: Invalid MFA code');
    }
    return {
      token: `dev-staff-token-mfa-${Date.now()}`,
      clientId: 'USR-001',
      clientName: 'Prime Accounts Admin',
      email: 'accounts@primexchanges.com',
      role: 'Administrator',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };
  }
  return apiFetch<AuthSession>('/auth/staff-mfa-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mfaToken, code }),
  });
}

/**
 * Fetch client portal activity events.
 */
export async function getClientActivity(): Promise<ActivityEvent[]> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return activityEvents;
  }
  return apiFetch<ActivityEvent[]>('/clients/me/activity');
}

/**
 * Fetch client portal documents.
 */
export async function getClientDocuments(): Promise<ClientDocument[]> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return clientDocuments;
  }
  return apiFetch<ClientDocument[]>('/clients/me/documents');
}

/**
 * Fetch admin dashboard summary stats.
 */
export async function getAdminStats(): Promise<{ total: number; pending: number; approved: number; declined: number }> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      total: applications.length,
      pending: applications.filter(a => a.status !== 'Approved — activation pending' && a.status !== 'Active client' && a.status !== 'Declined' && a.status !== 'Paused / closed').length,
      approved: applications.filter(a => a.status === 'Approved — activation pending' || a.status === 'Active client').length,
      declined: applications.filter(a => a.status === 'Declined').length,
    };
  }
  return apiFetch<{ total: number; pending: number; approved: number; declined: number }>('/admin/stats');
}

/**
 * Fetch all applications (filtered/searched).
 */
export async function getAdminApplications(status?: string, search?: string): Promise<Application[]> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    let list = [...applications];
    if (status && status !== 'All') {
      list = list.filter(a => a.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.applicantName.toLowerCase().includes(q) || a.reference.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
    }
    return list;
  }
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  return apiFetch<Application[]>(`/admin/applications?${params.toString()}`);
}

/**
 * Fetch detailed view of a single application.
 */
export async function getAdminApplicationDetail(id: string): Promise<Application> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const app = applications.find(a => a.id === id);
    if (!app) throw new Error('API 404: Application not found');
    return app;
  }
  return apiFetch<Application>(`/admin/applications/${id}`);
}

/**
 * Update the status of an application.
 */
export async function updateApplicationStatus(id: string, status: string, reason?: string, managerId?: string): Promise<void> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const app = applications.find(a => a.id === id);
    if (app) {
      app.status = status as any;
      app.notes.push({
        author: 'Staff User',
        date: new Date().toISOString(),
        text: `Status changed to '${status}'` + (reason ? `. Reason: ${reason}` : ''),
      });
    }
    return;
  }
  await apiFetch<void>(`/admin/applications/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reason, managerId }),
  });
}

/**
 * Add a note to an application.
 */
export async function addApplicationNote(id: string, text: string): Promise<void> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const app = applications.find(a => a.id === id);
    if (app) {
      app.notes.push({
        author: 'Staff User',
        date: new Date().toISOString(),
        text,
      });
    }
    return;
  }
  await apiFetch<void>(`/admin/applications/${id}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

/**
 * Issue a single-use client invitation for an approved application.
 */
export async function issueApplicationInvitation(id: string, reason?: string): Promise<{ invitationId: string; expiresAt: string; invitationUrl: string }> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      invitationId: `INV-${Date.now()}`,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      invitationUrl: `${window.location.origin}/invite/mock-invitation-token`,
    };
  }
  return apiFetch<{ invitationId: string; expiresAt: string; invitationUrl: string }>(`/admin/applications/${id}/invitation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason, expiresInHours: 72 }),
  });
}

/**
 * Preview a client invitation by token.
 */
export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return {
      reference: 'PX-2600000',
      applicantName: 'Demo Applicant',
      email: 'demo@primexchanges.com',
      assignedManager: 'Prime Accounts Team',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    };
  }
  return apiFetch<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`);
}

/**
 * Accept a client invitation and return a signed-in client session.
 */
export async function acceptInvitation(token: string): Promise<AuthSession> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      token: `dev-invite-token-${Date.now()}`,
      clientId: 'CL-2026-0001',
      clientName: 'Demo Applicant',
      email: 'demo@primexchanges.com',
      role: 'client',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };
  }
  return apiFetch<AuthSession>(`/invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
  });
}

/**
 * Fetch all clients.
 */
export async function getAdminClients(): Promise<Client[]> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return allClients;
  }
  return apiFetch<Client[]>('/admin/clients');
}

/**
 * Fetch all managers.
 */
export async function getAdminManagers(): Promise<AccountManager[]> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return accountManagers;
  }
  return apiFetch<AccountManager[]>('/admin/managers');
}

/**
 * Create an account manager.
 */
export async function createAdminManager(payload: UpsertAccountManagerRequest): Promise<AccountManager> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const manager: AccountManager = {
      id: `MGR-${String(accountManagers.length + 1).padStart(3, '0')}`,
      ...payload,
    };
    accountManagers.push(manager);
    return manager;
  }
  return apiFetch<AccountManager>('/admin/managers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Update an account manager.
 */
export async function updateAdminManager(id: string, payload: UpsertAccountManagerRequest): Promise<AccountManager> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const index = accountManagers.findIndex((m) => m.id === id);
    if (index === -1) throw new Error('API 404: Manager not found');
    accountManagers[index] = { ...accountManagers[index], ...payload };
    return accountManagers[index];
  }
  return apiFetch<AccountManager>(`/admin/managers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch recent audit events.
 */
export async function getAdminAuditEvents(severity?: string, search?: string): Promise<AuditEvent[]> {
  if (!isApiConfigured) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    let list = [...auditEvents];
    if (severity && severity !== 'All') {
      list = list.filter(e => e.severity === severity);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e => e.actor.toLowerCase().includes(q) || e.action.toLowerCase().includes(q) || e.target.toLowerCase().includes(q) || (e.reason && e.reason.toLowerCase().includes(q)));
    }
    return list;
  }
  const params = new URLSearchParams();
  if (severity) params.append('severity', severity);
  if (search) params.append('search', search);
  return apiFetch<AuditEvent[]>(`/admin/audit?${params.toString()}`);
}
