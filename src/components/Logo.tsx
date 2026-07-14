import { Link } from 'react-router-dom';

interface LogoProps {
  variant?: 'light' | 'dark';
  href?: string;
}

export default function Logo({ variant = 'dark', href = '/' }: LogoProps) {
  const isDark = variant === 'dark';

  return (
    <Link to={href} className="brand-lockup" aria-label="PrimeXchanges home">
      <img
        className="brand-icon"
        src="/brand/prime-exchanges-icon.png"
        alt=""
        aria-hidden="true"
      />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.08 }}>
        <span
          style={{
            fontSize: '1rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: isDark ? 'var(--navy-900)' : 'var(--white)',
          }}
        >
          PRIME<span style={{ color: 'var(--brand-blue)' }}>X</span>
          <span style={{ color: 'var(--gold-400)' }}>CHANGES</span>
        </span>
      </span>
    </Link>
  );
}
