import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import Logo from '../components/Logo';
import { demoClient } from '../data/mockData';
import { useAuth } from '../hooks/useAuth';
import { useCurrency } from '../lib/currency';

const clientNav = [
  { label: 'Dashboard', to: '/client/dashboard', icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z' },
  { label: 'Portfolio', to: '/client/portfolio', icon: 'M3 3v18h18M7 14l4-4 3 3 5-6' },
  { label: 'Activity', to: '/client/activity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Documents', to: '/client/documents', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6' },
  { label: 'Support', to: '/client/support', icon: 'M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 12h.01' },
  { label: 'Settings', to: '/client/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export default function ClientLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { session, logout } = useAuth();
  const { currency, setCurrency } = useCurrency();

  const clientName = session?.clientName || demoClient.name;
  const clientRef = session?.clientId || demoClient.reference;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header
        style={{
          background: 'var(--navy-900)',
          color: 'var(--white)',
          height: 'var(--header-h)',
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="container workspace-header-inner" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
            <Logo variant="light" />
            <span className="hide-mobile" style={{ color: 'var(--gold-400)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', borderLeft: '1px solid rgba(255,255,255,0.15)', paddingLeft: 'var(--space-4)' }}>
              Client Portal
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            {/* Currency Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span className="hide-mobile" style={{ fontSize: '0.75rem', color: 'var(--navy-300)', fontWeight: 600 }}>CURRENCY:</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{
                  background: 'var(--navy-800)',
                  color: 'var(--white)',
                  border: '1px solid var(--navy-700)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  padding: '4px 8px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD ($)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
            <div className="hide-mobile" style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--white)' }}>{clientName}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--navy-300)' }}>{clientRef}</p>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--navy-900)', fontSize: '0.9rem' }}>
              {clientName.split(' ').map((n) => n[0]).join('')}
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost hide-mobile"
              style={{ color: 'var(--navy-200)', fontSize: '0.85rem', border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
              Sign Out
            </button>
            <button
              type="button"
              className="btn btn-ghost nav-mobile-toggle"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle client navigation"
              aria-expanded={mobileMenuOpen}
              style={{ color: 'var(--white)', padding: '0.45rem' }}
            >
              {mobileMenuOpen ? '×' : '☰'}
            </button>
          </div>
        </div>
      </header>
 
      {mobileMenuOpen && (
        <nav className="workspace-mobile-nav" aria-label="Client navigation">
          {clientNav.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
          <button
            onClick={() => { setMobileMenuOpen(false); logout(); }}
            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.7rem 0.9rem', background: 'transparent', border: 'none', color: 'var(--white)', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </nav>
      )}

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: '240px',
            background: 'var(--white)',
            borderRight: '1px solid var(--line)',
            padding: 'var(--space-5) var(--space-3)',
            flexShrink: 0,
            position: 'sticky',
            top: 'var(--header-h)',
            height: 'calc(100vh - var(--header-h))',
            overflowY: 'auto',
          }}
          className="hide-mobile"
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {clientNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.7rem',
                  padding: '0.7rem 0.9rem',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--navy-800)' : 'var(--ink-soft)',
                  background: isActive ? 'var(--gold-100)' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all var(--dur) var(--ease)',
                  border: 'none',
                })}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}>
                  <path d={item.icon} />
                </svg>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--navy-50)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>Your Account Manager</p>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy-800)' }}>{demoClient.managerName}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '2px' }}>e.whitfield@primexchanges.com</p>
            <Link to="/client/support" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold-600)', display: 'inline-block', marginTop: 'var(--space-3)' }}>Contact →</Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="workspace-main" style={{ flex: 1, padding: 'var(--space-6) var(--space-6)', background: 'var(--bg)', minWidth: 0 }}>
          <div className="container" style={{ padding: 0, maxWidth: '1000px' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
