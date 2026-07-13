import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

const journey = [
  {
    phase: 'Phase 1',
    title: 'Prepare Your Application',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    items: [
      'Visit the Application Centre and complete the short details form first.',
      'Provide basic contact details, residence and an optional account-manager preference.',
      'The service creates a reference and prepares a versioned PDF with your approved details included.',
      'You receive a controlled acknowledgement and, after verification, a time-limited link to the final document.',
    ],
  },
  {
    phase: 'Phase 2',
    title: 'Staff Review',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    items: [
      'Your completed application enters a controlled internal review queue.',
      'An assigned reviewer checks eligibility and completeness.',
      'If more information is needed, staff contact you through an approved secure channel — never asking for passwords or credentials by email.',
      'The review process is auditable: every status change is logged with who, when, and why.',
    ],
  },
  {
    phase: 'Phase 3',
    title: 'Approval & Invitation',
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    items: [
      'A compliance approver makes the formal decision to approve or decline.',
      'If approved, an administrator issues a single-use, expiring invitation.',
      'You receive an invitation email with a secure link to create your account.',
      'The invitation expires — it cannot be reused or shared.',
    ],
  },
  {
    phase: 'Phase 4',
    title: 'Your Secure Dashboard',
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7',
    items: [
      'Log in with your credentials to access the read-only client portal.',
      'View published portfolio values, holdings and allocation where the approved source supports them.',
      'Access approved statements and documents.',
      'Contact your assigned account manager through the portal.',
      'Every value shows its "as of" timestamp and data-freshness status.',
    ],
  },
];

const statusFlow = [
  { status: 'Inquiry submitted', desc: 'Online request received' },
  { status: 'Application received', desc: 'Completed form logged' },
  { status: 'Under review', desc: 'Eligibility checks in progress' },
  { status: 'Approval pending', desc: 'Compliance decision awaited' },
  { status: 'Active client', desc: 'Invitation accepted, portal linked' },
];

export default function HowItWorks() {
  return (
    <div className="fade-in">
      <section className="section">
        <div className="container">
          <PageHeader
            eyebrow="The Client Journey"
            title="How the account management service works"
            subtitle="From your first details form to viewing approved portfolio information — a transparent, human-reviewed process at every step."
          />

          {/* Journey phases */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {journey.map((phase, idx) => (
              <div key={phase.title} className="card" style={{ display: 'flex', gap: 'var(--space-5)' }}>
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--navy-800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={phase.icon} />
                    </svg>
                  </div>
                  {idx < journey.length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--line)', marginTop: 'var(--space-3)', minHeight: '30px' }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: idx < journey.length - 1 ? 'var(--space-3)' : 0 }}>
                  <p className="eyebrow" style={{ marginBottom: 'var(--space-1)' }}>{phase.phase}</p>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: 'var(--space-4)' }}>{phase.title}</h3>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {phase.items.map((item, i) => (
                      <li key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gold-500)', marginTop: '0.6em', flexShrink: 0 }} />
                        <span className="text-soft" style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Status flow */}
          <div className="card" style={{ marginTop: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-5)' }}>Application status lifecycle</h3>
            <div style={{ display: 'flex', gap: 'var(--space-3)', overflowX: 'auto', paddingBottom: 'var(--space-2)' }}>
              {statusFlow.map((s, i) => (
                <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
                  <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--navy-50)', borderRadius: 'var(--radius)', border: '1px solid var(--line)', minWidth: '180px' }}>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--navy-800)' }}>{s.status}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '2px' }}>{s.desc}</p>
                  </div>
                  {i < statusFlow.length - 1 && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold-500)" strokeWidth="2" style={{ flexShrink: 0 }}>
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: 'var(--space-4)' }}>
              Additional statuses include <em>Information requested</em>, <em>Approved — activation pending</em>, <em>Declined</em>, and <em>Paused / closed</em>. Every change is logged with actor, time, and reason.
            </p>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: 'var(--space-7)' }}>
            <Link to="/apply" className="btn btn-primary btn-lg">Ready to apply? Start here →</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
