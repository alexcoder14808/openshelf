import { Link } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import './pages.css';

export default function LibraryCard() {
  const { memberships, setActiveLibrary, activeLibraryId } = useLibrary();

  if (memberships.length === 0) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>No library cards yet</h2>
          <p>Join a library to get your first digital library card.</p>
          <Link to="/libraries">Find a library</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Your Library Cards</h1>
        <p>You're a member of {memberships.length} {memberships.length === 1 ? 'library' : 'libraries'} on the network.</p>
      </div>

      <div className="library-grid">
        {memberships.map((m) => (
          <div className="library-card" key={m.id}>
            {m.library.logo_url ? (
              <img className="library-card-logo" src={m.library.logo_url} alt="" />
            ) : (
              <div className="library-card-logo">{m.library.name?.[0]}</div>
            )}
            <h3>{m.library.name}</h3>
            <p style={{ fontFamily: 'monospace', letterSpacing: 1 }}>Card #{m.card_number}</p>
            <span className={`status-pill status-pill--${m.status === 'active' ? 'active' : 'pending'}`}>
              {m.status === 'active' ? 'Active' : 'Pending approval'}
            </span>
            <button
              className="library-card-join"
              disabled={m.library.id === activeLibraryId}
              onClick={() => setActiveLibrary(m.library.id)}
            >
              {m.library.id === activeLibraryId ? 'Currently browsing' : 'Browse this library'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
