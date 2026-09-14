import { Link } from 'react-router-dom';
import { Headphones, BookOpen } from 'lucide-react';

export default function BookCard({ book }) {
  const showAudioBadge = book.format === 'audiobook' || book.format === 'both';
  const showEbookBadge = book.format === 'ebook' || book.format === 'both';

  return (
    <Link to={`/book/${book.id}`} className="book-card">
      <div className="book-card-cover-shell">
        {book.cover_url ? (
          <img className="book-card-cover" src={book.cover_url} alt="" />
        ) : (
          <div className="book-card-cover book-card-cover--placeholder">
            <span>{book.title?.[0] || '?'}</span>
          </div>
        )}
        <div className="book-card-format-badges">
          {showAudioBadge && <span className="book-card-format-icon" title="Audiobook"><Headphones size={13} /></span>}
          {showEbookBadge && <span className="book-card-format-icon" title="Ebook"><BookOpen size={13} /></span>}
        </div>
      </div>
      <p className="book-card-title">{book.title}</p>
      <p className="book-card-author">{book.author}</p>
    </Link>
  );
}
