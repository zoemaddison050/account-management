interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: 'gold' | 'navy' | 'success' | 'warning' | 'danger';
}

export default function StatCard({ label, value, hint, accent = 'navy' }: StatCardProps) {
  const accentColors: Record<string, string> = {
    gold: 'var(--gold-500)',
    navy: 'var(--navy-500)',
    success: 'var(--success)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
  };

  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: accentColors[accent] }} />
      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
        {label}
      </p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--navy-800)', lineHeight: 1.2 }}>
        {value}
      </p>
      {hint && <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: 'var(--space-2)' }}>{hint}</p>}
    </div>
  );
}
