import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { demoClient } from '../../data/mockData';

export default function Support() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (message.trim()) setSubmitted(true);
  };

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Support"
        title="Contact & Support"
        subtitle="Reach your account manager or our general support team. This portal is not for urgent trading or payment instructions."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }} className="responsive-grid">
        {/* Account manager */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--navy-800), var(--navy-700))', color: 'var(--white)', border: 'none' }}>
          <p style={{ color: 'var(--gold-400)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>Your Account Manager</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--navy-900)', fontSize: '1.1rem', flexShrink: 0 }}>
              {demoClient.managerName.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--white)' }}>{demoClient.managerName}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--navy-200)' }}>Senior Account Manager</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <a href={`mailto:e.whitfield@primexchanges.com`} style={{ color: 'var(--gold-400)', fontSize: '0.92rem', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              e.whitfield@primexchanges.com
            </a>
            <p style={{ fontSize: '0.85rem', color: 'var(--navy-200)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Mon–Fri, 09:00–18:00 GMT
            </p>
          </div>
        </div>

        {/* General support */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>General Support</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</p>
              <p style={{ fontSize: '0.95rem' }}><a href="mailto:support@primexchanges.com">support@primexchanges.com</a></p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hours</p>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)' }}>Monday–Friday, 09:00–18:00 GMT</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Response Target</p>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)' }}>Within 1 business day</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Escalation</p>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)' }}>Mark subject "ESCALATION" for senior routing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Support request form */}
      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Send a non-transactional support request</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-5)' }}>
          For questions about your portfolio, documents, or account access. This is <strong>not</strong> for trade instructions, transfers, or urgent payment requests.
        </p>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Request sent</h3>
            <p className="text-soft" style={{ fontSize: '0.9rem' }}>Your account manager will respond within 1 business day.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="supportMsg">Message</label>
              <textarea
                id="supportMsg"
                className="form-control"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Describe your question or issue..."
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Send Request</button>
          </form>
        )}
      </div>

      {/* Policy links */}
      <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '0.88rem' }}>
        <span className="text-muted">Related:</span>
        <a href="/privacy">Privacy Policy</a>
        <span style={{ color: 'var(--line)' }}>·</span>
        <a href="/terms">Terms of Service</a>
        <span style={{ color: 'var(--line)' }}>·</span>
        <a href="/disclosures">Disclosures</a>
      </div>
    </div>
  );
}
