import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { saveApplicationDraft } from '../../lib/applicationFlow';
import { useManagers } from '../../hooks/useManagers';
import { submitApplication, apiSaveDraft, apiRequestDraftResume, apiResumeDraft, isApiConfigured } from '../../lib/api';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  country?: string;
  consent?: string;
  policy?: string;
}

const countries = [
  'United States',
  'United Kingdom', 'Ireland', 'Germany', 'France', 'Spain', 'Portugal', 'Italy',
  'Netherlands', 'Belgium', 'Sweden', 'Denmark', 'Norway', 'Finland',
  'Switzerland', 'Austria', 'Japan', 'Singapore', 'United Arab Emirates',
  'Other (please specify in your interest note)',
];

const sources = [
  'Web search', 'Referral from existing client', 'Social media', 'Email outreach', 'Other',
];

export default function ApplyOnline() {
  const { managers, loading: managersLoading } = useManagers();
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    preferredManager: 'No preference',
    source: '',
    interest: '',
    consent: false,
    policy: false,
  });

  // Draft save states
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Draft resume states
  const [resumeMode, setResumeMode] = useState<'none' | 'email' | 'code'>('none');
  const [resumeEmail, setResumeEmail] = useState('');
  const [resumeCode, setResumeCode] = useState('');
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address';
    if (!form.country) e.country = 'Please select your country/region';
    if (!form.consent) e.consent = 'You must consent to be contacted to submit this request';
    if (!form.policy) e.policy = 'You must acknowledge the privacy and disclosure links';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!form.email.trim()) {
      setErrors({ email: 'Email address is required to save progress' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setSaveMessage(null);
    setSaveError(null);
    try {
      await apiSaveDraft(form.email, JSON.stringify(form));
      setSaveMessage('Progress saved! You can close this page and resume later using this email.');
      setTimeout(() => setSaveMessage(null), 10000);
    } catch {
      setSaveError('Failed to save progress. Please try again.');
    }
  };

  const handleRequestResume = async () => {
    if (!resumeEmail.trim()) {
      setResumeError('Please enter your email address');
      return;
    }
    setResumeLoading(true);
    setResumeError(null);
    try {
      await apiRequestDraftResume(resumeEmail);
      setResumeMode('code');
    } catch (err: any) {
      setResumeError(err.message || 'Failed to request code. Please try again.');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleVerifyResume = async () => {
    if (!resumeCode.trim() || resumeCode.length !== 6) {
      setResumeError('Please enter a 6-digit verification code');
      return;
    }
    setResumeLoading(true);
    setResumeError(null);
    try {
      const result = await apiResumeDraft(resumeEmail, resumeCode);
      const parsedForm = JSON.parse(result.draftDataJson);
      setForm(parsedForm);
      setResumeMode('none');
      setResumeEmail('');
      setResumeCode('');
      setSaveMessage('Your application draft has been loaded successfully!');
      setTimeout(() => setSaveMessage(null), 5000);
    } catch {
      setResumeError('Invalid or expired verification code. Please check and try again.');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const response = await submitApplication({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        country: form.country,
        preferredManager: form.preferredManager,
        referralSource: form.source,
        serviceInterest: form.interest,
        consentVersion: 'POLICY-v1.0',
      });

      const draft = {
        reference: response.reference || `PX-${new Date().getFullYear().toString().slice(-2)}00000`,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        country: form.country,
        preferredManager: form.preferredManager,
        submittedAt: new Date().toISOString(),
        policyVersion: 'POLICY-v1.0',
        pdfToken: response.pdfToken,
      };

      saveApplicationDraft(draft);
      window.location.assign('/apply/received');
    } catch (err) {
      console.error('Failed to submit application:', err);
      setErrors((prev) => ({
        ...prev,
        consent: 'An error occurred while submitting your application details. Please try again.',
      }));
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in">
      <section className="section">
        <div className="container-narrow">
          <PageHeader
            eyebrow="Application Centre · Online Request"
            title="Enter your application details"
            subtitle="Complete these details first so a personalised application document can be prepared with your name and chosen account manager. This is not an approval or a client account."
          />

          {/* Resume Progress Section */}
          {resumeMode === 'none' ? (
            <div style={{ textAlign: 'right', marginBottom: 'var(--space-4)' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.85rem', fontWeight: 600 }}
                onClick={() => { setResumeMode('email'); setResumeError(null); }}
              >
                Already started? Resume progress from draft
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)', borderColor: 'var(--brand-blue-deep)', background: 'var(--navy-50)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)', color: 'var(--navy-900)' }}>Resume Saved Application</h3>
              {resumeError && <p className="alert alert-danger" style={{ padding: 'var(--space-2) var(--space-3)', fontSize: '0.85rem', marginBottom: 'var(--space-3)' }}>{resumeError}</p>}
              
              {resumeMode === 'email' ? (
                <div>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-3)' }}>
                    Enter the email address you used to save your draft. We'll send a 6-digit verification code.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="you@example.com"
                      value={resumeEmail}
                      onChange={(e) => setResumeEmail(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleRequestResume}
                      disabled={resumeLoading}
                    >
                      {resumeLoading ? 'Sending…' : 'Send Code'}
                    </button>
                  </div>
                  {!isApiConfigured && (
                    <p className="badge badge-warning" style={{ fontSize: '0.75rem', marginTop: 'var(--space-2)', display: 'inline-block' }}>
                      Demo mode — just click "Send Code" (no email is actually sent)
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-3)' }}>
                    Enter the 6-digit code sent to <strong>{resumeEmail}</strong>.
                  </p>
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="123456"
                      value={resumeCode}
                      onChange={(e) => setResumeCode(e.target.value)}
                      maxLength={6}
                      style={{ flex: 1, letterSpacing: '0.15em', fontWeight: 'bold' }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleVerifyResume}
                      disabled={resumeLoading}
                    >
                      {resumeLoading ? 'Verifying…' : 'Resume'}
                    </button>
                  </div>
                  {!isApiConfigured && (
                    <p className="badge badge-warning" style={{ fontSize: '0.75rem', marginTop: 'var(--space-2)', display: 'inline-block' }}>
                      Demo mode — use code <strong>123456</strong>
                    </p>
                  )}
                </div>
              )}
              
              <div style={{ marginTop: 'var(--space-3)', textAlign: 'right' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { setResumeMode('none'); setResumeEmail(''); setResumeCode(''); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="card" noValidate>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="firstName">First name <span className="req">*</span></label>
                <input
                  id="firstName"
                  type="text"
                  className={`form-control ${errors.firstName ? 'error' : ''}`}
                  value={form.firstName}
                  onChange={(e) => update('firstName', e.target.value)}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && <p className="form-error">{errors.firstName}</p>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="lastName">Last name <span className="req">*</span></label>
                <input
                  id="lastName"
                  type="text"
                  className={`form-control ${errors.lastName ? 'error' : ''}`}
                  value={form.lastName}
                  onChange={(e) => update('lastName', e.target.value)}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && <p className="form-error">{errors.lastName}</p>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address <span className="req">*</span></label>
              <input
                id="email"
                type="email"
                className={`form-control ${errors.email ? 'error' : ''}`}
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                aria-invalid={!!errors.email}
                placeholder="you@example.com"
              />
              {errors.email && <p className="form-error">{errors.email}</p>}
              <p className="form-hint">We use this to reply and verify your contact route.</p>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="country">Country / region of residence <span className="req">*</span></label>
              <select
                id="country"
                className={`form-control ${errors.country ? 'error' : ''}`}
                value={form.country}
                onChange={(e) => update('country', e.target.value)}
                aria-invalid={!!errors.country}
              >
                <option value="">Select your country / region...</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.country && <p className="form-error">{errors.country}</p>}
              <p className="form-hint">Used to route jurisdictional eligibility checks.</p>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="manager">Preferred account manager</label>
                <select
                  id="manager"
                  className="form-control"
                  value={form.preferredManager}
                  onChange={(e) => update('preferredManager', e.target.value)}
                  disabled={managersLoading}
                >
                  <option value="No preference">No preference</option>
                  {managers.filter((m) => m.status !== 'inactive').map((m) => (
                    <option key={m.id} value={m.name}>{m.name}{m.status === 'at capacity' ? ' (at capacity)' : ''}</option>
                  ))}
                </select>
                <p className="form-hint">
                  {managersLoading
                    ? 'Loading available managers…'
                    : 'Optional — respect referral or existing relationship.'}
                </p>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="source">How did you hear about us?</label>
                <select id="source" className="form-control" value={form.source} onChange={(e) => update('source', e.target.value)}>
                  <option value="">Select...</option>
                  {sources.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <p className="form-hint">Optional — helps us understand our reach.</p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="interest">Brief service interest</label>
              <textarea
                id="interest"
                className="form-control"
                value={form.interest}
                onChange={(e) => update('interest', e.target.value)}
                placeholder="Tell us briefly what you're looking for (optional)..."
                rows={3}
              />
              <p className="form-hint">Optional — helps our team prepare for contact.</p>
            </div>

            <hr className="divider" />

            <div className="form-group">
              <div className="form-check">
                <input
                  id="consent"
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => update('consent', e.target.checked)}
                />
                <label htmlFor="consent">
                  I consent to be contacted about the account management service. <span className="req">*</span>
                </label>
              </div>
              {errors.consent && <p className="form-error">{errors.consent}</p>}
            </div>

            <div className="form-group">
              <div className="form-check">
                <input
                  id="policy"
                  type="checkbox"
                  checked={form.policy}
                  onChange={(e) => update('policy', e.target.checked)}
                />
                <label htmlFor="policy">
                  I acknowledge that I have access to the current{' '}
                  <Link to="/privacy" target="_blank">Privacy Policy</Link>,{' '}
                  <Link to="/terms" target="_blank">Terms of Service</Link>, and{' '}
                  <Link to="/disclosures" target="_blank">Disclosures</Link>. <span className="req">*</span>
                </label>
              </div>
              {errors.policy && <p className="form-error">{errors.policy}</p>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                  {submitting ? 'Preparing…' : 'Continue to application PDF'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                >
                  Save progress
                </button>
                <Link to="/apply" className="btn btn-ghost btn-lg">Back</Link>
              </div>
              
              {saveMessage && <p className="alert alert-success" style={{ fontSize: '0.88rem', margin: 0 }}>{saveMessage}</p>}
              {saveError && <p className="alert alert-danger" style={{ fontSize: '0.88rem', margin: 0 }}>{saveError}</p>}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
