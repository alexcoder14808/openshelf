import { Link } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext';
import LibraryCardFlip from '../components/LibraryCard/LibraryCardFlip';
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
        <p>Tap a card to flip it and see your card number and PIN. You're a member of {memberships.length} {memberships.length === 1 ? 'library' : 'libraries'}.</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {memberships.map((m) => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <LibraryCardFlip membership={m} />
            <button
              className="library-card-join"
              disabled={m.library.id === activeLibraryId}
              onClick={() => setActiveLibrary(m.library.id)}
              style={{ alignSelf: 'flex-start' }}
            >
              {m.library.id === activeLibraryId ? 'Currently browsing' : 'Browse this library'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
