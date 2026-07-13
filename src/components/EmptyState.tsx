interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-5)' }}>
      {icon && <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)', opacity: 0.5 }}>{icon}</div>}
      <h3 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-2)' }}>{title}</h3>
      <p className="text-muted" style={{ maxWidth: '40ch', margin: '0 auto var(--space-5)' }}>{message}</p>
      {action}
    </div>
  );
}
