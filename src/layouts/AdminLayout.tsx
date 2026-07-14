import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../hooks/useAuth';

const adminNav = [
  { label: 'Applications', to: '/admin/applications', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: '8' },
  { label: 'Clients', to: '/admin/clients', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8z', badge: '6' },
  { label: 'Managers', to: '/admin/managers', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { label: 'Portfolio Sync', to: '/admin/portfolio-sync', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { label: 'Documents', to: '/admin/documents', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { label: 'Audit Log', to: '/admin/audit', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { session, logout } = useAuth();

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
              Admin Workspace
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div className="hide-mobile" style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--white)' }}>{session?.clientName || 'Staff Member'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--navy-300)' }}>{session?.role || 'Staff'}</p>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--navy-400), var(--navy-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--white)', fontSize: '0.9rem' }}>
              {(session?.clientName || 'S')[0]}
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
              aria-label="Toggle admin navigation"
              aria-expanded={mobileMenuOpen}
              style={{ color: 'var(--white)', padding: '0.45rem' }}
            >
              {mobileMenuOpen ? '×' : '☰'}
            </button>
          </div>
        </div>
      </header>
 
      {mobileMenuOpen && (
        <nav className="workspace-mobile-nav" aria-label="Admin navigation">
          {adminNav.map((item) => (
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
            width: '250px',
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
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 0.9rem', marginBottom: 'var(--space-3)' }}>
            Internal
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {adminNav.map((item) => (
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
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--navy-800)', color: 'var(--white)', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-full)' }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--danger-bg)', borderRadius: 'var(--radius)', border: '1px solid #f0c8c8' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--danger)', lineHeight: 1.5 }}>
              All actions are logged in the immutable audit trail.
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="workspace-main" style={{ flex: 1, padding: 'var(--space-6)', background: 'var(--bg)', minWidth: 0 }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
