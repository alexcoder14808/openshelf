import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLibrary } from '../context/LibraryContext';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLending } from '../context/LendingContext';
import { getChapterLabel } from '../utils/chapterTitle';
import { formatTime } from '../utils/formatTime';
import './pages.css';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { memberships, adminLibraries } = useLibrary();
  const { book, hasActiveBook, currentTrack, currentTrackIndex, currentTime } = useAudioPlayer();
  const { activeCheckouts, activeHolds, returnBook, cancelHold, claimReadyHold } = useLending();

  return (
    <div className="page">
      <div className="page-header">
        <h1>Welcome back{profile?.display_name ? `, ${profile.display_name}` : ''}</h1>
        <p>Your OpenShelf Network overview.</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>Continue listening</h2>
          {hasActiveBook ? (
            <div className="card-list-item">
              <span>
                <strong>{book.title}</strong> — {getChapterLabel(currentTrack, currentTrackIndex)} ({formatTime(currentTime)})
              </span>
              <Link to={`/listen/${book.id}`}>Resume</Link>
            </div>
          ) : (
            <p style={{ color: '#9aa0ab' }}>Nothing in progress. Browse a library to start an audiobook.</p>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Your library cards</h2>
          {memberships.length === 0 ? (
            <p style={{ color: '#9aa0ab' }}>No cards yet.</p>
          ) : (
            <ul className="card-list">
              {memberships.map((m) => (
                <li className="card-list-item" key={m.id}>
                  <span>{m.library.name}</span>
                  <span className={`status-pill status-pill--${m.status === 'active' ? 'active' : 'pending'}`}>
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/library-card" style={{ display: 'inline-block', marginTop: 14, fontSize: '0.85rem', fontWeight: 700, color: '#5b6df5' }}>
            View all cards →
          </Link>
        </div>

        <div className="dashboard-section">
          <h2>Your loans ({activeCheckouts.length})</h2>
          {activeCheckouts.length === 0 ? (
            <p style={{ color: '#9aa0ab' }}>Nothing checked out right now.</p>
          ) : (
            <ul className="card-list">
              {activeCheckouts.map((c) => (
                <li className="card-list-item" key={c.id}>
                  <span>
                    <Link to={`/book/${c.book_id}`} style={{ fontWeight: 700, color: '#16181d', textDecoration: 'none' }}>
                      {c.book?.title || 'Untitled'}
                    </Link>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: '#9aa0ab' }}>Due {formatDate(c.due_at)}</span>
                  </span>
                  <button
                    className="toolbar-btn"
                    onClick={() => returnBook(c.id).catch((err) => alert(err.message))}
                  >
                    Return
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Your holds ({activeHolds.length})</h2>
          {activeHolds.length === 0 ? (
            <p style={{ color: '#9aa0ab' }}>No active holds.</p>
          ) : (
            <ul className="card-list">
              {activeHolds.map((h) => (
                <li className="card-list-item" key={h.id}>
                  <span>
                    <Link to={`/book/${h.book_id}`} style={{ fontWeight: 700, color: '#16181d', textDecoration: 'none' }}>
                      {h.book?.title || 'Untitled'}
                    </Link>
                    <br />
                    <span style={{ fontSize: '0.75rem', color: h.status === 'ready' ? '#1f9254' : '#9aa0ab' }}>
                      {h.status === 'ready' ? `Ready — claim by ${formatDate(h.expires_at)}` : `Waitlist position ${h.queue_position || '—'}`}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {h.status === 'ready' && (
                      <button className="toolbar-btn toolbar-btn--active" onClick={() => claimReadyHold(h.id).catch((err) => alert(err.message))}>
                        Borrow
                      </button>
                    )}
                    <button className="toolbar-btn" onClick={() => cancelHold(h.id).catch((err) => alert(err.message))}>
                      Cancel
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {adminLibraries.length > 0 && (
          <div className="dashboard-section">
            <h2>Libraries you administer</h2>
            <ul className="card-list">
              {adminLibraries.map((a) => (
                <li className="card-list-item" key={a.id}>
                  <span>{a.library.name}</span>
                  <Link to="/admin">Manage →</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
