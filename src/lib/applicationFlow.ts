export interface ApplicationDraft {
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  preferredManager: string;
  submittedAt: string;
  policyVersion: string;
}

const draftKey = 'prime-exchanges.application-draft';

function makeReference() {
  const year = new Date().getFullYear();
  const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(-6);
  return `PE-${year}-${suffix}`;
}

export function createApplicationDraft(data: Omit<ApplicationDraft, 'reference' | 'submittedAt' | 'policyVersion'>): ApplicationDraft {
  return {
    ...data,
    reference: makeReference(),
    submittedAt: new Date().toISOString(),
    policyVersion: 'POLICY-v1.0',
  };
}

export function saveApplicationDraft(draft: ApplicationDraft) {
  sessionStorage.setItem(draftKey, JSON.stringify(draft));
}

export function getApplicationDraft(): ApplicationDraft | null {
  try {
    const value = sessionStorage.getItem(draftKey);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<ApplicationDraft>;
    if (!parsed.reference || !parsed.firstName || !parsed.lastName || !parsed.email || !parsed.preferredManager) {
      return null;
    }
    return parsed as ApplicationDraft;
  } catch {
    return null;
  }
}
