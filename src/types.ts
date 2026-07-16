// ============================================================
// PrimeXchanges — Type Definitions
// ============================================================

export type ApplicationStatus =
  | 'Inquiry submitted'
  | 'Form downloaded'
  | 'Application received'
  | 'Under review'
  | 'Information requested'
  | 'Approval pending'
  | 'Approved — activation pending'
  | 'Active client'
  | 'Declined'
  | 'Paused / closed';

export type SyncStatus = 'ok' | 'stale' | 'error';

export type StaffRole =
  | 'Administrator'
  | 'Compliance approver'
  | 'Operations reviewer'
  | 'Account manager';

export interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  preferredManager?: string;
  source?: string;
  interest?: string;
  consentVersion: string;
  submittedAt: string;
}

export interface Application {
  id: string;
  reference: string;
  applicantName: string;
  email: string;
  country: string;
  status: ApplicationStatus;
  assignedReviewer: string;
  submittedAt: string;
  lastUpdated: string;
  route: 'online' | 'download';
  notes: { author: string; date: string; text: string }[];
}

export interface AccountManager {
  id: string;
  name: string;
  title: string;
  email: string;
  activeClients: number;
  capacity: number;
  status: 'active' | 'at capacity' | 'inactive';
}

export interface Client {
  id: string;
  reference: string;
  name: string;
  email: string;
  managerId: string;
  managerName: string;
  since: string;
  status: 'active' | 'paused';
  portfolios: Portfolio[];
}

export interface Portfolio {
  id: string;
  externalAccountId: string;
  name: string;
  currency: string;
  totalValue: number;
  valuationBasis: string;
  asOf: string;
  syncStatus: SyncStatus;
  lastSync: string;
  holdings: Holding[];
}

export interface Holding {
  id: string;
  instrument: string;
  type: 'Equity' | 'Bond' | 'Fund' | 'Cash' | 'Commodity' | 'Crypto' | 'Forex' | 'Other';
  quantity: number;
  value: number;
  allocationPct: number;
  currency: string;
}

export interface PortfolioSnapshot {
  id: string;
  clientId: string;
  portfolioId: string;
  date: string;
  totalValue: number;
  currency: string;
}

export interface ActivityEvent {
  id: string;
  date: string;
  type: 'Valuation' | 'Statement' | 'Allocation change' | 'Dividend' | 'Fee' | 'Sync';
  description: string;
  amount?: string;
}

export interface ClientDocument {
  id: string;
  name: string;
  type: 'Statement' | 'Policy' | 'Agreement' | 'Report' | 'Tax';
  version: string;
  publishedAt: string;
  sizeLabel: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  reason?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface SyncLog {
  id: string;
  timestamp: string;
  status: SyncStatus;
  recordsProcessed: number;
  recordsPublished: number;
  exceptions: number;
  batchId: string;
  message: string;
}

export interface SupportContact {
  label: string;
  value: string;
  href?: string;
}

export interface NavLink {
  label: string;
  to: string;
}

// ============================================================
// Authentication (Magic Link)
// ============================================================

export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkVerify {
  email: string;
  token: string;
  remember?: boolean;
}

export interface AuthSession {
  token?: string;
  clientId: string;
  clientName: string;
  email: string;
  role: 'client' | 'Administrator' | 'OperationsReviewer' | 'ComplianceApprover' | 'AccountManager';
  expiresAt: string;
  requiresMfa?: boolean;
  mfaToken?: string;
}

export interface ClientProfile {
  clientId: string;
  name: string;
  email: string;
  managerId?: string;
  managerName?: string;
  since: string;
  status: 'active' | 'paused';
  portfolios?: Portfolio[];
}

export interface StaffLoginVerify {
  email: string;
  password?: string;
  remember?: boolean;
}
