import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import type { AccountManager } from '../../types';
import { getAdminManagers } from '../../lib/api';

export default function Managers() {
  const [managers, setManagers] = useState<AccountManager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAdminManagers()
      .then((data) => {
        setManagers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Internal · Managers"
        title="Account Managers"
        subtitle="Assignment and capacity information for all account managers. Client assignments are controlled and auditable."
      />

      {loading ? (
        <p className="text-muted text-center" style={{ padding: 'var(--space-6)' }}>Loading managers roster…</p>
      ) : (
        <>
          {/* Manager cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
            {managers.map((m) => {
              const pct = (m.activeClients / m.capacity) * 100;
              return (
                <div key={m.id} className="card card-hover">
                  <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--navy-400), var(--navy-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--white)', fontSize: '1rem', flexShrink: 0 }}>
                      {m.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.05rem', marginBottom: '2px' }}>{m.name}</h3>
                      <p className="text-muted" style={{ fontSize: '0.82rem' }}>{m.title}</p>
                    </div>
                    <span className={`badge ${m.status === 'active' ? 'badge-success' : m.status === 'at capacity' ? 'badge-warning' : 'badge-muted'}`}>
                      {m.status}
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--ink-muted)' }}>Client Load</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy-800)' }}>{m.activeClients} / {m.capacity}</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--line-soft)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--success)',
                        borderRadius: 'var(--radius-full)',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  {/* Contact */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.85rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <a href={`mailto:${m.email}`} style={{ fontSize: '0.82rem' }}>{m.email}</a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="card" style={{ marginTop: 'var(--space-6)' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-4)' }}>Capacity Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)' }}>
              {[
                { label: 'Total Managers', value: managers.length },
                { label: 'Active', value: managers.filter((m) => m.status === 'active').length },
                { label: 'At Capacity', value: managers.filter((m) => m.status === 'at capacity').length },
                { label: 'Inactive', value: managers.filter((m) => m.status === 'inactive').length },
                { label: 'Total Clients', value: managers.reduce((s, m) => s + m.activeClients, 0) },
                { label: 'Total Capacity', value: managers.reduce((s, m) => s + m.capacity, 0) },
              ].map((s) => (
                <div key={s.label}>
                  <p style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--navy-800)' }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
