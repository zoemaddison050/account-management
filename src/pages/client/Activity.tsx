import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { formatDate } from '../../data/mockData';
import { getClientActivity } from '../../lib/api';
import type { ActivityEvent } from '../../types';

const typeFilters = ['All', 'Valuation', 'Statement', 'Dividend', 'Fee', 'Allocation change', 'Sync'];

export default function Activity() {
  const [filter, setFilter] = useState('All');
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientActivity()
      .then((data) => {
        setActivities(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? activities : activities.filter((a) => a.type === filter);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Activity"
        title="Account Activity"
        subtitle="A read-only record of portfolio events, valuations, statements, and fees. Transactions or account changes cannot be initiated from this portal."
      />

      <div className="alert alert-info" style={{ marginBottom: 'var(--space-5)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>Activity is presented <strong>read-only</strong> and reflects data from the approved PrimeXchanges source. Source data availability determines which events appear here.</div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        {typeFilters.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className="btn"
            style={{
              padding: '0.4rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 500,
              background: filter === t ? 'var(--navy-800)' : 'var(--white)',
              color: filter === t ? 'var(--white)' : 'var(--ink-soft)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Activity timeline */}
      {loading ? (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <p className="text-muted">Loading account activity…</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id}>
                      <td className="mono" style={{ whiteSpace: 'nowrap' }}>{formatDate(a.date)}</td>
                      <td>
                        <span className={`badge ${a.type === 'Fee' ? 'badge-warning' : a.type === 'Dividend' ? 'badge-success' : a.type === 'Sync' ? 'badge-info' : 'badge-muted'}`}>
                          {a.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: 'var(--navy-800)' }}>{a.description}</td>
                      <td className="text-right fw-600">{a.amount || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filtered.length === 0 && (
            <EmptyState
              title="No activity to show"
              message="No activity events match this filter. Try selecting a different category."
            />
          )}
        </>
      )}
    </div>
  );
}
