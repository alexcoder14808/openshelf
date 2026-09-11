import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import './pages.css';

export default function Login() {
  const [mode, setMode] = useState('email'); // 'email' | 'card'

  return (
    <div className="page">
      <div className="form-card">
        <h1>Log in to OpenShelf</h1>
        <p className="subtitle">
          {mode === 'email'
            ? 'Your OpenShelf Network account — one login for every library you belong to.'
            : 'Log in at a specific library using the card number and PIN you set when you joined.'}
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          <button
            type="button"
            onClick={() => setMode('email')}
            className="toolbar-btn"
            style={mode === 'email' ? { background: '#eef1ff', borderColor: '#c7cdfb', color: '#5b6df5' } : undefined}
          >
            Email &amp; password
          </button>
          <button
            type="button"
            onClick={() => setMode('card')}
            className="toolbar-btn"
            style={mode === 'card' ? { background: '#eef1ff', borderColor: '#c7cdfb', color: '#5b6df5' } : undefined}
          >
            Library card &amp; PIN
          </button>
        </div>

        {mode === 'email' ? <EmailLoginForm /> : <CardLoginForm />}

        <p className="form-footnote">
          New to OpenShelf? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

function EmailLoginForm() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="form-field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <button className="form-submit" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  );
}

function CardLoginForm() {
  const { signInWithCard } = useAuth();
  const navigate = useNavigate();
  const [libraries, setLibraries] = useState([]);
  const [libraryId, setLibraryId] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from('libraries')
      .select('id, name')
      .eq('is_public', true)
      .order('name', { ascending: true })
      .then(({ data, error: err }) => {
        if (err) console.error(err);
        setLibraries(data || []);
        if (data?.length) setLibraryId((prev) => prev || data[0].id);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!libraryId) {
      setError('Choose a library.');
      return;
    }
    setLoading(true);
    try {
      await signInWithCard({ libraryId, cardNumber: cardNumber.trim(), pin: pin.trim() });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid card number or PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="form-error">{error}</p>}
      <div className="form-field">
        <label htmlFor="library">Library</label>
        <select id="library" value={libraryId} onChange={(e) => setLibraryId(e.target.value)}>
          {libraries.length === 0 && <option value="">No libraries found</option>}
          {libraries.map((lib) => (
            <option key={lib.id} value={lib.id}>{lib.name}</option>
          ))}
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="cardNumber">Card number</label>
        <input
          id="cardNumber"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className="form-field">
        <label htmlFor="pin">PIN</label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <button className="form-submit" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Log in with card'}
      </button>
    </form>
  );
}
