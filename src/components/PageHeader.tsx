interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ eyebrow, title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="page-header fade-in" style={{ marginBottom: 'var(--space-6)' }}>
      {eyebrow && <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>{eyebrow}</p>}
      <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}>{title}</h1>
      {subtitle && <p className="text-soft" style={{ fontSize: '1.1rem', maxWidth: '60ch', marginTop: 'var(--space-3)' }}>{subtitle}</p>}
      {children && <div style={{ marginTop: 'var(--space-5)' }}>{children}</div>}
    </div>
  );
}
