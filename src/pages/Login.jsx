import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './pages.css';

export default function Login() {
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
    <div className="page">
      <div className="form-card">
        <h1>Log in to OpenShelf</h1>
        <p className="subtitle">One account for the whole network — your libraries live inside it.</p>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
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
        <p className="form-footnote">
          New to OpenShelf? <Link to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
