import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Headphones, BookOpen, Users } from 'lucide-react';
import { useLending } from '../context/LendingContext';
import './pages.css';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(dueAt) {
  return dueAt && new Date(dueAt).getTime() < Date.now();
}

export default function Loans() {
  const { activeCheckouts, activeHolds, checkouts, returnBook, cancelHold, claimReadyHold, loading } = useLending();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

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
            {activeCheckouts.map((c) => (
              <li className="card-list-item" key={c.id} style={{ alignItems: 'center' }}>
                <span>
                  <strong>{c.book?.title || 'Untitled'}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: isOverdue(c.due_at) ? '#d1414a' : '#9aa0ab', marginTop: 2 }}>
                    <Clock size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                    {isOverdue(c.due_at) ? 'Overdue — was due' : 'Due'} {formatDate(c.due_at)}
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
            ))}
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
