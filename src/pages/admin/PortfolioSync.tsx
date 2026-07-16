import PageHeader from '../../components/PageHeader';
import FreshnessIndicator from '../../components/FreshnessIndicator';
import { syncLogs, formatDateTime } from '../../data/mockData';

export default function PortfolioSync() {
  const latestSync = syncLogs[0];
  const okCount = syncLogs.filter((s) => s.status === 'ok').length;
  const errorCount = syncLogs.filter((s) => s.status === 'error').length;
  const staleCount = syncLogs.filter((s) => s.status === 'stale').length;

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Internal · Portfolio Sync"
        title="Portfolio Data Integration"
        subtitle="Integration status, sync logs, and reconciliation results. PrimeXchanges is the source of truth. Data is never scraped from authenticated sessions."
      />

      {/* Integration status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-6)' }} className="responsive-grid">
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>Data Source</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[
              { label: 'Source', value: 'PrimeXchanges Official API' },
              { label: 'Sync Schedule', value: 'Daily at 06:15 GMT' },
              { label: 'Reconciliation', value: 'Automated, pre-publication' },
              { label: 'Method', value: 'Official API integration (approved)' },
            ].map((d) => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{d.label}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--navy-800)' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>Latest Sync</h3>
          <FreshnessIndicator status={latestSync.status} asOf={latestSync.timestamp} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            {[
              { label: 'Batch ID', value: latestSync.batchId },
              { label: 'Records Processed', value: String(latestSync.recordsProcessed) },
              { label: 'Records Published', value: String(latestSync.recordsPublished) },
              { label: 'Exceptions', value: String(latestSync.exceptions) },
            ].map((d) => (
              <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{d.label}</span>
                <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--navy-800)' }}>{d.value}</span>
              </div>
            ))}
          </div>
          <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--navy-50)', borderRadius: 'var(--radius)' }}>
            {latestSync.message}
          </p>
        </div>
      </div>

      {/* Sync stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {[
          { label: 'Successful (5d)', value: okCount, accent: 'success' },
          { label: 'Errors (5d)', value: errorCount, accent: 'danger' },
          { label: 'Stale/No Data (5d)', value: staleCount, accent: 'warning' },
          { label: 'Success Rate', value: `${Math.round((okCount / syncLogs.length) * 100)}%`, accent: 'navy' },
        ].map((s) => (
          <div key={s.label} className="card card-pad-tight">
            <p style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: `var(--${s.accent})` }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sync log table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--space-6)' }}>
        <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
          <h3 style={{ fontSize: '1.05rem' }}>Sync Log (Last 5 Days)</h3>
        </div>
        <div className="table-wrap" style={{ border: 'none', marginTop: 'var(--space-4)' }}>
          <table className="data">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Status</th>
                <th className="text-right">Processed</th>
                <th className="text-right">Published</th>
                <th className="text-right">Exceptions</th>
                <th>Batch ID</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {syncLogs.map((s) => (
                <tr key={s.id}>
                  <td className="mono" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{formatDateTime(s.timestamp)}</td>
                  <td><FreshnessIndicator status={s.status} compact /></td>
                  <td className="text-right mono">{s.recordsProcessed}</td>
                  <td className="text-right mono">{s.recordsPublished}</td>
                  <td className="text-right mono">
                    {s.exceptions > 0 ? <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{s.exceptions}</span> : '0'}
                  </td>
                  <td className="mono" style={{ fontSize: '0.8rem' }}>{s.batchId}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', maxWidth: '300px' }}>{s.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reconciliation rules */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>Reconciliation Controls</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            'Verify file/API batch is complete before processing.',
            'Validate schema, currency codes, account IDs, dates, and duplicate records.',
            'Compare totals and record counts to source-side control reports.',
            'Flag material differences for a designated reviewer.',
            'Publish only the approved batch — partial or failed imports are blocked.',
            'Preserve a traceable audit record of source, transformation, reviewer, and publication time.',
          ].map((rule, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M5 13l4 4L19 7" /></svg>
              <span className="text-soft" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Failure behavior */}
      <div className="alert alert-warning" style={{ marginTop: 'var(--space-5)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <strong>Failure behavior:</strong> Failed syncs preserve the last known verified data with its actual timestamp. Reconciliation exceptions block publication for impacted records. Missing account mappings do not show data to unmatched clients. Wrong-client matches are treated as a security incident.
        </div>
      </div>
    </div>
  );
}
