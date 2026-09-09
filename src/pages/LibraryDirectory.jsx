import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const [joiningId, setJoiningId] = useState(null);

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

  const handleJoin = async (library) => {
    if (!isAuthenticated) {
      navigate('/signup');
      return;
    }
    setJoiningId(library.id);
    try {
      await joinLibrary(library.id);
      setActiveLibrary(library.id);
    } catch (err) {
      console.error('Failed to join library:', err);
      alert(err.message || 'Could not join this library.');
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Find a Library</h1>
        <p>Get a card at any library on the OpenShelf Network — join as many as you like.</p>
      </div>

      {loading ? (
        <p>Loading libraries…</p>
      ) : libraries.length === 0 ? (
        <div className="empty-state">
          <p>No libraries have joined the network yet.</p>
          <Link to="/admin/create-library">Start the first one</Link>
        </div>
      ) : (
        <div className="library-grid">
          {libraries.map((lib) => {
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
                  onClick={() => !isMember && handleJoin(lib)}
                  disabled={isMember || joiningId === lib.id}
                >
                  {isMember ? 'You have a card' : joiningId === lib.id ? 'Joining…' : 'Get a card'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
