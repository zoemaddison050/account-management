import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { createApplicationDraft, saveApplicationDraft } from '../../lib/applicationFlow';
import { useManagers } from '../../hooks/useManagers';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  country?: string;
  consent?: string;
  policy?: string;
}

const countries = [
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

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const draft = createApplicationDraft({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      country: form.country,
      preferredManager: form.preferredManager,
    });

    saveApplicationDraft(draft);
    window.location.assign('/apply/received');
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

          {/* Safety notice */}
          <div className="alert alert-warning" style={{ marginBottom: 'var(--space-6)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <strong>We will never ask for:</strong> passwords, bank account numbers, card details, wallet recovery phrases, API keys, trading credentials, government ID numbers, or full tax identifiers in this form.
            </div>
          </div>

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

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? 'Preparing…' : 'Continue to application PDF'}
              </button>
              <Link to="/apply" className="btn btn-secondary btn-lg">Back</Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
