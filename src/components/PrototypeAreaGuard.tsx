import { Link, Outlet } from 'react-router-dom';

interface PrototypeAreaGuardProps {
  area: string;
}

/**
 * Guards the client and admin routes. When VITE_ENABLE_DEMO_PORTALS is not
 * set to 'true', a secure-area notice is shown instead.
 */
export default function PrototypeAreaGuard({ area }: PrototypeAreaGuardProps) {
  if (import.meta.env.VITE_ENABLE_DEMO_PORTALS === 'true') {
    return <Outlet />;
  }

  return (
    <div className="fade-in" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 'var(--space-5)', background: 'var(--bg)' }}>
      <div className="card" style={{ maxWidth: '600px', textAlign: 'center', borderTop: '4px solid var(--brand-blue)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--space-3)' }}>Secure area unavailable</p>
        <h1 style={{ fontSize: '1.7rem', marginBottom: 'var(--space-3)' }}>{area} is not enabled</h1>
        <p className="text-soft" style={{ lineHeight: 1.65, marginBottom: 'var(--space-6)' }}>
          This area requires server-side authentication, MFA, role checks and audited data access.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/login" className="btn btn-primary">Client access information</Link>
          <Link to="/" className="btn btn-secondary">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
