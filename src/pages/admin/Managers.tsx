import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import type { AccountManager } from '../../types';
import { createAdminManager, getAdminManagers, updateAdminManager, type UpsertAccountManagerRequest } from '../../lib/api';

const emptyForm: UpsertAccountManagerRequest = {
  name: '',
  title: 'Account Manager',
  email: '',
  activeClients: 0,
  capacity: 20,
  status: 'active',
};

export default function Managers() {
  const [managers, setManagers] = useState<AccountManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AccountManager | null>(null);
  const [form, setForm] = useState<UpsertAccountManagerRequest>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadManagers = () => {
    setLoading(true);
    getAdminManagers()
      .then((data) => {
        setManagers(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load managers.');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadManagers();
  }, []);

  const openCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
  };

  const openEdit = (manager: AccountManager) => {
    setCreating(false);
    setEditing(manager);
    setForm({
      name: manager.name,
      title: manager.title,
      email: manager.email,
      activeClients: manager.activeClients,
      capacity: manager.capacity,
      status: manager.status,
    });
    setError('');
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
    setForm({ ...emptyForm });
    setError('');
  };

  const saveManager = async () => {
    if (!form.name.trim() || !form.title.trim() || !form.email.trim()) {
      setError('Name, title, and email are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateAdminManager(editing.id, form);
      } else {
        await createAdminManager(form);
      }
      closeForm();
      loadManagers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save manager.');
    } finally {
      setSaving(false);
    }
  };

  const formOpen = creating || editing !== null;

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Internal · Managers"
        title="Account Managers"
        subtitle="Assignment and capacity information for all account managers. Client assignments are controlled and auditable."
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-5)' }}>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Add Manager
        </button>
      </div>

      {formOpen && (
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>
            {editing ? 'Edit Account Manager' : 'Add Account Manager'}
          </h2>
          {error && (
            <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
            <label className="form-group">
              <span className="form-label">Full name <span className="req">*</span></span>
              <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="form-group">
              <span className="form-label">Title <span className="req">*</span></span>
              <input className="form-control" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label className="form-group">
              <span className="form-label">Email <span className="req">*</span></span>
              <input className="form-control" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label className="form-group">
              <span className="form-label">Active clients</span>
              <input className="form-control" type="number" min="0" value={form.activeClients} onChange={(e) => setForm({ ...form, activeClients: Number(e.target.value) })} />
            </label>
            <label className="form-group">
              <span className="form-label">Capacity</span>
              <input className="form-control" type="number" min="0" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
            </label>
            <label className="form-group">
              <span className="form-label">Status</span>
              <select className="form-control" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AccountManager['status'] })}>
                <option value="active">active</option>
                <option value="at capacity">at capacity</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={closeForm} disabled={saving}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={saveManager} disabled={saving}>
              {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Manager'}
            </button>
          </div>
        </div>
      )}

      {!formOpen && error && (
        <div className="alert alert-danger" style={{ marginBottom: 'var(--space-5)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-muted text-center" style={{ padding: 'var(--space-6)' }}>Loading managers roster…</p>
      ) : (
        <>
          {/* Manager cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-5)' }}>
            {managers.map((m) => {
              const pct = m.capacity > 0 ? Math.min(100, (m.activeClients / m.capacity) * 100) : 0;
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
                      }} />
                    </div>
                  </div>

                  {/* Contact */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.85rem' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <a href={`mailto:${m.email}`} style={{ fontSize: '0.82rem' }}>{m.email}</a>
                  </div>

                  <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }} onClick={() => openEdit(m)}>
                      Edit
                    </button>
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
