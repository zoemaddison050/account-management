import { Link } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

export default function Apply() {
  return (
    <div className="fade-in">
      <section className="section">
        <div className="container">
          <PageHeader
            eyebrow="Application Centre"
            title="Start with your application details"
            subtitle="We prepare the application document only after you enter your contact details and preferred account manager. Applying does not guarantee approval or create a client account."
          />

          <div className="application-journey">
            <div className="application-step application-step-active">
              <span>1</span>
              <div><strong>Enter details</strong><small>Name, email, residence and manager preference</small></div>
            </div>
            <div className="application-step">
              <span>2</span>
              <div><strong>Receive personal form</strong><small>Issued with your selected details included</small></div>
            </div>
            <div className="application-step">
              <span>3</span>
              <div><strong>Submit for review</strong><small>Controlled staff review and approval</small></div>
            </div>
          </div>

          <div className="application-start-grid">
            <div className="card application-primary-card">
              <div className="application-icon application-icon-blue" aria-hidden>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
              <span className="badge badge-info" style={{ alignSelf: 'flex-start', marginBottom: 'var(--space-3)' }}>Required first step</span>
              <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>Tell us who the document is for</h2>
              <p className="text-soft" style={{ fontSize: '0.96rem', lineHeight: 1.7, marginBottom: 'var(--space-5)' }}>
                Complete the short form first. It lets us prepare the applicant’s name and preferred account manager in a versioned application document.
              </p>
              <ul className="check-list" style={{ marginBottom: 'var(--space-6)' }}>
                <li>Your name and email address</li>
                <li>Country or region of residence</li>
                <li>Preferred account manager</li>
                <li>Contact and policy acknowledgement</li>
              </ul>
              <Link to="/apply/online" className="btn btn-primary btn-lg btn-block">Enter application details</Link>
            </div>

            <aside className="card application-document-preview">
              <div className="application-icon application-icon-orange" aria-hidden>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M8 13h8M8 17h5" /></svg>
              </div>
              <p className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Then you can download</p>
              <h2 style={{ fontSize: '1.35rem', marginBottom: 'var(--space-3)' }}>A personalised PDF</h2>
              <p className="text-soft" style={{ fontSize: '0.92rem', lineHeight: 1.65, marginBottom: 'var(--space-5)' }}>
                The PDF will show the applicant name, selected account manager, reference and version. Direct downloads are unavailable before step one.
              </p>
              <div className="alert alert-warning" style={{ padding: 'var(--space-3)', fontSize: '0.82rem' }}>
                <div><strong>Safety:</strong> the initial form never asks for banking details, passwords, wallet recovery phrases, API keys or identity documents.</div>
              </div>
            </aside>
          </div>

          <div className="alert alert-info" style={{ marginTop: 'var(--space-7)', maxWidth: '800px', marginInline: 'auto' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div><strong>Already an approved client?</strong> You do not need to apply again. <Link to="/login" style={{ fontWeight: 600 }}>Sign in to your portal →</Link></div>
          </div>
        </div>
      </section>
    </div>
  );
}
