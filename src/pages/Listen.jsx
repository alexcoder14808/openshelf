import { useEffect, useRef } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { useLending } from '../context/LendingContext';
import AudioPlayer from '../components/AudioPlayer/AudioPlayer';
import './pages.css';

export default function Listen() {
  const { id } = useParams();
  const { book, loadBookById, loadError } = useAudioPlayer();
  const { getCheckoutForBook, loading: lendingLoading } = useLending();
  const loadedForBookId = useRef(null);

  const hasCheckout = !!getCheckoutForBook(id);

  useEffect(() => {
    // Only (re)load if we don't already have THIS book loaded — navigating
    // back to /listen/:id for the book already playing should not restart it.
    if (loadedForBookId.current === id) return;
    if (book?.id === id) {
      loadedForBookId.current = id;
      return;
    }
    if (!hasCheckout) return; // don't load audio for a title the user hasn't borrowed
    loadedForBookId.current = id;
    loadBookById(id, { autoplay: false });
  }, [id, book, loadBookById, hasCheckout]);

  if (lendingLoading) {
    return <div className="page"><p>Loading…</p></div>;
  }

  if (!hasCheckout) {
    return <Navigate to={`/book/${id}`} replace />;
  }

  return (
    <div className="page" style={{ paddingBottom: 140 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to={`/book/${id}`} className="navbar-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back to Book
        </Link>
      </div>

      {loadError && !book && (
        <div className="empty-state"><p>{loadError}</p></div>
      )}

      {book && <AudioPlayer />}
    </div>
  );
}
