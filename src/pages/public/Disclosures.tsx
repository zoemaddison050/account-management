import PageHeader from '../../components/PageHeader';

const sections = [
  {
    title: 'Risk Disclosure',
    body: 'All investments carry risk, including the potential loss of principal. The value of portfolios may go down as well as up. Past performance does not guarantee future results. The account management service does not eliminate investment risk. This disclosure must be reviewed and approved by the compliance owner before launch.',
  },
  {
    title: 'Performance Reporting Methodology',
    body: 'Where performance figures are displayed, they are calculated using an approved methodology that accounts for fees, currency conversion, and timing rules. The calculation method, fees, and applicable assumptions are documented and available on request. Performance figures are not promotional unless separately approved by compliance.',
  },
  {
    title: 'No Guarantees',
    body: 'PrimeXchanges does not guarantee any return, outcome, or performance result. Any representation of performance must be approved by the compliance owner. The portal displays factual, verified data — not projections or promises.',
  },
  {
    title: 'Jurisdictional Limitations',
    body: 'The account management service is available only in approved jurisdictions. Eligibility is determined during the application review process. Operating jurisdictions and eligibility restrictions must be confirmed by the legal/compliance owner before public launch.',
  },
  {
    title: 'Complaints',
    body: 'A documented complaint-handling procedure will be published before launch. Complaints can be directed to support@primexchanges.com and will be handled in accordance with applicable regulatory requirements.',
  },
  {
    title: 'Data Source',
    body: 'Portfolio data displayed in the client portal is sourced from the approved PrimeXchanges data source — via official API, secure scheduled export, or authorized manual upload with four-eyes review. The portal does not scrape authenticated websites or use client credentials to obtain data.',
  },
];

export default function Disclosures() {
  return (
    <div className="fade-in">
      <section className="section">
        <div className="container-narrow">
          <PageHeader eyebrow="Legal" title="Disclosures" subtitle="Important information about risk, performance reporting, and the nature of the account management service." />
          <div className="alert alert-warning" style={{ marginBottom: 'var(--space-6)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div><strong>Placeholder content.</strong> All disclosures must be reviewed and approved by the compliance owner before public launch. Do not make financial performance claims without formal approval.</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
            <span className="badge badge-muted">Version 3.0</span>
            <span className="badge badge-muted">Effective: 15 March 2024</span>
            <span className="badge badge-muted">Owner: Compliance</span>
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
