import { useState, useEffect } from 'react';
import PageHeader from '../../components/PageHeader';
import { getCurrentClient, getClientSupportMessages, createClientSupportMessage } from '../../lib/api';
import type { ClientProfile, SupportMessage } from '../../types';

export default function Support() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([getCurrentClient(), getClientSupportMessages()])
      .then(([profData, msgData]) => {
        setProfile(profData);
        setMessages(msgData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!subject.trim() || !message.trim() || sending) return;

    setSending(true);
    try {
      await createClientSupportMessage(subject.trim(), message.trim());
      setSubmitted(true);
      setSubject('');
      setMessage('');
      
      // Reload message list
      const updatedMessages = await getClientSupportMessages();
      setMessages(updatedMessages);
    } catch (err) {
      console.error(err);
      alert('Failed to send support request. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const managerName = profile?.managerName || 'Zack Whitfield';

  return (
    <div className="fade-in">
      <PageHeader
        eyebrow="Support"
        title="Contact & Support"
        subtitle="Reach your account manager or our general support team. This portal is not for urgent trading or payment instructions."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }} className="responsive-grid">
        {/* Account manager */}
        <div className="card" style={{ background: 'linear-gradient(135deg, var(--navy-800), var(--navy-700))', color: 'var(--white)', border: 'none' }}>
          <p style={{ color: 'var(--gold-400)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>Your Account Manager</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--navy-900)', fontSize: '1.1rem', flexShrink: 0 }}>
              {getInitials(managerName)}
            </div>
            <div>
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--white)' }}>{managerName}</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--navy-200)' }}>Senior Account Manager</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <a href="mailto:support@primexchanges.com" style={{ color: 'var(--gold-400)', fontSize: '0.92rem', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              support@primexchanges.com
            </a>
            <p style={{ fontSize: '0.85rem', color: 'var(--navy-200)', display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Mon–Fri, 09:00–18:00 GMT
            </p>
          </div>
        </div>

        {/* General support */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>General Support</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email</p>
              <p style={{ fontSize: '0.95rem' }}><a href="mailto:support@primexchanges.com">support@primexchanges.com</a></p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hours</p>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)' }}>Monday–Friday, 09:00–18:00 GMT</p>
            </div>
            <div>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Response Target</p>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)' }}>Within 1 business day</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--space-5)', marginTop: 'var(--space-5)' }} className="responsive-grid">
        {/* Support request form */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Send a Message to Manager</h3>
          <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 'var(--space-5)' }}>
            For questions about your portfolio, documents, or account access. This is <strong>not</strong> for trade instructions, transfers, or urgent payment requests.
          </p>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-bg)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-2)' }}>Message Sent Successfully</h3>
              <p className="text-soft" style={{ fontSize: '0.9rem', marginBottom: 'var(--space-4)' }}>Your message has been sent to your account manager and support team.</p>
              <button onClick={() => setSubmitted(false)} className="btn btn-outline btn-sm">Send Another Message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="supportSubject">Subject</label>
                <input
                  id="supportSubject"
                  type="text"
                  className="form-control"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What is this regarding?"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="supportMsg">Message</label>
                <textarea
                  id="supportMsg"
                  className="form-control"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Describe your question or issue..."
                  required
                />
              </div>
              <button type="submit" disabled={sending} className="btn btn-primary">
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* Message history */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-4)' }}>Message History</h3>
          
          {loading ? (
            <div className="text-center" style={{ padding: 'var(--space-4)' }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px' }}>
              <p className="text-muted" style={{ fontSize: '0.9rem', textAlign: 'center' }}>No messages sent yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: '380px', overflowY: 'auto', paddingRight: 'var(--space-1)' }}>
              {messages.map((m) => (
                <div key={m.id} style={{ padding: 'var(--space-3)', background: 'var(--navy-50)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--navy-500)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--navy-800)' }}>{m.subject}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-muted)' }}>{formatDate(m.sentAt)}</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', whiteSpace: 'pre-wrap', lineHeight: 1.4, marginTop: 'var(--space-1)' }}>{m.messageBody}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Policy links */}
      <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '0.88rem' }}>
        <span className="text-muted">Related:</span>
        <a href="/privacy">Privacy Policy</a>
        <span style={{ color: 'var(--line)' }}>·</span>
        <a href="/terms">Terms of Service</a>
        <span style={{ color: 'var(--line)' }}>·</span>
        <a href="/disclosures">Disclosures</a>
      </div>
    </div>
  );
}
