interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}

export default function SectionTitle({ eyebrow, title, subtitle, center }: SectionTitleProps) {
  return (
    <div style={{ textAlign: center ? 'center' : 'left', marginBottom: 'var(--space-6)' }}>
      {eyebrow && <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>{eyebrow}</p>}
      <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>{title}</h2>
      {subtitle && (
        <p className="text-soft" style={{ fontSize: '1.05rem', maxWidth: '55ch', marginTop: 'var(--space-2)', marginInline: center ? 'auto' : undefined }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
