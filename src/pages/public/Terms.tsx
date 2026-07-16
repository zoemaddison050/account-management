import PageHeader from '../../components/PageHeader';

const sections = [
  {
    title: '1. Service Description',
    body: 'The PrimeXchanges Account Management portal is a read-only client-experience layer that provides access to verified portfolio information. The portal is not the trading engine. PrimeXchanges remains the source platform for all trading and portfolio records.',
  },
  {
    title: '2. Eligibility',
    body: 'Access to the client portal is invitation-only and granted only after a staff review and formal approval. Completing application details or receiving an application document does not constitute approval or guarantee an account.',
  },
  {
    title: '3. Read-Only Access',
    body: 'In the current version, the client portal is informational and read-only. Clients cannot place trades, execute transfers, initiate deposits or withdrawals, or change account custody settings through the portal. These capabilities may be added only after separate risk and compliance approval.',
  },
  {
    title: '4. Data Accuracy',
    body: 'Portfolio values displayed in the portal are verified against the approved PrimeXchanges data source and reconciled before publication. Values are labeled with their "as of" timestamp and data-freshness status. The portal does not display estimated, stale, or unverified values as if they are live.',
  },
  {
    title: '5. Account Security',
    body: 'Clients are responsible for keeping their login credentials secure. Multi-factor authentication is strongly recommended. If you suspect unauthorized access to your account, contact support@primexchanges.com immediately.',
  },
  {
    title: '6. No Financial Advice',
    body: 'The information displayed in the portal is factual portfolio data, not financial advice. Performance figures, where shown, use approved calculation methods with transparent methodology and applicable disclosures. Past performance does not guarantee future results.',
  },
  {
    title: '7. Acceptable Use',
    body: 'Users must not attempt to access another client\'s data, circumvent access controls, scrape or automatedly extract data, or use the portal for any unlawful purpose. All access is logged and monitored.',
  },
  {
    title: '8. Changes to Terms',
    body: 'These terms are versioned. Material changes will be communicated to approved clients. Continued use of the portal after changes take effect constitutes acceptance of the updated terms.',
  },
];

export default function Terms() {
  return (
    <div className="fade-in">
      <section className="section">
        <div className="container-narrow">
          <PageHeader eyebrow="Legal" title="Terms of Service" subtitle="The terms and conditions governing use of the PrimeXchanges Account Management portal." />
          <div className="alert alert-warning" style={{ marginBottom: 'var(--space-6)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div><strong>Placeholder content.</strong> This document must be reviewed and approved by the legal/compliance owner before public launch.</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
            <span className="badge badge-muted">Version 2.0</span>
            <span className="badge badge-muted">Effective: 1 June 2026</span>
            <span className="badge badge-muted">Owner: Legal</span>
          </div>
          {sections.map((s) => (
            <div key={s.title} style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>{s.title}</h3>
              <p className="text-soft" style={{ fontSize: '0.92rem', lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
