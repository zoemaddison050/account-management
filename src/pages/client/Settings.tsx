import { useState } from 'react';
import PageHeader from '../../components/PageHeader';

export default function Settings() {
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState({
    emailStatements: true,
    emailActivity: false,
    emailMarketing: false,
    twoFactor: true,
  });

  const toggle = (key: keyof typeof prefs) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Settings"
        title="Account Settings"
        subtitle="Manage your password, security settings, and communication preferences. No custody or account changes can be made through this portal in the current version."
      />

      {/* Security */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Security</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-5)' }}>Your account uses secure passwordless magic links for authentication. Password management is not required.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Active sessions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-4)', background: 'var(--navy-50)', borderRadius: 'var(--radius)' }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--navy-800)' }}>Active Sessions</p>
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>1 active session · This device</p>
            </div>
            <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>Sign Out All Devices</button>
          </div>
        </div>
      </div>

      {/* Communication preferences */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Communication Preferences</h3>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-5)' }}>Choose how you'd like to be notified.</p>

        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {[
              { key: 'emailStatements' as const, label: 'Email me when new statements are published', desc: 'Monthly statements and reports' },
              { key: 'emailActivity' as const, label: 'Email me about significant portfolio activity', desc: 'Fees, dividends, allocation changes' },
              { key: 'emailMarketing' as const, label: 'Send me service updates and newsletters', desc: 'Product news and educational content' },
            ].map((item) => (
              <div key={item.key} className="form-check" style={{ padding: 'var(--space-3)', background: 'var(--navy-50)', borderRadius: 'var(--radius)' }}>
                <input id={item.key} type="checkbox" checked={prefs[item.key]} onChange={() => toggle(item.key)} />
                <div>
                  <label htmlFor={item.key} style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy-800)' }}>{item.label}</label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '2px' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary">Save Preferences</button>
            {saved && <span style={{ color: 'var(--success)', fontSize: '0.88rem', fontWeight: 600 }}>✓ Saved</span>}
          </div>
        </form>
      </div>

      {/* Not available notice */}
      <div className="alert alert-warning">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}>
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <strong>Not available in this version:</strong> Deposits, withdrawals, trades, transfers, and custody changes. These require separate risk and compliance approval. Contact your account manager for assistance.
        </div>
      </div>
    </div>
  );
}
