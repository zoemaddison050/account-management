import PageHeader from '../../components/PageHeader';

export default function Contact() {
  return (
    <div className="fade-in">
      <section className="section">
        <div className="container">
          <PageHeader
            eyebrow="Contact & Support"
            title="How can we help?"
            subtitle="Use the approved support route for account-management questions."
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }} className="responsive-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="card">
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'var(--navy-100)', color: 'var(--brand-blue-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-1)' }}>General Support</h3>
                    <p style={{ fontSize: '0.96rem', fontWeight: 600 }}><a href="mailto:support@primexchanges.com">support@primexchanges.com</a></p>
                    <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: 'var(--space-2)' }}>Support is available during business hours with a target response time of one business day.</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'var(--gold-100)', color: 'var(--gold-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-1)' }}>Use safe channels</h3>
                    <p className="text-soft" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>Do not send passwords, account credentials, card details, wallet recovery phrases, API keys, banking instructions or identity documents through ordinary email.</p>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div><strong>This portal is not for urgent trading or payment instructions.</strong> Use the approved operational channel for any urgent issue.</div>
              </div>
            </div>

            <div className="card" style={{ borderTop: '4px solid var(--brand-blue)' }}>
              <p className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Support request</p>
              <h2 style={{ fontSize: '1.35rem', marginBottom: 'var(--space-3)' }}>Email the support team</h2>
              <p className="text-soft" style={{ fontSize: '0.94rem', lineHeight: 1.7, marginBottom: 'var(--space-5)' }}>
                Use the support email with a concise, non-sensitive description and your application reference if you have one.
              </p>
              <a className="btn btn-primary btn-lg btn-block" href="mailto:support@primexchanges.com?subject=Account%20Management%20Support%20Request">
                Email support@primexchanges.com
              </a>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 'var(--space-4)', lineHeight: 1.5 }}>
                Your message is handled with validation, rate limiting, spam protection, and audit records.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
