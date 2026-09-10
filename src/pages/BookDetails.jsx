import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Headphones, BookOpen, Clock, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLending } from '../context/LendingContext';
import './pages.css';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BookDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { getCheckoutForBook, getHoldForBook, borrowBook, returnBook, placeHold, cancelHold, claimReadyHold } = useLending();

  const [book, setBook] = useState(null);
  const [trackCount, setTrackCount] = useState(0);
  const [hasEbook, setHasEbook] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadBook = useCallback(async () => {
    setLoading(true);
    const { data: bookRow, error: bookErr } = await supabase.from('books').select('*').eq('id', id).single();
    if (bookErr) {
      console.error(bookErr);
      setLoading(false);
      return;
    }

    const { count } = await supabase
      .from('audiobook_tracks')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', id);

    const { data: ebookRow } = await supabase.from('ebook_files').select('id').eq('book_id', id).limit(1).maybeSingle();

    const { count: waiting } = await supabase
      .from('holds')
      .select('id', { count: 'exact', head: true })
      .eq('book_id', id)
      .eq('status', 'waiting');

    setBook(bookRow);
    setTrackCount(count || 0);
    setHasEbook(!!ebookRow);
    setWaitlistCount(waiting || 0);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  const checkout = book ? getCheckoutForBook(book.id) : null;
  const hold = book ? getHoldForBook(book.id) : null;

  const runAction = async (fn) => {
    setActionError('');
    setActionLoading(true);
    try {
      await fn();
      await loadBook();
    } catch (err) {
      console.error(err);
      setActionError(err.message || 'Something went wrong.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="page"><p>Loading…</p></div>;
  if (!book) return <div className="page"><div className="empty-state"><p>Book not found.</p></div></div>;

  const isAudiobook = book.format === 'audiobook' || book.format === 'both';
  const isEbook = book.format === 'ebook' || book.format === 'both';
  const hasCopiesAvailable = book.available_copies > 0;

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {book.cover_url ? (
          <img src={book.cover_url} alt="" style={{ width: 220, borderRadius: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.15)' }} />
        ) : (
          <div style={{ width: 220, aspectRatio: '2/3', borderRadius: 16, background: 'linear-gradient(135deg,#5b6df5,#8c5bf5)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 700 }}>
            {book.title?.[0]}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={{ fontSize: '1.8rem', margin: '0 0 6px', color: '#16181d' }}>{book.title}</h1>
          <p style={{ color: '#6b7280', margin: '0 0 16px' }}>{book.author}</p>

          {book.description && <p style={{ color: '#40444c', lineHeight: 1.7, maxWidth: 560 }}>{book.description}</p>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '20px 0' }}>
            {isAudiobook && trackCount > 0 && (
              <span className="book-card-badge">{trackCount} {trackCount === 1 ? 'chapter' : 'chapters'}</span>
            )}
            {book.genre && <span className="book-card-badge">{book.genre}</span>}
            <span className="book-card-badge" style={{ background: hasCopiesAvailable ? '#e6f7ec' : '#fff6df', color: hasCopiesAvailable ? '#1f9254' : '#b8860b' }}>
              {hasCopiesAvailable ? `${book.available_copies} of ${book.total_copies} available` : 'All copies checked out'}
            </span>
            {waitlistCount > 0 && (
              <span className="book-card-badge">
                <Users size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                {waitlistCount} waiting
              </span>
            )}
          </div>

          {actionError && <p className="form-error">{actionError}</p>}

          {!isAuthenticated ? (
            <Link to="/login" className="form-submit" style={{ width: 'auto', padding: '12px 22px', display: 'inline-block', textDecoration: 'none' }}>
              Log in to borrow
            </Link>
          ) : checkout ? (
            <div>
              <p style={{ fontSize: '0.9rem', color: '#40444c', margin: '0 0 12px' }}>
                <Clock size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
                Checked out — due {formatDate(checkout.due_at)}
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {isAudiobook && trackCount > 0 && (
                  <button className="form-submit" style={{ width: 'auto', padding: '12px 22px', display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => navigate(`/listen/${book.id}`)}>
                    <Headphones size={18} /> Listen Now
                  </button>
                )}
                {isEbook && hasEbook && (
                  <Link to={`/read/${book.id}`} className="form-submit" style={{ width: 'auto', padding: '12px 22px', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', background: '#f7f8fa', color: '#16181d' }}>
                    <BookOpen size={18} /> Read Now
                  </Link>
                )}
                <button
                  className="library-card-join"
                  style={{ background: '#fdf1f1', color: '#d1414a' }}
                  disabled={actionLoading}
                  onClick={() => runAction(() => returnBook(checkout.id))}
                >
                  Return early
                </button>
              </div>
            </div>
          ) : hold ? (
            <div>
              {hold.status === 'ready' ? (
                <>
                  <p style={{ fontSize: '0.9rem', color: '#1f9254', margin: '0 0 12px', fontWeight: 600 }}>
                    Ready for you — claim by {formatDate(hold.expires_at)}
                  </p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button className="form-submit" style={{ width: 'auto', padding: '12px 22px' }} disabled={actionLoading} onClick={() => runAction(() => claimReadyHold(hold.id))}>
                      Borrow now
                    </button>
                    <button className="library-card-join" style={{ background: '#fdf1f1', color: '#d1414a' }} disabled={actionLoading} onClick={() => runAction(() => cancelHold(hold.id))}>
                      Give up hold
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.9rem', color: '#40444c', margin: '0 0 12px' }}>
                    On the waitlist — position {hold.queue_position || '—'}
                  </p>
                  <button className="library-card-join" style={{ background: '#fdf1f1', color: '#d1414a' }} disabled={actionLoading} onClick={() => runAction(() => cancelHold(hold.id))}>
                    Leave waitlist
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {hasCopiesAvailable ? (
                <button className="form-submit" style={{ width: 'auto', padding: '12px 22px' }} disabled={actionLoading} onClick={() => runAction(() => borrowBook(book.id))}>
                  {actionLoading ? 'Borrowing…' : 'Borrow'}
                </button>
              ) : (
                <button className="form-submit" style={{ width: 'auto', padding: '12px 22px' }} disabled={actionLoading} onClick={() => runAction(() => placeHold(book.id))}>
                  {actionLoading ? 'Joining…' : 'Join waitlist'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
