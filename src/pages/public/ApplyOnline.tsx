import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { saveApplicationDraft } from '../../lib/applicationFlow';
import { useManagers } from '../../hooks/useManagers';
import { submitApplication } from '../../lib/api';

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
