import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Headphones, BookOpen, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLending } from '../context/LendingContext';
import { formatTime } from '../utils/formatTime';
import './pages.css';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function friendlyDueLabel(dueAt) {
  if (!dueAt) return '';
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return `Overdue — was due ${formatDate(dueAt)}`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

/** Fetches total duration + listened time for a set of audiobook checkouts. */
function useListeningProgress(checkouts, userId) {
  const [progressByBookId, setProgressByBookId] = useState({});

  useEffect(() => {
    const audiobookIds = checkouts
      .filter((c) => c.book && (c.book.format === 'audiobook' || c.book.format === 'both'))
      .map((c) => c.book.id);
    if (!userId || audiobookIds.length === 0) {
      setProgressByBookId({});
      return;
    }

    let cancelled = false;
    async function load() {
      const { data: tracks, error: tracksErr } = await supabase
        .from('audiobook_tracks')
        .select('id, book_id, duration_seconds')
        .in('book_id', audiobookIds);
      if (tracksErr || !tracks || cancelled) return;

      const trackIds = tracks.map((t) => t.id);
      const { data: progressRows, error: progressErr } = trackIds.length
        ? await supabase.from('playback_progress').select('track_id, position_seconds').eq('user_id', userId).in('track_id', trackIds)
        : { data: [], error: null };
      if (progressErr || cancelled) return;

      const progressByTrack = Object.fromEntries((progressRows || []).map((p) => [p.track_id, p.position_seconds]));

      const byBook = {};
      for (const track of tracks) {
        if (!byBook[track.book_id]) byBook[track.book_id] = { totalSeconds: 0, listenedSeconds: 0 };
        const duration = track.duration_seconds || 0;
        const listened = Math.min(progressByTrack[track.id] || 0, duration || Infinity);
        byBook[track.book_id].totalSeconds += duration;
        byBook[track.book_id].listenedSeconds += listened;
      }
      if (!cancelled) setProgressByBookId(byBook);
    }
    load();
    return () => { cancelled = true; };
  }, [checkouts, userId]);

  return progressByBookId;
}

export default function Loans() {
  const { user } = useAuth();
  const { activeCheckouts, activeHolds, checkouts, returnBook, cancelHold, claimReadyHold, loading } = useLending();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const listeningProgress = useListeningProgress(activeCheckouts, user?.id);
  const pastCheckouts = checkouts.filter((c) => c.returned_at);

  const runAction = async (id, fn) => {
    setError('');
    setBusyId(id);
    try {
      await fn();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="page"><p>Loading your loans…</p></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Your Loans & Holds</h1>
        <p>Everything you've borrowed or are waiting on, across every library you're a member of.</p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="dashboard-section" style={{ marginBottom: 20 }}>
        <h2>Currently borrowed ({activeCheckouts.length})</h2>
        {activeCheckouts.length === 0 ? (
          <p style={{ color: '#9aa0ab', fontSize: '0.9rem' }}>Nothing checked out right now.</p>
        ) : (
          <ul className="card-list">
            {activeCheckouts.map((c) => {
              const isAudiobook = c.book && (c.book.format === 'audiobook' || c.book.format === 'both');
              const progress = isAudiobook ? listeningProgress[c.book?.id] : null;
              const percent = progress?.totalSeconds ? Math.min(100, Math.round((progress.listenedSeconds / progress.totalSeconds) * 100)) : null;

              return (
                <li className="card-list-item" key={c.id} style={{ alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {c.book?.cover_url ? (
                      <img src={c.book.cover_url} alt="" style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 40, height: 56, borderRadius: 6, flexShrink: 0, background: 'linear-gradient(135deg,#5b6df5,#8c5bf5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {c.book?.title?.[0]}
                      </div>
                    )}
                    <span>
                      <strong>{c.book?.title || 'Untitled'}</strong>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: friendlyDueLabel(c.due_at).startsWith('Overdue') ? '#d1414a' : '#9aa0ab', marginTop: 2 }}>
                        <Clock size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                        {friendlyDueLabel(c.due_at)}
                      </span>
                      {isAudiobook && percent !== null && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#5b6df5', marginTop: 3 }}>
                          {formatTime(progress.listenedSeconds)} listened of {formatTime(progress.totalSeconds)} ({percent}%)
                        </span>
                      )}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 8 }}>
                    {c.book && (c.book.format === 'audiobook' || c.book.format === 'both') && (
                      <Link to={`/listen/${c.book.id}`} className="toolbar-btn" style={{ textDecoration: 'none' }}>
                        <Headphones size={14} />
                      </Link>
                    )}
                    {c.book && (c.book.format === 'ebook' || c.book.format === 'both') && (
                      <Link to={`/read/${c.book.id}`} className="toolbar-btn" style={{ textDecoration: 'none' }}>
                        <BookOpen size={14} />
                      </Link>
                    )}
                    <button
                      className="panel-list-delete"
                      disabled={busyId === c.id}
                      onClick={() => runAction(c.id, () => returnBook(c.id))}
                    >
                      Return
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="dashboard-section" style={{ marginBottom: 20 }}>
        <h2>Holds ({activeHolds.length})</h2>
        {activeHolds.length === 0 ? (
          <p style={{ color: '#9aa0ab', fontSize: '0.9rem' }}>You're not waiting on anything.</p>
        ) : (
          <ul className="card-list">
            {activeHolds.map((h) => (
              <li className="card-list-item" key={h.id} style={{ alignItems: 'center' }}>
                <span>
                  <strong>{h.book?.title || 'Untitled'}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: h.status === 'ready' ? '#1f9254' : '#9aa0ab', marginTop: 2 }}>
                    {h.status === 'ready' ? (
                      <>Ready — claim by {formatDate(h.expires_at)}</>
                    ) : (
                      <><Users size={12} style={{ marginRight: 4, verticalAlign: -2 }} /> Position {h.queue_position || '—'} in line</>
                    )}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  {h.status === 'ready' && (
                    <button
                      className="toolbar-btn"
                      disabled={busyId === h.id}
                      onClick={() => runAction(h.id, () => claimReadyHold(h.id))}
                    >
                      Borrow now
                    </button>
                  )}
                  <button
                    className="panel-list-delete"
                    disabled={busyId === h.id}
                    onClick={() => runAction(h.id, () => cancelHold(h.id))}
                  >
                    Cancel
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pastCheckouts.length > 0 && (
        <div className="dashboard-section">
          <h2>History</h2>
          <ul className="card-list">
            {pastCheckouts.slice(0, 20).map((c) => (
              <li className="card-list-item" key={c.id}>
                <span>{c.book?.title || 'Untitled'}</span>
                <span style={{ fontSize: '0.75rem', color: '#9aa0ab' }}>Returned {formatDate(c.returned_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
