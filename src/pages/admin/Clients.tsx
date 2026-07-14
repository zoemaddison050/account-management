import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import type { Client, AccountManager } from '../../types';
import { getAdminClients, getAdminManagers } from '../../lib/api';

export default function Clients() {
  const [search, setSearch] = useState('');
  const [managerFilter, setManagerFilter] = useState('All');
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<AccountManager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAdminClients(),
      getAdminManagers()
    ])
      .then(([clientData, managerData]) => {
        setClients(clientData);
        setManagers(managerData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = clients.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.reference.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchesManager = managerFilter === 'All' || c.managerName === managerFilter;
    return matchesSearch && matchesManager;
  });

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Internal · Clients"
        title="Approved Clients"
        subtitle="Directory of approved clients. Access is permission-controlled — an account manager only sees clients explicitly assigned to them."
      />

      {/* Access notice */}
      <div className="alert alert-info" style={{ marginBottom: 'var(--space-5)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div><strong>RBAC enforced:</strong> This view shows all clients for administrators. Account managers see only their assigned clients. Permission checks happen server-side on every request.</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
        <input
          type="text"
          id="clientSearch"
          name="clientSearch"
          className="form-control"
          style={{ maxWidth: '300px' }}
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search clients"
        />
        <select className="form-control" style={{ maxWidth: '220px' }} value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)}>
          <option value="All">All account managers</option>
          {managers.filter((m) => m.status !== 'inactive').map((m) => (
            <option key={m.id} value={m.name}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p className="text-muted text-center" style={{ padding: 'var(--space-6)' }}>Loading client directory…</p>
        ) : (
          <>
            <div className="table-wrap" style={{ border: 'none' }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Client</th>
                    <th>Account Manager</th>
                    <th>Since</th>
                    <th>Status</th>
                    <th>Portfolios</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--navy-700)' }}>{c.reference}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--navy-900)', fontSize: '0.78rem', flexShrink: 0 }}>
                            {c.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div>
                            <p style={{ fontWeight: 500, color: 'var(--navy-800)' }}>{c.name}</p>
                            <p style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>{c.managerName}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>{c.since}</td>
                      <td>
                        <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-muted'}`}>
                          {c.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{c.portfolios && c.portfolios.length > 0 ? `${c.portfolios.length} portfolio${c.portfolios.length > 1 ? 's' : ''}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <p className="text-muted text-center" style={{ padding: 'var(--space-6)' }}>No clients match your filters.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
