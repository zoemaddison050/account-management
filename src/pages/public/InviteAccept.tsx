import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Logo from '../../components/Logo';
import { getInvitationPreview, type InvitationPreview } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { formatDateTime } from '../../data/mockData';

export default function InviteAccept() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { acceptInvitation, loading: authLoading, error: authError } = useAuth();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invitation token is missing.');
      setLoading(false);
      return;
    }

    getInvitationPreview(token)
      .then((data) => {
        setPreview(data);
        setLoading(false);
      })
      .catch(() => {
        setError('This invitation is invalid, expired, or has already been used.');
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      await acceptInvitation(token);
      navigate('/client/dashboard');
    } catch {
      // useAuth exposes the visible error message.
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 100%)' }}>
      <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
        <Logo variant="light" />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-5)' }}>
        <div className="card fade-in" style={{ width: '100%', maxWidth: '520px', padding: 'var(--space-7)' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--navy-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand-blue-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            </div>
            <h1 style={{ fontSize: '1.55rem', marginBottom: 'var(--space-2)' }}>Activate Client Portal Access</h1>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>
              Accept your single-use invitation to open your PrimeXchanges client portal.
            </p>
          </div>

          {loading && (
            <p className="text-muted text-center" style={{ padding: 'var(--space-5)' }}>Checking invitation...</p>
          )}

          {!loading && (error || authError) && (
            <div className="alert alert-danger" role="alert" style={{ marginBottom: 'var(--space-5)' }}>
              <div>{error || authError}</div>
            </div>
          )}

          {!loading && preview && !error && (
            <>
              <div style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                {[
                  { label: 'Reference', value: preview.reference },
                  { label: 'Applicant', value: preview.applicantName },
                  { label: 'Email', value: preview.email },
                  { label: 'Account manager', value: preview.assignedManager },
                  { label: 'Expires', value: formatDateTime(preview.expiresAt) },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                    <span style={{ color: 'var(--ink-muted)', fontSize: '0.86rem' }}>{row.label}</span>
                    <span style={{ color: 'var(--navy-800)', fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={handleAccept} disabled={authLoading}>
                {authLoading ? 'Activating...' : 'Accept Invitation'}
              </button>
            </>
          )}

          <div style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
            <Link to="/login" style={{ fontSize: '0.86rem' }}>Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
