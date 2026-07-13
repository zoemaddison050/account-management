import { Link } from 'react-router-dom';
import { getApplicationDraft } from '../../lib/applicationFlow';

export default function ApplyReceived() {
  const draft = getApplicationDraft();

  if (!draft) {
    return (
      <div className="fade-in">
        <section className="section">
          <div className="container-narrow" style={{ textAlign: 'center' }}>
            <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Application Centre</p>
            <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>Enter your details first</h1>
            <p className="text-soft" style={{ maxWidth: '52ch', margin: '0 auto var(--space-6)' }}>
              A personalised application document is prepared only after the short details form is completed. No document has been prepared in this browser session.
            </p>
            <Link to="/apply/online" className="btn btn-primary btn-lg">Start application details</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <section className="section">
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'var(--success-bg)', display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-5)',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>Details prepared</p>
          <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>Your personalised document is ready, {draft.firstName}.</h1>
          <p className="text-soft" style={{ fontSize: '1.05rem', maxWidth: '54ch', margin: '0 auto var(--space-6)', lineHeight: 1.6 }}>
            The document will carry your name and selected account manager, and includes three signature areas. The company and account manager signatures are already applied — you can sign digitally in the browser or print and sign by hand, then return the form.
          </p>

          <div className="card" style={{ maxWidth: '520px', margin: '0 auto var(--space-6)', textAlign: 'left', borderTop: '4px solid var(--brand-blue)' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)' }}>Document details</p>
            <dl className="application-summary">
              <div><dt>Reference</dt><dd className="mono">{draft.reference}</dd></div>
              <div><dt>Applicant</dt><dd>{draft.firstName} {draft.lastName}</dd></div>
              <div><dt>Preferred manager</dt><dd>{draft.preferredManager}</dd></div>
              <div><dt>Residence</dt><dd>{draft.country}</dd></div>
            </dl>
          </div>

          <div className="alert alert-info" style={{ maxWidth: '620px', margin: '0 auto var(--space-5)', textAlign: 'left' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <div>
              <strong>Next step:</strong> open the PDF page to sign digitally in your browser (no printing needed), or download and sign by hand. Then email it to <a href="mailto:support@primexchanges.com" style={{ fontWeight: 600 }}>support@primexchanges.com</a> with your reference number.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/apply/download" className="btn btn-primary btn-lg">Open personalised PDF</Link>
            <Link to="/apply/online" className="btn btn-secondary btn-lg">Edit details</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
