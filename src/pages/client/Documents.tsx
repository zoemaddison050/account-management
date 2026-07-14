import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { formatDate } from '../../data/mockData';
import { getClientDocuments } from '../../lib/api';
import type { ClientDocument } from '../../types';

const typeFilters = ['All', 'Statement', 'Report', 'Agreement', 'Policy', 'Tax'];

const typeIcons: Record<string, string> = {
  Statement: 'M9 17v-2m4 2v-4m4 4V7m-2 4l-2-2m-2 2l-2-2',
  Report: 'M9 17v-2m4 2v-4m4 4V7M3 17l6-6 4 4 4-4 4 4',
  Agreement: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  Policy: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  Tax: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v.5M12 16v1m0-1c-1.11 0-2.08-.402-2.599-1',
};

export default function Documents() {
  const [filter, setFilter] = useState('All');
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClientDocuments()
      .then((data) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? documents : documents.filter((d) => d.type === filter);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Documents"
        title="Your Documents"
        subtitle="Approved statements, reports, agreements, and tax documents. All documents are versioned and published through a controlled process."
      />

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

      {/* Document cards */}
      {loading ? (
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <p className="text-muted">Loading documents…</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
            {filtered.map((d) => (
              <div key={d.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius)', background: 'var(--navy-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--navy-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={typeIcons[d.type] || typeIcons.Statement} />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--navy-800)', lineHeight: 1.4 }}>{d.name}</p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <span className="badge badge-muted">{d.type}</span>
                      <span className="badge badge-gold">{d.version}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--line-soft)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>{formatDate(d.publishedAt)} · {d.sizeLabel}</span>
                  <button className="btn btn-ghost" style={{ fontSize: '0.82rem', padding: '0.3rem 0.6rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline' }}>
                      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <EmptyState
              title="No documents available"
              message="No documents match this category. If you need a document that's not listed, contact your account manager."
            />
          )}
        </>
      )}

      <div className="alert alert-info" style={{ marginTop: 'var(--space-6)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>Documents are published through a controlled process with version tracking and access scope. Only approved documents appear here. If you need a document that's not listed, contact your account manager.</div>
      </div>
    </div>
  );
}
