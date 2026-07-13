import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useAuth } from '../../hooks/useAuth';

type LoginStep = 'email' | 'verify' | 'success';

interface FormErrors {
  email?: string;
  token?: string;
}

const MOCK_CODE = '123456';

export default function Login() {
  const navigate = useNavigate();
  const { requestMagicLink, verifyMagicLink, loading: authLoading, error: authError, clearError } = useAuth();
  const [step, setStep] = useState<LoginStep>('email');
  const [errors, setErrors] = useState<FormErrors>({});
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [expiresIn, setExpiresIn] = useState(15);
  const [resendDisabled, setResendDisabled] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const validateEmail = (): boolean => {
    const e: FormErrors = {};
    if (!email.trim()) e.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email address';
    setErrors((prev) => ({ ...prev, email: e.email, token: undefined }));
    return !e.email;
  };

  const validateToken = (): boolean => {
    const e: FormErrors = {};
    if (!token.trim()) e.token = 'Enter the 6-digit code';
    else if (!/^\d{6}$/.test(token)) e.token = 'Code must be 6 digits';
    setErrors((prev) => ({ ...prev, token: e.token }));
    return !e.token;
  };

  const handleRequestMagicLink = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!validateEmail()) return;
    try {
      const result = await requestMagicLink({ email: email.trim() });
      setExpiresIn(result.expiresInMinutes);
      setStep('verify');
      setToken('');
      setErrors({});
    } catch {
      // Error message is surfaced via useAuth's error state — no action needed here
    }
  };

  const handleVerify = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    if (!validateToken()) return;
    try {
      await verifyMagicLink({ email: email.trim(), token: token.trim(), remember });
      setStep('success');
      setTimeout(() => navigate('/client/dashboard'), 900);
    } catch {
      // Error message is surfaced via useAuth's error state — no action needed here
    }
  };

  const handleResend = async () => {
    if (resendDisabled) return;
    setResendDisabled(true);
    try {
      const result = await requestMagicLink({ email: email.trim() });
      setExpiresIn(result.expiresInMinutes);
      setToken('');
      setErrors((prev) => ({ ...prev, token: undefined }));
    } catch {
      // Error surfaced via useAuth error state
    } finally {
      // Re-enable resend after a short cooldown
      setTimeout(() => setResendDisabled(false), 30000);
    }
  };

  const handleTokenChange = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    setToken((prev) => {
      const chars = prev.split('');
      chars[index] = digit;
      return chars.join('').slice(0, 6);
    });
    if (authError) clearError();
    // Move focus to the next input if there is one
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Clear auth error when email changes
  useEffect(() => {
    if (authError) clearError();
  }, [email, clearError]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 100%)' }}>
      <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
        <Logo variant="light" />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-5)' }}>
        <div style={{ width: '100%', maxWidth: '460px' }}>
          <div className="card fade-in" style={{ padding: 'var(--space-7)' }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: 'var(--radius-lg)', background: 'var(--navy-100)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand-blue-deep)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)' }}>Client Sign In</h1>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                {step === 'email' && 'Enter your email to receive a secure sign-in code.'}
                {step === 'verify' && `Enter the 6-digit code sent to ${email}.`}
                {step === 'success' && 'You are signed in. Redirecting…'}
              </p>
            </div>

            {/* Auth error alert */}
            {authError && (
              <div className="alert alert-danger" style={{ marginBottom: 'var(--space-5)' }} role="alert">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }} aria-hidden>
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>{authError}</div>
              </div>
            )}

            {/* Step 1: Email */}
            {step === 'email' && (
              <form onSubmit={handleRequestMagicLink} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="email">Email address <span className="req">*</span></label>
                  <input
                    id="email"
                    type="email"
                    className={`form-control ${errors.email ? 'error' : ''}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!errors.email}
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                  />
                  {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                <div className="form-check" style={{ marginBottom: 'var(--space-5)' }}>
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <label htmlFor="remember" style={{ fontSize: '0.85rem' }}>Keep me signed in on this device</label>
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={authLoading}>
                  {authLoading ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-spinner" aria-hidden>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      Sending code…
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                      Send sign-in code
                    </>
                  )}
                </button>

                <p className="text-muted" style={{ fontSize: '0.78rem', textAlign: 'center', marginTop: 'var(--space-4)' }}>
                  Use the same email you used on your application form.
                </p>
              </form>
            )}

            {/* Step 2: Verify code */}
            {step === 'verify' && (
              <form onSubmit={handleVerify} noValidate>
                <div className="form-group" style={{ textAlign: 'center' }}>
                  <label className="form-label" htmlFor="token-0">Verification code</label>
                  <div className="otp-input-group" style={{ justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <input
                        key={index}
                        id={`token-${index}`}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={`form-control otp-digit ${errors.token ? 'error' : ''}`}
                        value={token[index] ?? ''}
                        onChange={(e) => handleTokenChange(e.target.value, index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !token[index] && index > 0) {
                            inputRefs.current[index - 1]?.focus();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                          setToken(pasted);
                          if (pasted.length === 6) {
                            inputRefs.current[5]?.focus();
                          } else if (inputRefs.current[pasted.length]) {
                            inputRefs.current[pasted.length]?.focus();
                          }
                        }}
                        aria-label={`Digit ${index + 1} of 6`}
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                  {errors.token && <p className="form-error">{errors.token}</p>}
                  <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                    Code expires in {expiresIn} minutes.
                  </p>
                  <p className="badge badge-warning" style={{ fontSize: '0.75rem', marginTop: 'var(--space-2)' }}>
                    Demo mode — use code <strong>{MOCK_CODE}</strong>
                  </p>
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={authLoading}>
                  {authLoading ? (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-spinner" aria-hidden>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      Verifying…
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                      </svg>
                      Sign In
                    </>
                  )}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-4)' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: 0, fontSize: '0.85rem' }}
                    onClick={() => setStep('email')}
                  >
                    ← Use a different email
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: 0, fontSize: '0.85rem' }}
                    onClick={handleResend}
                    disabled={resendDisabled || authLoading}
                  >
                    Resend code
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--success-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 'var(--space-2)' }}>Signed in successfully</h2>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Redirecting you to your dashboard…</p>
              </div>
            )}

            <hr className="divider" />

            {/* Help section */}
            <div className="card" style={{ padding: 'var(--space-5)', background: 'var(--navy-50)', borderColor: 'var(--navy-100)' }}>
              <h2 style={{ fontSize: '1.05rem', marginBottom: 'var(--space-2)' }}>Need help signing in?</h2>
              <p className="text-soft" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                Contact <a href="mailto:support@primexchanges.com">support@primexchanges.com</a> if you need help with an invitation or account access.
              </p>
            </div>

            <Link to="/apply" className="btn btn-secondary btn-lg btn-block" style={{ marginTop: 'var(--space-4)' }}>
              Apply for Account Management
            </Link>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--navy-300)', marginTop: 'var(--space-5)' }}>
            <Link to="/" style={{ color: 'var(--navy-200)' }}>← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
