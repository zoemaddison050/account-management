import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import Logo from '../components/Logo';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Apply', to: '/apply' },
  { label: 'Contact', to: '/contact' },
];

const policyLinks = [
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Disclosures', to: '/disclosures' },
];

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          background: 'var(--white)',
          borderBottom: '3px solid var(--brand-blue)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="container" style={{ height: 'var(--header-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
          <Logo />

          <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }} className="nav-desktop">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                style={({ isActive }) => ({
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  color: isActive ? 'var(--brand-blue-deep)' : 'var(--ink-soft)',
                  textDecoration: 'none',
                  padding: '0.3rem 0',
                  borderBottom: isActive ? '2px solid var(--brand-orange)' : '2px solid transparent',
                  transition: 'all var(--dur) var(--ease)',
                })}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Link to="/login" className="btn btn-ghost nav-desktop">Sign In</Link>
            <Link to="/apply" className="btn btn-primary">Apply Now</Link>
            <button
              className="btn btn-ghost nav-mobile-toggle"
              style={{ padding: '0.5rem' }}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
              </svg>
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ borderTop: '1px solid var(--line)', padding: 'var(--space-3) var(--space-5)' }}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                style={({ isActive }) => ({
                  display: 'block',
                  fontWeight: 500,
                  fontSize: '0.95rem',
                  color: isActive ? 'var(--brand-blue-deep)' : 'var(--ink-soft)',
                  textDecoration: 'none',
                  padding: '0.6rem 0',
                  borderBottom: '1px solid var(--line-soft)',
                })}
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ display: 'block', fontWeight: 500, fontSize: '0.95rem', color: 'var(--ink-soft)', textDecoration: 'none', padding: '0.6rem 0' }}>Sign In</Link>
          </div>
        )}
      </header>

      {/* Main */}
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer style={{ background: 'var(--navy-900)', color: 'var(--navy-200)', paddingBlock: 'var(--space-8) var(--space-6)' }}>
        <div className="container">
          <div className="responsive-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 'var(--space-7)', marginBottom: 'var(--space-6)' }}>
            <div>
              <Logo variant="light" />
              <p style={{ fontSize: '0.88rem', color: 'var(--navy-200)', marginTop: 'var(--space-4)', maxWidth: '35ch', lineHeight: 1.6 }}>
                A managed portfolio service for approved clients of Prime Exchanges. Read-only, verified, and transparent — your portfolio, simplified.
              </p>
            </div>
            <div>
              <h4 style={{ color: 'var(--white)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>Service</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {navLinks.map((l) => (
                  <li key={l.to}><Link to={l.to} style={{ color: 'var(--navy-200)', fontSize: '0.88rem' }}>{l.label}</Link></li>
                ))}
                <li><Link to="/login" style={{ color: 'var(--navy-200)', fontSize: '0.88rem' }}>Client Sign In</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: 'var(--white)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>Legal</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {policyLinks.map((l) => (
                  <li key={l.to}><Link to={l.to} style={{ color: 'var(--navy-200)', fontSize: '0.88rem' }}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 style={{ color: 'var(--white)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>Support</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <li><a href="mailto:support@primexchanges.com" style={{ color: 'var(--navy-200)', fontSize: '0.88rem' }}>support@primexchanges.com</a></li>
                <li style={{ color: 'var(--navy-200)', fontSize: '0.88rem' }}>Response times are confirmed by the support team</li>
              </ul>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', marginBlock: 'var(--space-5)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--navy-300)' }}>
              © 2026 Prime Exchanges. All rights reserved.
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--navy-300)' }}>
              Information shown is read-only and for approved clients only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
