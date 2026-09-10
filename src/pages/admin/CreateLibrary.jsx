import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import '../pages.css';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export default function CreateLibrary() {
  const { isAuthenticated } = useAuth();
  const { createLibrary } = useLibrary();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [cardSignupMode, setCardSignupMode] = useState('open');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAuthenticated) {
    return (
      <div className="page">
        <div className="form-card">
          <h1>Sign in first</h1>
          <p className="subtitle">You need an OpenShelf Network account before starting a library.</p>
          <Link to="/signup" className="form-submit" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Create an OpenShelf account
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const library = await createLibrary({
        name,
        slug: slugify(name) || `library-${Date.now()}`,
        description,
        logoUrl,
        cardSignupMode,
      });
      navigate(`/admin/${library.id}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not create your library.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="form-card">
        <h1>Start a library on OpenShelf</h1>
        <p className="subtitle">
          This creates your own library inside the OpenShelf Network — with its own logo, name,
          and collection. It does not affect the OpenShelf system itself; it's your space to add
          audiobooks and ebooks for your members.
        </p>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="name">Library name</label>
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Riverside Public Library" />
          </div>
          <div className="form-field">
            <label htmlFor="logoUrl">Logo URL</label>
            <input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="signupMode">Card signup</label>
            <select id="signupMode" value={cardSignupMode} onChange={(e) => setCardSignupMode(e.target.value)}>
              <option value="open">Open — anyone can get a card instantly</option>
              <option value="approval_required">Approval required</option>
              <option value="invite_only">Invite only</option>
            </select>
          </div>
          <button className="form-submit" type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Creating…' : 'Create my library'}
          </button>
        </form>
      </div>
    </div>
  );
}
