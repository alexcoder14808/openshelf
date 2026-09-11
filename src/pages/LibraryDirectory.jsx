import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Search as SearchIcon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import './pages.css';

export default function LibraryDirectory() {
  const { isAuthenticated } = useAuth();
  const { memberships, joinLibrary, setActiveLibrary } = useLibrary();
  const navigate = useNavigate();
  const [libraries, setLibraries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinModalLibrary, setPinModalLibrary] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase
      .from('libraries')
      .select('*')
      .eq('is_public', true)
      .order('name', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setLibraries(data || []);
        setLoading(false);
      });
  }, []);

  const memberLibraryIds = new Set(memberships.map((m) => m.library.id));
  const filteredLibraries = libraries.filter((lib) =>
    lib.name?.toLowerCase().includes(query.trim().toLowerCase())
  );

  const handleJoinClick = (library) => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }
    setPinModalLibrary(library);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Find a Library</h1>
        <p>Get a card at any library on the OpenShelf Network — join as many as you like.</p>
      </div>

      <div style={{ position: 'relative', maxWidth: 380, marginBottom: 28 }}>
        <SearchIcon size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9aa0ab' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search libraries by name…"
          style={{ width: '100%', border: '1px solid #e2e4e8', borderRadius: 999, padding: '10px 14px 10px 38px', fontSize: '0.9rem' }}
        />
      </div>

      {loading ? (
        <p>Loading libraries…</p>
      ) : filteredLibraries.length === 0 ? (
        <div className="empty-state">
          {libraries.length === 0 ? (
            <>
              <p>No libraries have joined the network yet.</p>
              <Link to="/admin/create-library">Start the first one</Link>
            </>
          ) : (
            <p>No libraries match "{query}".</p>
          )}
        </div>
      ) : (
        <div className="library-grid">
          {filteredLibraries.map((lib) => {
            const isMember = memberLibraryIds.has(lib.id);
            return (
              <div className="library-card" key={lib.id}>
                {lib.logo_url ? (
                  <img className="library-card-logo" src={lib.logo_url} alt="" />
                ) : (
                  <div className="library-card-logo">{lib.name?.[0]}</div>
                )}
                <h3>{lib.name}</h3>
                <p>{lib.description || 'A library on the OpenShelf network.'}</p>
                <button
                  className={`library-card-join ${isMember ? 'library-card-join--joined' : ''}`}
                  onClick={() => !isMember && handleJoinClick(lib)}
                  disabled={isMember}
                >
                  {isMember ? 'You have a card' : 'Get a card'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {pinModalLibrary && (
        <ChoosePinModal
          library={pinModalLibrary}
          onClose={() => setPinModalLibrary(null)}
          onJoined={(libraryId) => {
            setActiveLibrary(libraryId);
            setPinModalLibrary(null);
          }}
        />
      )}
    </div>
  );
}

function ChoosePinModal({ library, onClose, onJoined }) {
  const { joinLibrary } = useLibrary();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4,6}$/.test(pin)) {
      setError('PIN must be 4 to 6 digits, numbers only.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs don\u2019t match.');
      return;
    }
    setSaving(true);
    try {
      await joinLibrary(library.id, pin);
      onJoined(library.id);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not request a card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="slide-panel-overlay" onClick={onClose}>
      <div className="slide-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="slide-panel-header">
          <h3>Choose a PIN for {library.name}</h3>
          <button className="slide-panel-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="slide-panel-body">
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 16px' }}>
            This PIN pairs with your card number to log in at this library without your OpenShelf
            email and password. You can view it any time by flipping your card.
          </p>
          {error && <p className="form-error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Choose a PIN (4–6 digits)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <div className="form-field">
              <label>Confirm PIN</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button className="form-submit" type="submit" disabled={saving}>
              {saving ? 'Requesting card…' : 'Get my card'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
