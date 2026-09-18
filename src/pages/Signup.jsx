import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './pages.css';

export default function Signup() {
  const { signUp, isAuthenticated, loading: authLoading, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [resendStatus, setResendStatus] = useState(''); // '' | 'sending' | 'sent' | error message

  // Already signed in? Send them where they'd actually want to go instead
  // of showing a signup form for an account they already have.
  if (authLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!termsAccepted) {
      setError('You need to agree to the Terms of Service and Privacy Policy to create an account.');
      return;
    }
    setLoading(true);
    try {
      await signUp({ email, password, displayName, termsAccepted: true });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('sending');
    try {
      await resendConfirmationEmail(email);
      setResendStatus('sent');
    } catch (err) {
      setResendStatus(err.message || 'Could not resend the email.');
    }
  };

  if (done) {
    return (
      <div className="page">
        <div className="form-card">
          <h1>Check your email</h1>
          <p className="subtitle">
            We sent a confirmation link to {email}. Once verified, log in and join a library to
            start borrowing.
          </p>
          {resendStatus === 'sent' ? (
            <p style={{ color: '#1f9254', fontSize: '0.85rem', textAlign: 'center', marginBottom: 16 }}>
              Sent again — check your inbox (and spam folder).
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendStatus === 'sending'}
              style={{
                display: 'block', width: '100%', textAlign: 'center', background: 'none',
                border: '1px solid #e2e4e8', borderRadius: 10, padding: '10px', marginBottom: 12,
                fontSize: '0.85rem', fontWeight: 600, color: '#40444c', cursor: 'pointer',
              }}
            >
              {resendStatus === 'sending' ? 'Sending…' : "Didn't get it? Resend the email"}
            </button>
          )}
          {resendStatus && resendStatus !== 'sending' && resendStatus !== 'sent' && (
            <p className="form-error">{resendStatus}</p>
          )}
          <Link to="/login" className="form-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="form-card">
        <h1>Join the OpenShelf Network</h1>
        <p className="subtitle">
          This creates your one OpenShelf account. After signing up, you'll pick which library
          card(s) to add — or start your own library as an admin.
        </p>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="displayName">Name</label>
            <input id="displayName" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="form-field" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <input
              type="checkbox"
              id="termsAccepted"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={{ width: 'auto', marginTop: 3 }}
            />
            <label htmlFor="termsAccepted" style={{ margin: 0, fontWeight: 400, fontSize: '0.85rem' }}>
              I agree to the <Link to="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link> and{' '}
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
            </label>
          </div>
          <button className="form-submit" type="submit" disabled={loading || !termsAccepted}>
            {loading ? 'Creating account…' : 'Create OpenShelf account'}
          </button>
        </form>
        <p className="form-footnote">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <p className="form-footnote">
          Want to run your own library? <Link to="/admin/create-library">Start a library</Link> (requires an OpenShelf account first).
        </p>
      </div>
    </div>
  );
}
