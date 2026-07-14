import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { statusColors, formatDateTime, relativeTime } from '../../data/mockData';
import type { Application } from '../../types';
import {
  getAdminStats,
  getAdminApplications,
  getAdminApplicationDetail,
  updateApplicationStatus,
  addApplicationNote
} from '../../lib/api';

const statusFilters = ['All', 'Inquiry submitted', 'Form downloaded', 'Application received', 'Under review', 'Information requested', 'Approval pending', 'Approved — activation pending', 'Active client', 'Declined', 'Paused / closed'];

export default function Applications() {
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState<Application | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Application | null>(null);
  const [search, setSearch] = useState('');
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, declined: 0 });

  const fetchApps = () => {
    setLoading(true);
    getAdminApplications(filter === 'All' ? undefined : filter, search || undefined)
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchApps();
  }, [filter, search]);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {});
  }, [apps]);

  const selectApp = (app: Application) => {
    setSelected(app);
    setSelectedDetail(null);
    getAdminApplicationDetail(app.id)
      .then((detail) => setSelectedDetail(detail))
      .catch(() => setSelectedDetail(app));
  };

  const handleAddNote = () => {
    if (!selected || !noteText.trim()) return;
    addApplicationNote(selected.id, noteText.trim())
      .then(() => {
        setNoteText('');
        return getAdminApplicationDetail(selected.id);
      })
      .then((detail) => {
        setSelectedDetail(detail);
        setApps(prev => prev.map(a => a.id === selected.id ? { ...a, lastUpdated: new Date().toISOString() } : a));
      })
      .catch(() => {});
  };

  const handleUpdateStatus = (status: string) => {
    if (!selected) return;
    const reason = prompt(`Enter reason for changing status to "${status}":`);
    if (reason === null) return; // cancelled
    updateApplicationStatus(selected.id, status, reason || undefined)
      .then(() => {
        fetchApps();
        return getAdminApplicationDetail(selected.id);
      })
      .then((detail) => {
        setSelectedDetail(detail);
        setSelected(detail);
      })
      .catch(() => {});
  };

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Internal · Applications"
        title="Application Review Queue"
        subtitle="Review, assign, and process applications through the controlled status workflow. Every action is logged in the audit trail."
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Total', value: stats.total, accent: 'navy' },
          { label: 'Pending Review', value: stats.pending, accent: 'gold' },
          { label: 'Approved', value: stats.approved, accent: 'success' },
          { label: 'Declined', value: stats.declined, accent: 'danger' },
        ].map((s) => (
          <div key={s.label} className="card card-pad-tight" style={{ borderLeft: `4px solid var(--${s.accent === 'gold' ? 'gold-500' : s.accent === 'navy' ? 'navy-500' : s.accent})` }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--navy-800)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          id="appSearch"
          name="appSearch"
          className="form-control"
          style={{ maxWidth: '300px' }}
          placeholder="Search by name, reference, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search applications"
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', flex: 1 }}>
          {statusFilters.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className="btn"
              style={{
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
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
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <p className="text-muted">Loading applications queue…</p>
          </div>
        ) : (
          <>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Applicant</th>
                    <th>Country</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Reviewer</th>
                    <th>Updated</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((a) => (
                    <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => selectApp(a)}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--navy-700)' }}>{a.reference}</td>
                      <td>
                        <p style={{ fontWeight: 500, color: 'var(--navy-800)' }}>{a.applicantName}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{a.email}</p>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>{a.country}</td>
                      <td>
                        <span className="badge badge-muted">{a.route === 'online' ? 'Online' : 'PDF'}</span>
                      </td>
                      <td><span className={`badge ${statusColors[a.status] || 'badge-muted'}`}>{a.status}</span></td>
                      <td style={{ fontSize: '0.85rem', color: a.assignedReviewer === 'Unassigned' ? 'var(--ink-muted)' : 'var(--ink-soft)' }}>{a.assignedReviewer}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }} title={formatDateTime(a.lastUpdated)}>{relativeTime(a.lastUpdated)}</td>
                      <td>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" style={{ opacity: 0.5 }}><path d="M9 5l7 7-7 7" /></svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {apps.length === 0 && (
              <EmptyState
                title="No applications found"
                message="No applications match your current search or filter. Try adjusting your criteria."
              />
            )}
          </>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(7,22,48,0.5)', zIndex: 200, display: 'flex', justifyContent: 'flex-end', animation: 'fadeIn 0.2s ease' }}
          onClick={() => { setSelected(null); setSelectedDetail(null); }}
        >
          <div
            style={{ width: '480px', maxWidth: '100%', background: 'var(--white)', height: '100%', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', padding: 'var(--space-6)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-5)' }}>
              <div>
                <p className="mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy-600)' }}>{selected.reference}</p>
                <h2 style={{ fontSize: '1.4rem', marginTop: 'var(--space-1)' }}>{selected.applicantName}</h2>
              </div>
              <button onClick={() => { setSelected(null); setSelectedDetail(null); }} className="btn btn-ghost" style={{ padding: '0.3rem' }} aria-label="Close detail panel">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <span className={`badge ${statusColors[selected.status] || 'badge-muted'}`} style={{ marginBottom: 'var(--space-5)' }}>{selected.status}</span>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
              {[
                { label: 'Email', value: selected.email },
                { label: 'Country', value: selected.country },
                { label: 'Route', value: selected.route === 'online' ? 'Online request form' : 'Downloadable PDF' },
                { label: 'Assigned reviewer', value: selected.assignedReviewer },
                { label: 'Submitted', value: formatDateTime(selected.submittedAt) },
                { label: 'Last updated', value: formatDateTime(selected.lastUpdated) },
              ].map((d) => (
                <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)', flexShrink: 0 }}>{d.label}</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy-800)', textAlign: 'right' }}>{d.value}</span>
                </div>
              ))}
            </div>

            <hr className="divider" />

            {/* Notes / timeline */}
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)' }}>Notes & Timeline</h3>
            {!selectedDetail ? (
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Loading notes & audit trail…</p>
            ) : selectedDetail.notes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {selectedDetail.notes.map((n, i) => (
                  <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--navy-50)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy-700)' }}>{n.author}</span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--ink-muted)' }}>{formatDateTime(n.date)}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', lineHeight: 1.5 }}>{n.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>No notes recorded yet.</p>
            )}

            {/* Add note */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <textarea
                className="form-control"
                placeholder="Add an internal note..."
                rows={3}
                style={{ marginBottom: 'var(--space-3)' }}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
              <button
                onClick={handleAddNote}
                className="btn btn-secondary btn-block"
                style={{ fontSize: '0.85rem' }}
                disabled={!noteText.trim()}
              >
                Add Note (logged to audit trail)
              </button>
            </div>

            <hr className="divider" />

            {/* Status actions */}
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Change Status</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 'var(--space-3)' }}>Every status change is logged with actor, time, and reason.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {['Under review', 'Information requested', 'Approval pending', 'Approved — activation pending', 'Active client', 'Declined'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleUpdateStatus(s)}
                  className="btn"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    background: selected.status === s ? 'var(--navy-50)' : 'var(--white)',
                    color: s === 'Declined' ? 'var(--danger)' : 'var(--ink-soft)',
                    border: `1px solid ${s === 'Declined' ? 'var(--danger)' : 'var(--line)'}`,
                    borderRadius: 'var(--radius-sm)',
                    opacity: selected.status === s ? 0.6 : 1,
                    cursor: 'pointer'
                  }}
                  disabled={selected.status === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
