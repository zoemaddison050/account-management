// ============================================================
// PrimeXchanges — Synthetic Demo Data
// ⚠️  This data is FICTIONAL and for local development only.
//     Per plan §18.1 rule 7: use synthetic/masked data for
//     local development and testing. No real client data.
// ============================================================

import type {
  Applicant,
  Application,
  AccountManager,
  Client,
  ActivityEvent,
  ClientDocument,
  AuditEvent,
  SyncLog,
  PortfolioSnapshot,
} from '../types';

export const DEMO_CLIENT_ID = 'CL-2024-0042';

export const accountManagers: AccountManager[] = [
  {
    id: 'AM-001',
    name: 'Eleanor Whitfield',
    title: 'Senior Account Manager',
    email: 'e.whitfield@primexchanges.com',
    activeClients: 18,
    capacity: 25,
    status: 'active',
  },
  {
    id: 'AM-002',
    name: 'Marcus Aldridge',
    title: 'Account Manager',
    email: 'm.aldridge@primexchanges.com',
    activeClients: 12,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-003',
    name: 'Priya Ramachandran',
    title: 'Compliance Approver',
    email: 'p.ramachandran@primexchanges.com',
    activeClients: 0,
    capacity: 0,
    status: 'inactive',
  },
  {
    id: 'AM-004',
    name: 'Morgan Christopher',
    title: 'Senior Account Manager',
    email: 'morgan.christopher@primexchanges.com',
    activeClients: 8,
    capacity: 25,
    status: 'active',
  },
  {
    id: 'AM-005',
    name: 'Sarah Jenkins',
    title: 'Account Manager',
    email: 'sarah.jenkins@primexchanges.com',
    activeClients: 5,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-006',
    name: 'Matthew Vance',
    title: 'Account Manager',
    email: 'matthew.vance@primexchanges.com',
    activeClients: 10,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-007',
    name: 'Johnathan Brody',
    title: 'Account Manager',
    email: 'johnathan.brody@primexchanges.com',
    activeClients: 15,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-008',
    name: 'Abigail Vance',
    title: 'Senior Account Manager',
    email: 'abigail.vance@primexchanges.com',
    activeClients: 25,
    capacity: 25,
    status: 'at capacity',
  },
  {
    id: 'AM-009',
    name: 'Chloe Dupont',
    title: 'Account Manager',
    email: 'chloe.dupont@primexchanges.com',
    activeClients: 12,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-010',
    name: 'Hans Müller',
    title: 'Account Manager',
    email: 'hans.mueller@primexchanges.com',
    activeClients: 14,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-011',
    name: 'Yuki Sato',
    title: 'Account Manager',
    email: 'yuki.sato@primexchanges.com',
    activeClients: 6,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-012',
    name: 'Carlos Ruiz',
    title: 'Account Manager',
    email: 'carlos.ruiz@primexchanges.com',
    activeClients: 9,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-013',
    name: 'Emily Watson',
    title: 'Account Manager',
    email: 'emily.watson@primexchanges.com',
    activeClients: 11,
    capacity: 20,
    status: 'active',
  },
  {
    id: 'AM-014',
    name: "Liam O'Connor",
    title: 'Account Manager',
    email: 'liam.oconnor@primexchanges.com',
    activeClients: 18,
    capacity: 20,
    status: 'active',
  },
];

// ---- Demo Client (the logged-in client's view) ----
export const demoClient: Client = {
  id: 'CL-2024-0042',
  reference: 'PE-CL-0042',
  name: 'Jonathan Hartwell',
  email: 'j.hartwell@example.com',
  managerId: 'AM-001',
  managerName: 'Eleanor Whitfield',
  since: 'March 2024',
  status: 'active',
  portfolios: [],
};

// ---- All Clients (admin view) ----
export const allClients: Client[] = [
  demoClient,
  {
    id: 'CL-2024-0038',
    reference: 'PE-CL-0038',
    name: 'Amara Bensalah',
    email: 'a.bensalah@example.com',
    managerId: 'AM-001',
    managerName: 'Eleanor Whitfield',
    since: 'January 2024',
    status: 'active',
    portfolios: [],
  },
  {
    id: 'CL-2024-0040',
    reference: 'PE-CL-0040',
    name: 'Theodor Kjær',
    email: 't.kjaer@example.com',
    managerId: 'AM-002',
    managerName: 'Marcus Aldridge',
    since: 'February 2024',
    status: 'active',
    portfolios: [],
  },
  {
    id: 'CL-2024-0045',
    reference: 'PE-CL-0045',
    name: 'Wei-Lin Chen',
    email: 'w.chen@example.com',
    managerId: 'AM-002',
    managerName: 'Marcus Aldridge',
    since: 'April 2024',
    status: 'active',
    portfolios: [],
  },
  {
    id: 'CL-2024-0048',
    reference: 'PE-CL-0048',
    name: 'Isabella Moretti',
    email: 'i.moretti@example.com',
    managerId: 'AM-003',
    managerName: 'Priya Ramachandran',
    since: 'May 2024',
    status: 'active',
    portfolios: [],
  },
  {
    id: 'CL-2024-0051',
    reference: 'PE-CL-0051',
    name: 'Richard Steinberg',
    email: 'r.steinberg@example.com',
    managerId: 'AM-004',
    managerName: 'James Okonkwo',
    since: 'June 2024',
    status: 'paused',
    portfolios: [],
  },
];

// ---- Applicants (online form submissions) ----
export const applicants: Applicant[] = [];

// ---- Applications (admin queue) ----
export const applications: Application[] = [
  {
    id: 'APP-001',
    reference: 'REQ-2026-0731',
    applicantName: 'Sarah N. Okafor',
    email: 's.okafor@example.com',
    country: 'United Kingdom',
    status: 'Inquiry submitted',
    assignedReviewer: 'Unassigned',
    submittedAt: '2026-07-12T08:30:00Z',
    lastUpdated: '2026-07-12T08:30:00Z',
    route: 'online',
    notes: [],
  },
  {
    id: 'APP-002',
    reference: 'REQ-2026-0730',
    applicantName: 'Henrik Lindqvist',
    email: 'h.lindqvist@example.com',
    country: 'Sweden',
    status: 'Under review',
    assignedReviewer: 'Marcus Aldridge',
    submittedAt: '2026-07-11T14:20:00Z',
    lastUpdated: '2026-07-12T07:00:00Z',
    route: 'download',
    notes: [
      { author: 'Marcus Aldridge', date: '2026-07-12T07:00:00Z', text: 'Completed PDF received via support mailbox. Checking residency eligibility.' },
    ],
  },
  {
    id: 'APP-003',
    reference: 'REQ-2026-0728',
    applicantName: 'Carlos Mendoza',
    email: 'c.mendoza@example.com',
    country: 'Spain',
    status: 'Information requested',
    assignedReviewer: 'Eleanor Whitfield',
    submittedAt: '2026-07-10T09:15:00Z',
    lastUpdated: '2026-07-11T16:30:00Z',
    route: 'online',
    notes: [
      { author: 'Eleanor Whitfield', date: '2026-07-11T16:30:00Z', text: 'Requested proof of residency through secure upload channel. Awaiting response.' },
    ],
  },
  {
    id: 'APP-004',
    reference: 'REQ-2026-0725',
    applicantName: 'Yuki Tanaka',
    email: 'y.tanaka@example.com',
    country: 'Japan',
    status: 'Approval pending',
    assignedReviewer: 'Eleanor Whitfield',
    submittedAt: '2026-07-08T11:00:00Z',
    lastUpdated: '2026-07-12T09:00:00Z',
    route: 'download',
    notes: [
      { author: 'Eleanor Whitfield', date: '2026-07-11T10:00:00Z', text: 'Review complete. All checks passed. Forwarded to compliance for formal approval.' },
      { author: 'System', date: '2026-07-12T09:00:00Z', text: 'Routed to compliance approver: Priya Ramachandran.' },
    ],
  },
  {
    id: 'APP-005',
    reference: 'REQ-2026-0720',
    applicantName: 'Daniela Ferreira',
    email: 'd.ferreira@example.com',
    country: 'Portugal',
    status: 'Approved — activation pending',
    assignedReviewer: 'Priya Ramachandran',
    submittedAt: '2026-07-05T13:45:00Z',
    lastUpdated: '2026-07-11T14:00:00Z',
    route: 'download',
    notes: [
      { author: 'Priya Ramachandran', date: '2026-07-11T14:00:00Z', text: 'Approved. Invitation pending portal provisioning by administrator.' },
    ],
  },
  {
    id: 'APP-006',
    reference: 'REQ-2026-0715',
    applicantName: 'Alistair Pemberton',
    email: 'a.pemberton@example.com',
    country: 'United Kingdom',
    status: 'Active client',
    assignedReviewer: 'Eleanor Whitfield',
    submittedAt: '2026-06-28T10:00:00Z',
    lastUpdated: '2026-07-10T08:00:00Z',
    route: 'online',
    notes: [
      { author: 'System', date: '2026-07-10T08:00:00Z', text: 'Invitation accepted. Client account linked: PE-CL-0055.' },
    ],
  },
  {
    id: 'APP-007',
    reference: 'REQ-2026-0712',
    applicantName: 'Niamh O\u2019Brien',
    email: 'n.obrien@example.com',
    country: 'Ireland',
    status: 'Declined',
    assignedReviewer: 'Priya Ramachandran',
    submittedAt: '2026-06-20T09:30:00Z',
    lastUpdated: '2026-07-02T11:00:00Z',
    route: 'online',
    notes: [
      { author: 'Priya Ramachandran', date: '2026-07-02T11:00:00Z', text: 'Declined — jurisdiction not supported at this time. Applicant notified with approved wording.' },
    ],
  },
  {
    id: 'APP-008',
    reference: 'REQ-2026-0710',
    applicantName: 'Viktor Pavlov',
    email: 'v.pavlov@example.com',
    country: 'Germany',
    status: 'Application received',
    assignedReviewer: 'Unassigned',
    submittedAt: '2026-07-12T06:00:00Z',
    lastUpdated: '2026-07-12T06:00:00Z',
    route: 'download',
    notes: [],
  },
];

// ---- Activity Events (client portal) ----
export const activityEvents: ActivityEvent[] = [];

// ---- Client Documents ----
export const clientDocuments: ClientDocument[] = [];

// ---- Value History (for portfolio chart) ----
export const portfolioHistory: PortfolioSnapshot[] = [
  { id: 'S1', clientId: 'CL-2024-0042', portfolioId: 'PF-001', date: '2026-01-31', totalValue: 798400, currency: 'USD' },
  { id: 'S2', clientId: 'CL-2024-0042', portfolioId: 'PF-001', date: '2026-02-28', totalValue: 805200, currency: 'USD' },
  { id: 'S3', clientId: 'CL-2024-0042', portfolioId: 'PF-001', date: '2026-03-31', totalValue: 812000, currency: 'USD' },
  { id: 'S4', clientId: 'CL-2024-0042', portfolioId: 'PF-001', date: '2026-04-30', totalValue: 819600, currency: 'USD' },
  { id: 'S5', clientId: 'CL-2024-0042', portfolioId: 'PF-001', date: '2026-05-31', totalValue: 831200, currency: 'USD' },
  { id: 'S6', clientId: 'CL-2024-0042', portfolioId: 'PF-001', date: '2026-06-30', totalValue: 841900, currency: 'USD' },
  { id: 'S7', clientId: 'CL-2024-0042', portfolioId: 'PF-001', date: '2026-07-11', totalValue: 847250, currency: 'USD' },
];

// ---- Audit Events (admin) ----
export const auditEvents: AuditEvent[] = [
  { id: 'AU1', actor: 'Priya Ramachandran', action: 'Application approved', target: 'REQ-2026-0720 (Daniela Ferreira)', timestamp: '2026-07-11T14:00:00Z', reason: 'All eligibility checks passed', severity: 'info' },
  { id: 'AU2', actor: 'Eleanor Whitfield', action: 'Application status changed', target: 'REQ-2026-0728 (Carlos Mendoza)', timestamp: '2026-07-11T16:30:00Z', reason: 'Requested additional residency documentation', severity: 'info' },
  { id: 'AU3', actor: 'System', action: 'Portfolio batch published', target: 'BATCH-2026-07-12-006', timestamp: '2026-07-12T06:15:00Z', reason: 'Reconciliation passed — 142 records, 0 exceptions', severity: 'info' },
  { id: 'AU4', actor: 'Administrator', action: 'Role assigned: Account manager', target: 'AM-005 (Sofia Delacroix)', timestamp: '2026-07-10T09:00:00Z', severity: 'info' },
  { id: 'AU5', actor: 'System', action: 'Sync exception flagged', target: 'PF-002 (Hartwell Retirement Allocation)', timestamp: '2026-07-11T06:20:00Z', reason: 'Source export delayed — stale data preserved with timestamp', severity: 'warning' },
  { id: 'AU6', actor: 'Priya Ramachandran', action: 'Application declined', target: 'REQ-2026-0712 (Niamh O\u2019Brien)', timestamp: '2026-07-02T11:00:00Z', reason: 'Jurisdiction not supported at this time', severity: 'warning' },
  { id: 'AU7', actor: 'System', action: 'Invitation sent', target: 'REQ-2026-0715 (Alistair Pemberton)', timestamp: '2026-07-09T12:00:00Z', reason: 'Single-use, expiring invitation issued after approval', severity: 'info' },
  { id: 'AU8', actor: 'System', action: 'Invitation accepted', target: 'REQ-2026-0715 (Alistair Pemberton)', timestamp: '2026-07-10T08:00:00Z', reason: 'Client account linked: PE-CL-0055', severity: 'info' },
  { id: 'AU9', actor: 'Administrator', action: 'Document published', target: 'June 2026 Monthly Statement', timestamp: '2026-07-08T10:00:00Z', severity: 'info' },
  { id: 'AU10', actor: 'System', action: 'Login rate-limit triggered', target: 'IP 203.0.113.42', timestamp: '2026-07-12T03:22:00Z', reason: '5 failed attempts — account temporarily locked', severity: 'critical' },
];

// ---- Sync Logs (admin portfolio-sync) ----
export const syncLogs: SyncLog[] = [
  { id: 'SL1', timestamp: '2026-07-12T06:15:00Z', status: 'ok', recordsProcessed: 142, recordsPublished: 142, exceptions: 0, batchId: 'BATCH-2026-07-12-006', message: 'Full reconciliation passed. All records published.' },
  { id: 'SL2', timestamp: '2026-07-11T06:15:00Z', status: 'error', recordsProcessed: 140, recordsPublished: 138, exceptions: 2, batchId: 'BATCH-2026-07-11-006', message: '2 accounts missing source mapping. Blocked from publication.' },
  { id: 'SL3', timestamp: '2026-07-10T06:15:00Z', status: 'ok', recordsProcessed: 142, recordsPublished: 142, exceptions: 0, batchId: 'BATCH-2026-07-10-006', message: 'Full reconciliation passed. All records published.' },
  { id: 'SL4', timestamp: '2026-07-09T06:15:00Z', status: 'ok', recordsProcessed: 142, recordsPublished: 142, exceptions: 0, batchId: 'BATCH-2026-07-09-006', message: 'Full reconciliation passed. All records published.' },
  { id: 'SL5', timestamp: '2026-07-08T06:15:00Z', status: 'stale', recordsProcessed: 0, recordsPublished: 0, exceptions: 0, batchId: '—', message: 'Source export not delivered. Last verified data preserved with original timestamp.' },
];

// ---- Admin Documents (published) ----
export interface AdminDocument {
  id: string;
  name: string;
  type: string;
  version: string;
  status: 'published' | 'draft' | 'pending review';
  publishedAt: string;
  owner: string;
}

export const adminDocuments: AdminDocument[] = [
  { id: 'AD1', name: 'Application Form (Fillable PDF)', type: 'Application', version: 'AM-APPLICATION-v1.0', status: 'published', publishedAt: '2026-06-01', owner: 'Compliance' },
  { id: 'AD2', name: 'Privacy Notice', type: 'Policy', version: 'v2.0', status: 'published', publishedAt: '2026-06-01', owner: 'Legal' },
  { id: 'AD3', name: 'Terms of Service', type: 'Policy', version: 'v2.0', status: 'published', publishedAt: '2026-06-01', owner: 'Legal' },
  { id: 'AD4', name: 'Risk Disclosure Statement', type: 'Disclosure', version: 'v3.0', status: 'published', publishedAt: '2024-03-15', owner: 'Compliance' },
  { id: 'AD5', name: 'Performance Reporting Methodology', type: 'Disclosure', version: 'v1.1', status: 'pending review', publishedAt: '2026-05-20', owner: 'Compliance' },
  { id: 'AD6', name: 'Cookie Policy', type: 'Policy', version: 'v1.2', status: 'draft', publishedAt: '—', owner: 'Legal' },
];

// ---- Application Status metadata ----
export const statusColors: Record<string, string> = {
  'Inquiry submitted': 'badge-info',
  'Form downloaded': 'badge-muted',
  'Application received': 'badge-info',
  'Under review': 'badge-gold',
  'Information requested': 'badge-warning',
  'Approval pending': 'badge-gold',
  'Approved — activation pending': 'badge-info',
  'Active client': 'badge-success',
  'Declined': 'badge-danger',
  'Paused / closed': 'badge-muted',
};

// ---- Helper functions ----
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const mins = Math.floor(diff / 60000);
  return `${mins} minute${mins > 1 ? 's' : ''} ago`;
}
