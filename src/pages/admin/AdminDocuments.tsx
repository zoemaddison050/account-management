import PageHeader from '../../components/PageHeader';
import { adminDocuments, formatDate } from '../../data/mockData';

export default function AdminDocuments() {
  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Internal · Documents"
        title="Document Management"
        subtitle="Approved document publication and version tracking. Documents are never replaced silently — every version is controlled."
      />

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap" style={{ border: 'none' }}>
          <table className="data">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Version</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Published</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {adminDocuments.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 500, color: 'var(--navy-800)' }}>{d.name}</td>
                  <td><span className="badge badge-muted">{d.type}</span></td>
                  <td className="mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--gold-600)' }}>{d.version}</td>
                  <td>
                    <span className={`badge ${d.status === 'published' ? 'badge-success' : d.status === 'pending review' ? 'badge-warning' : 'badge-muted'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{d.owner}</td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>{d.publishedAt === '—' ? '—' : formatDate(d.publishedAt)}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}>Manage</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>Document Controls</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[
            'Store published documents in controlled document storage — never replace silently.',
            'Include a visible version ID and date on every document.',
            'Log which version was downloaded only if the applicant actively submits an online request.',
            'Issue separate secure-upload requests for sensitive documents — never use ordinary email attachments.',
            'All document access is logged in the audit trail with actor and timestamp.',
          ].map((rule, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-soft" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
