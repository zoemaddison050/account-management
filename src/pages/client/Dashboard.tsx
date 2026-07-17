import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import FreshnessIndicator from '../../components/FreshnessIndicator';
import { getCurrentClient, getClientActivity, getClientDocuments } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import type { ClientProfile, ActivityEvent, ClientDocument } from '../../types';
import { demoClient, formatDate } from '../../data/mockData';
import { useCurrency } from '../../lib/currency';

export default function Dashboard() {
  const { formatCurrency } = useCurrency();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    Promise.all([
      getCurrentClient(),
      getClientActivity(),
      getClientDocuments()
    ])
      .then(([clientData, activityData, documentData]) => {
        if (!cancelled) {
          setProfile(clientData);
          setActivities(activityData);
          setDocuments(documentData);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unable to load your profile.';

        // If the session is invalid or expired, sign the user out and send
        // them back to the login page.
        if (message.includes('401') || message.includes('403')) {
          logout();
          navigate('/login', { replace: true });
          return;
        }

        setError(message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [logout, navigate]);

  const portfolios = profile?.portfolios || [];
  const totalValue = portfolios.reduce((sum, p) => sum + p.totalValue, 0);
  const recentActivity = activities.slice(0, 4);
  const recentDocs = documents.slice(0, 3);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Welcome back"
        title={`Hello, ${profile ? profile.name.split(' ')[0] : demoClient.name.split(' ')[0]}`}
        subtitle="Here's a summary of your managed portfolio. All values are verified and read-only."
      />

      {loading && (
        <div className="alert alert-info" style={{ marginBottom: 'var(--space-6)' }}>
          Loading your profile…
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>
          {error}
        </div>
      )}

      {!loading && profile && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', background: 'var(--navy-50)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginBottom: '2px' }}>Signed in as</p>
              <p style={{ fontWeight: 600, color: 'var(--navy-800)' }}>{profile.name}</p>
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>{profile.email}</p>
            </div>
            <span className={`badge badge-${profile.status === 'active' ? 'success' : 'muted'}`}>{profile.status}</span>
          </div>
        </div>
      )}

      {/* Read-only notice */}
      <div className="alert alert-info" style={{ marginBottom: 'var(--space-6)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          This portal is <strong>informational and read-only</strong>. For any account changes, trades, or transfers, contact your account manager directly. This is not the channel for urgent trading or payment instructions.
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <StatCard label="Total Portfolio Value" value={formatCurrency(totalValue)} hint="Across all portfolios" accent="gold" />
        <StatCard label="Portfolios" value={String(portfolios.length)} hint="Active allocations" accent="navy" />
        <StatCard label="Account Manager" value={profile?.managerName || 'Unassigned'} hint={profile?.managerName ? `${profile.managerName.toLowerCase().replace(' ', '.')}@primexchanges.com` : 'support@primexchanges.com'} accent="navy" />
        <StatCard label="Client Since" value={profile ? formatDate(profile.since) : '—'} hint={`Reference: ${profile?.clientId || '—'}`} accent="navy" />
      </div>

      {/* Portfolio summary */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
          <h3 style={{ fontSize: '1.15rem' }}>Portfolio Summary</h3>
          <Link to="/client/portfolio" className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>View details →</Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {portfolios.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', background: 'var(--navy-50)', borderRadius: 'var(--radius)', border: '1px border var(--line)' }}>
              <p className="text-muted" style={{ fontSize: '0.92rem' }}>No active investment portfolios have been allocated to your account yet.</p>
            </div>
          ) : (
            portfolios.map((p) => (
              <div key={p.id} style={{ padding: 'var(--space-4)', background: 'var(--navy-50)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--navy-800)' }}>{p.name}</p>
                    <p className="mono text-muted" style={{ fontSize: '0.78rem', marginTop: '2px' }}>{p.externalAccountId}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 600, color: 'var(--navy-800)' }}>{formatCurrency(p.totalValue)}</p>
                    <FreshnessIndicator status={p.syncStatus} asOf={p.asOf} />
                  </div>
                </div>
                <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Currency: <strong style={{ color: 'var(--ink-soft)' }}>{p.currency}</strong></span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Holdings: <strong style={{ color: 'var(--ink-soft)' }}>{p.holdings.length}</strong></span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Basis: <strong style={{ color: 'var(--ink-soft)' }}>{p.valuationBasis}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Two-column: Recent activity + Recent documents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }} className="responsive-grid">
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '1rem' }}>Recent Activity</h3>
            <Link to="/client/activity" className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentActivity.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.85rem', padding: 'var(--space-3)' }}>No recent activity records.</p>
            ) : (
              recentActivity.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--line-soft)' }}>
                  <div style={{ flexShrink: 0, width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--gold-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-600)' }}>{a.type[0]}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy-800)' }}>{a.description}</p>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', fontSize: '0.78rem', color: 'var(--ink-muted)' }}>
                      <span>{formatDate(a.date)}</span>
                      <span className="badge badge-muted" style={{ fontSize: '0.7rem' }}>{a.type}</span>
                      {a.amount && <span className="fw-600">{a.amount}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: '1rem' }}>Recent Documents</h3>
            <Link to="/client/documents" className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>All →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {recentDocs.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.85rem', padding: 'var(--space-3)' }}>No published documents.</p>
            ) : (
              recentDocs.map((d) => (
                <div key={d.id} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--line-soft)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--navy-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{formatDate(d.publishedAt)} · {d.sizeLabel}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Data freshness */}
      {portfolios.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--space-6)', background: 'var(--navy-50)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Data Freshness</h3>
          <p className="text-soft" style={{ fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
            Portfolio data is synced from the approved PrimeXchanges source and reconciled before publication. Values show their actual "as of" timestamp — they are never labeled as "live" unless verified in real-time.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
            {portfolios.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy-700)' }}>{p.name}</p>
                <FreshnessIndicator status={p.syncStatus} lastSync={p.lastSync} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
