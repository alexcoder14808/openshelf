import { Link } from 'react-router-dom';

export default function BookCard({ book }) {
  return (
    <Link to={`/book/${book.id}`} className="book-card">
      {book.cover_url ? (
        <img className="book-card-cover" src={book.cover_url} alt="" />
      ) : (
        <div className="book-card-cover">{book.title?.[0] || '?'}</div>
      )}
      <p className="book-card-title">{book.title}</p>
      <p className="book-card-author">{book.author}</p>
      <span className="book-card-badge">
        {book.format === 'both' ? 'Ebook & Audiobook' : book.format === 'audiobook' ? 'Audiobook' : 'Ebook'}
      </span>
    </Link>
  );
}
