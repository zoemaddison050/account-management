import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { statusColors, formatDateTime, relativeTime } from '../../data/mockData';
import type { AccountManager, Application } from '../../types';
import {
  getAdminStats,
  getAdminApplications,
  getAdminApplicationDetail,
  updateApplicationStatus,
  addApplicationNote,
  getAdminManagers,
  issueApplicationInvitation,
  deleteAdminApplication,
  getApplicationPdfBlob
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
  const [managers, setManagers] = useState<AccountManager[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [actionError, setActionError] = useState('');
  const [invitationMessage, setInvitationMessage] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const fetchApps = useCallback(() => {
    setLoading(true);
    getAdminApplications(filter === 'All' ? undefined : filter, search || undefined)
      .then((data) => {
        setApps(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter, search]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {});
  }, [apps]);

  useEffect(() => {
    getAdminManagers().then(setManagers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) {
      setPdfUrl(null);
      return;
    }
    setLoadingPdf(true);
    let active = true;
    let currentUrl: string | null = null;
    getApplicationPdfBlob(selected.id)
      .then((blob) => {
        if (!active) return;
        currentUrl = URL.createObjectURL(blob);
        setPdfUrl(currentUrl);
        setLoadingPdf(false);
      })
      .catch(() => {
        if (active) setLoadingPdf(false);
      });

    return () => {
      active = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [selected]);

  const handleDeleteRequest = async () => {
    if (!selected) return;
    if (!window.confirm(`Are you sure you want to delete application request "${selected.applicantName}"? This action cannot be undone.`)) {
      return;
    }
    setActionError('');
    try {
      await deleteAdminApplication(selected.id);
      setSelected(null);
      setSelectedDetail(null);
      fetchApps();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Delete failed.');
    }
  };

  const selectApp = (app: Application) => {
    setSelected(app);
    setSelectedDetail(null);
    setActionError('');
    setInvitationMessage('');
    const matchingManager = managers.find((m) => m.name === app.assignedReviewer);
    setSelectedManagerId(matchingManager?.id ?? '');
    getAdminApplicationDetail(app.id)
      .then((detail) => {
        setSelectedDetail(detail);
        const detailManager = managers.find((m) => m.name === detail.assignedReviewer);
        setSelectedManagerId(detailManager?.id ?? matchingManager?.id ?? '');
      })
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
    setActionError('');
    const managerRequired = status === 'Approved — activation pending';
    if (managerRequired && !selectedManagerId) {
      setActionError('Select an active account manager before activating this client.');
      return;
    }
    const reason = prompt(`Enter reason for changing status to "${status}":`);
    if (reason === null) return; // cancelled
    const managerId = selectedManagerId || undefined;
    updateApplicationStatus(selected.id, status, reason || undefined, managerId)
      .then(() => {
        fetchApps();
        return getAdminApplicationDetail(selected.id);
      })
      .then((detail) => {
        setSelectedDetail(detail);
        setSelected(detail);
      })
      .catch((error) => setActionError(error instanceof Error ? error.message : 'Status update failed.'));
  };

  const handleSendInvitation = async () => {
    if (!selected) return;
    setActionError('');
    setInvitationMessage('');
    setSendingInvite(true);
    try {
      const result = await issueApplicationInvitation(selected.id, 'Invitation issued from admin application drawer');
      setInvitationMessage(`Invitation sent. Expires ${formatDateTime(result.expiresAt)}.`);
      const detail = await getAdminApplicationDetail(selected.id);
      setSelectedDetail(detail);
      setSelected(detail);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to send invitation.');
    } finally {
      setSendingInvite(false);
    }
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
              type="button"
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
                    <tr
                      key={a.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => selectApp(a)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectApp(a);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                    >
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
          role="presentation"
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
              <button type="button" onClick={() => { setSelected(null); setSelectedDetail(null); }} className="btn btn-ghost" style={{ padding: '0.3rem' }} aria-label="Close detail panel">
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

            {/* PDF Preview */}
            <div style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-3)' }}>Applicant PDF Preview</h3>
              {loadingPdf ? (
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>Generating PDF preview...</p>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title="PDF Preview"
                  style={{ width: '100%', height: '350px', border: '1px solid var(--line)', borderRadius: 'var(--radius)' }}
                />
              ) : (
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>PDF preview not available.</p>
              )}
            </div>

            <hr className="divider" />

            {/* Notes / timeline */}
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)' }}>Notes & Timeline</h3>
            {!selectedDetail ? (
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Loading notes & audit trail…</p>
            ) : selectedDetail.notes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {selectedDetail.notes.map((n) => (
                  <div key={`${n.date}-${n.author}-${n.text.slice(0, 24)}`} style={{ padding: 'var(--space-3)', background: 'var(--navy-50)', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
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
                type="button"
                onClick={handleAddNote}
                className="btn btn-secondary btn-block"
                style={{ fontSize: '0.85rem' }}
                disabled={!noteText.trim()}
              >
                Add Note (logged to audit trail)
              </button>
            </div>

            <hr className="divider" />

            {/* Manager assignment */}
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Manager Assignment</h3>
            <select
              aria-label="Assigned account manager"
              className="form-control"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              style={{ marginBottom: 'var(--space-3)' }}
            >
              <option value="">Select an active account manager</option>
              {managers.reduce<ReactNode[]>((options, m) => {
                if (m.status !== 'active') return options;
                options.push(
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.activeClients}/{m.capacity} clients
                  </option>
                );
                return options;
              }, [])}
            </select>
            {actionError && (
              <div className="alert alert-danger" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-3)' }}>
                {actionError}
              </div>
            )}
            {invitationMessage && (
              <div className="alert alert-success" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-3)' }}>
                {invitationMessage}
              </div>
            )}

            {selected.status === 'Approved — activation pending' && (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleSendInvitation}
                disabled={sendingInvite || !selectedManagerId}
                style={{ marginBottom: 'var(--space-3)' }}
              >
                {sendingInvite ? 'Sending invitation...' : 'Send Client Invitation'}
              </button>
            )}

            <hr className="divider" />

            {/* Status actions */}
            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>Change Status</h3>
            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: 'var(--space-3)' }}>Every status change is logged with actor, time, and reason.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {['Under review', 'Information requested', 'Approval pending', 'Approved — activation pending', 'Declined'].map((s) => (
                <button
                  type="button"
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

            <hr className="divider" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-5)' }} />
            <button
              type="button"
              className="btn btn-block"
              style={{ background: 'var(--danger)', color: 'var(--white)', border: 'none', fontSize: '0.88rem', padding: '0.6rem' }}
              onClick={handleDeleteRequest}
            >
              Delete Application Request
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
