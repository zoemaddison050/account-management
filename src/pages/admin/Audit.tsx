import { useState } from 'react';
import PageHeader from '../../components/PageHeader';
import { auditEvents, formatDateTime } from '../../data/mockData';

const severityFilters = ['All', 'info', 'warning', 'critical'];
const severityLabels: Record<string, string> = { info: 'Info', warning: 'Warning', critical: 'Critical' };
const severityBadges: Record<string, string> = { info: 'badge-info', warning: 'badge-warning', critical: 'badge-danger' };

export default function Audit() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('All');

  const filtered = auditEvents.filter((e) => {
    const matchesSearch = !search || e.actor.toLowerCase().includes(search.toLowerCase()) || e.action.toLowerCase().includes(search.toLowerCase()) || e.target.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severity === 'All' || e.severity === severity;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Internal · Audit"
        title="Audit Log"
        subtitle="Searchable, immutable audit trail for sensitive staff and client actions. Every approval, role change, invitation, and data publication is recorded."
      />

      {/* Immutable notice */}
      <div className="alert alert-danger" style={{ marginBottom: 'var(--space-5)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div><strong>Immutable:</strong> Audit events cannot be modified or deleted. This trail is the authoritative record for compliance, incident response, and access review.</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <input
          type="text"
          id="auditSearch"
          name="auditSearch"
          className="form-control"
          style={{ maxWidth: '350px' }}
          placeholder="Search by actor, action, or target..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search audit events"
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {severityFilters.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className="btn"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 500,
                background: severity === s ? 'var(--navy-800)' : 'var(--white)',
                color: severity === s ? 'var(--white)' : 'var(--ink-soft)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-full)',
              }}
            >
              {s === 'All' ? 'All' : severityLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Audit timeline */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table className="data">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Severity</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="mono" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', color: 'var(--ink-muted)' }}>{formatDateTime(e.timestamp)}</td>
                  <td><span className={`badge ${severityBadges[e.severity]}`}>{severityLabels[e.severity]}</span></td>
                  <td style={{ fontWeight: 500, fontSize: '0.88rem' }}>{e.actor}</td>
                  <td style={{ fontSize: '0.88rem', color: 'var(--navy-800)' }}>{e.action}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{e.target}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', maxWidth: '280px' }}>{e.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-muted text-center" style={{ padding: 'var(--space-6)' }}>No audit events match your filters.</p>
        )}
      </div>

      <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: 'var(--space-4)' }}>
        Showing {filtered.length} of {auditEvents.length} events. In production, this log would include all role changes, approvals, invitations, document access, and data publication events.
      </p>
    </div>
  );
}
