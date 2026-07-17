import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import FreshnessIndicator from '../../components/FreshnessIndicator';
import { getCurrentClient } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import type { ClientProfile } from '../../types';
import { formatDate, portfolioHistory } from '../../data/mockData';
import { useCurrency } from '../../lib/currency';

const holdingTypeColors: Record<string, string> = {
  Equity: '#244d8a',
  Bond: '#c9a86a',
  Fund: '#3a66a8',
  Cash: '#6390c8',
  Commodity: '#a07d3f',
  Crypto: '#8b5cf6', // Purple for Crypto
  Forex: '#06b6d4',  // Cyan for Forex
  Other: '#6b7d9a',
};

export default function Portfolio() {
  const { formatCurrency } = useCurrency();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCurrentClient()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Unable to load your profile.';
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
  const hasPortfolios = portfolios.length > 0;
  const portfolio = hasPortfolios ? portfolios[selectedIdx] : null;

  // Build allocation data
  const allocationData = portfolio
    ? portfolio.holdings
        .map((h) => ({ name: h.instrument, type: h.type, pct: h.allocationPct, value: h.value }))
        .sort((a, b) => b.pct - a.pct)
    : [];

  // Allocation by type
  const typeAllocation = portfolio
    ? portfolio.holdings.reduce<Record<string, number>>((acc, h) => {
        acc[h.type] = (acc[h.type] || 0) + h.allocationPct;
        return acc;
      }, {})
    : {};
  const typeEntries = Object.entries(typeAllocation).sort((a, b) => b[1] - a[1]);

  // Value history chart points — filter by selected portfolio
  const portfolioHistoryFiltered = portfolio
    ? portfolioHistory.filter((s) => s.portfolioId === portfolio.id)
    : [];
  const hasHistory = portfolioHistoryFiltered.length > 0;
  const historyPoints = portfolioHistoryFiltered.map((s, i) => ({
    x: (i / (portfolioHistoryFiltered.length - 1 || 1)) * 100,
    y: s.totalValue,
    date: s.date,
  }));
  const minVal = hasHistory ? Math.min(...historyPoints.map((p) => p.y)) : 0;
  const maxVal = hasHistory ? Math.max(...historyPoints.map((p) => p.y)) : 0;
  const range = hasHistory ? (maxVal - minVal || 1) : 1;
  const chartH = 160;
  const chartW = 100;

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Portfolio"
        title="Holdings & Allocation"
        subtitle="Your verified portfolio holdings, allocation breakdown, and value history. All data is read-only."
      />

      {loading && (
        <div className="alert alert-info" style={{ marginBottom: 'var(--space-6)' }}>
          Loading your portfolio details…
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-6)' }}>
          {error}
        </div>
      )}

      {!loading && !hasPortfolios && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p className="text-muted" style={{ fontSize: '1rem', fontWeight: 500 }}>
            No investment portfolios found.
          </p>
          <p className="text-soft" style={{ fontSize: '0.88rem', marginTop: 'var(--space-2)' }}>
            Your account is currently clean and empty. Once your account manager allocates your investments, they will show up here.
          </p>
        </div>
      )}

      {!loading && hasPortfolios && portfolio && (
        <>
          {/* Portfolio selector */}
          {portfolios.length > 1 && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
              {portfolios.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedIdx(i)}
                  className="btn"
                  style={{
                    background: i === selectedIdx ? 'var(--navy-800)' : 'var(--white)',
                    color: i === selectedIdx ? 'var(--white)' : 'var(--ink-soft)',
                    border: '1px solid var(--line)',
                    fontSize: '0.88rem',
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Value + freshness */}
          <div className="card" style={{ marginBottom: 'var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Value</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--navy-800)' }}>{formatCurrency(portfolio.totalValue)}</p>
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>{portfolio.valuationBasis}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <FreshnessIndicator status={portfolio.syncStatus} asOf={portfolio.asOf} />
              <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 'var(--space-2)' }}>Last sync: {formatDate(portfolio.lastSync)}</p>
              <p className="mono text-muted" style={{ fontSize: '0.78rem' }}>{portfolio.externalAccountId}</p>
            </div>
          </div>

          {/* Value history chart */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>Value History</h3>
            {hasHistory ? (
              <>
                <div style={{ position: 'relative', width: '100%' }}>
                  <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" style={{ width: '100%', height: '160px', display: 'block' }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(201,168,106,0.3)" />
                        <stop offset="100%" stopColor="rgba(201,168,106,0)" />
                      </linearGradient>
                    </defs>
                    {/* Area */}
                    <path
                      d={`M ${historyPoints.map((p) => `${p.x},${chartH - ((p.y - minVal) / range) * (chartH - 20) - 10}`).join(' L ')} L 100,${chartH} L 0,${chartH} Z`}
                      fill="url(#chartGrad)"
                    />
                    {/* Line */}
                    <path
                      d={`M ${historyPoints.map((p) => `${p.x},${chartH - ((p.y - minVal) / range) * (chartH - 20) - 10}`).join(' L ')}`}
                      fill="none"
                      stroke="var(--gold-500)"
                      strokeWidth="0.8"
                      vectorEffect="non-scaling-stroke"
                    />
                    {/* Points */}
                    {historyPoints.map((p, i) => (
                      <circle key={i} cx={p.x} cy={chartH - ((p.y - minVal) / range) * (chartH - 20) - 10} r="1.5" fill="var(--navy-700)" />
                    ))}
                  </svg>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                    {historyPoints.map((p) => (
                      <span key={p.date} style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{formatDate(p.date)}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Period Low</p>
                    <p className="fw-600" style={{ fontSize: '0.9rem', color: 'var(--danger)' }}>{formatCurrency(minVal)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Period High</p>
                    <p className="fw-600" style={{ fontSize: '0.9rem', color: 'var(--success)' }}>{formatCurrency(maxVal)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Change</p>
                    <p className="fw-600" style={{ fontSize: '0.9rem', color: 'var(--success)' }}>
                      +{formatCurrency(maxVal - minVal)} ({((maxVal - minVal) / minVal * 100).toFixed(1)}%)
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>No verified value history is available for this portfolio yet.</p>
                <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: 'var(--space-2)' }}>If you believe this is an error, contact your account manager.</p>
              </div>
            )}
            <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 'var(--space-3)', fontStyle: 'italic' }}>
              Performance shown uses verified snapshots. Past performance does not guarantee future results.
            </p>
          </div>

          {/* Allocation by type */}
          <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>Allocation by Type</h3>
            <div style={{ display: 'flex', height: '24px', borderRadius: 'var(--radius-full)', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
              {typeEntries.map(([type, pct], i) => (
                <div key={type} style={{ width: `${pct}%`, background: holdingTypeColors[type] || '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white', fontWeight: 600, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.3)' : 'none' }} title={`${type}: ${pct.toFixed(1)}%`}>
                  {pct > 8 && `${pct.toFixed(0)}%`}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
              {typeEntries.map(([type, pct]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: holdingTypeColors[type] || '#999' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{type}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy-800)' }}>{pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Holdings table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
              <h3 style={{ fontSize: '1.05rem' }}>Holdings Detail</h3>
            </div>
            <div className="table-wrap" style={{ border: 'none', marginTop: 'var(--space-4)' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Instrument</th>
                    <th>Type</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Value</th>
                    <th className="text-right">Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {allocationData.map((h) => (
                    <tr key={h.name}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ width: '4px', height: '20px', borderRadius: '2px', background: holdingTypeColors[h.type] || '#999', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>{h.name}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-muted">{h.type}</span></td>
                      <td className="text-right mono">–</td>
                      <td className="text-right fw-600">{formatCurrency(h.value)}</td>
                      <td className="text-right">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                          <div style={{ width: '60px', height: '6px', background: 'var(--line-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${h.pct}%`, height: '100%', background: holdingTypeColors[h.type] || '#999' }} />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, minWidth: '45px', textAlign: 'right' }}>{h.pct.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
