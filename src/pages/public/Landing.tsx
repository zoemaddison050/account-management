import { Link } from 'react-router-dom';
import SectionTitle from '../../components/SectionTitle';

const services = [
  {
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    title: 'Clear Portfolio Reporting',
    text: 'A read-only dashboard designed to present approved portfolio information with clear timestamps, currency labels and data-freshness context.',
  },
  {
    icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    title: 'Invitation-Only Access',
    text: 'Client accounts are created only after a staff review and formal approval. No application automatically becomes an account.',
  },
  {
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    title: 'Transparent Reporting',
    text: 'Clear valuation timestamps, currency labels, and data-freshness indicators. You always know what you are looking at and when it was last verified.',
  },
  {
    icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 110-8 4 4 0 010 8z',
    title: 'Dedicated Account Manager',
    text: 'Every approved client is assigned a personal account manager who understands your portfolio and is your direct point of contact.',
  },
];

const steps = [
  { num: '01', title: 'Enter Your Details', text: 'Complete a short application-details form. No sensitive documents are requested at this stage.' },
  { num: '02', title: 'Personalised Form', text: 'After the secure request step, an approved application document is prepared with your name and manager preference.' },
  { num: '03', title: 'Staff Review', text: 'Our team reviews the completed application, checks eligibility and contacts you through approved channels.' },
  { num: '04', title: 'Approval & Invitation', text: 'If approved, you receive a single-use, expiring invitation to access the secure client portal.' },
];

export default function Landing() {
  return (
    <div className="fade-in">
      {/* Hero */}
      <section
        style={{
          background: 'linear-gradient(126deg, var(--navy-900) 0%, var(--navy-800) 54%, #087eae 100%)',
          color: 'var(--white)',
          paddingBlock: 'var(--space-9)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,174,240,0.25) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-30%', left: '-5%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,173,18,0.18) 0%, transparent 70%)' }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '640px' }}>
            <p style={{ color: 'var(--gold-400)', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 'var(--space-4)' }}>
              PrimeXchanges · Managed Account Service
            </p>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', color: 'var(--white)', lineHeight: 1.15, marginBottom: 'var(--space-5)' }}>
              Your portfolio,<br />
              <span style={{ color: 'var(--gold-400)' }}>clearly in view.</span>
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--navy-200)', lineHeight: 1.7, maxWidth: '52ch', marginBottom: 'var(--space-6)' }}>
              A streamlined account-management experience for approved clients — designed to keep portfolio information, documents and support in one clear, secure place.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <Link to="/apply" className="btn btn-primary btn-lg">Apply for Account Management</Link>
              <Link to="/how-it-works" className="btn btn-secondary btn-lg" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--white)', borderColor: 'rgba(255,255,255,0.2)' }}>
                How It Works
              </Link>
            </div>
            <div style={{ marginTop: 'var(--space-7)', display: 'flex', gap: 'var(--space-7)', flexWrap: 'wrap' }}>
              {[
                { stat: 'Read-only', label: 'No trades through the portal' },
                { stat: 'Source-led', label: 'Data is only published after review' },
                { stat: 'Invitation-only', label: 'Approval required before access' },
              ].map((item) => (
                <div key={item.stat}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--gold-400)' }}>{item.stat}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--navy-300)' }}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Service overview */}
      <section className="section">
        <div className="container">
          <SectionTitle
            eyebrow="What we offer"
            title="A simpler way to stay informed about your managed portfolio"
            subtitle="The portal is the relationship and reporting layer — not the trading engine. PrimeXchanges remains the source platform for all trading and portfolio records."
            center
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-5)' }}>
            {services.map((s) => (
              <div key={s.title} className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius)', background: 'var(--navy-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--brand-blue-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.icon} />
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: 'var(--space-2)' }}>{s.title}</h3>
                <p className="text-soft" style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works preview */}
      <section style={{ background: 'var(--navy-50)', paddingBlock: 'var(--space-8)' }}>
        <div className="container">
          <SectionTitle eyebrow="The journey" title="From inquiry to your secure dashboard" center />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-5)' }}>
            {steps.map((step) => (
              <div key={step.num} style={{ position: 'relative', padding: 'var(--space-5)' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '2.3rem', fontWeight: 800, color: 'var(--brand-blue)', marginBottom: 'var(--space-2)' }}>{step.num}</p>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>{step.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>{step.text}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-7)' }}>
            <Link to="/how-it-works" className="btn btn-dark">See the full process →</Link>
          </div>
        </div>
      </section>

      {/* Trust / principles */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', alignItems: 'center' }} className="responsive-grid">
            <div>
              <SectionTitle eyebrow="Our principles" title="Accurate before attractive" />
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {[
                  'Never display estimated, stale, or unverified values as if they are live.',
                  'Applying is not the same as becoming a client — approval is a separate, controlled step.',
                  'Collect only the information genuinely required at each stage.',
                  'A staff member approves applications, validates data, and handles exceptions.',
                  'Show what happens next, who will respond, and when data was last updated.',
                ].map((principle, i) => (
                  <li key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-soft" style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{principle}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--navy-800), var(--navy-700))', color: 'var(--white)', border: 'none' }}>
              <p style={{ color: 'var(--gold-400)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>Ready to begin?</p>
              <h3 style={{ color: 'var(--white)', fontSize: '1.6rem', marginBottom: 'var(--space-3)' }}>Start your account management request</h3>
              <p style={{ color: 'var(--navy-200)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: 'var(--space-5)' }}>
                Begin with your details. The secure service then prepares the personalised, versioned application document for review.
              </p>
              <Link to="/apply" className="btn btn-primary btn-lg btn-block">Go to Application Centre</Link>
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--navy-300)', marginTop: 'var(--space-3)' }}>
                Already a client? <Link to="/login" style={{ color: 'var(--gold-400)' }}>Sign in →</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
