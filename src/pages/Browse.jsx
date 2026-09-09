import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useLibrary } from '../context/LibraryContext';
import BookCard from '../components/BookCard';
import './pages.css';

const GENRE_ALL = 'All';

export default function Browse() {
  const { activeLibrary } = useLibrary();
  const [books, setBooks] = useState([]);
  const [genre, setGenre] = useState(GENRE_ALL);
  const [format, setFormat] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeLibrary) {
      setBooks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('books')
      .select('*')
      .eq('library_id', activeLibrary.id)
      .order('title', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setBooks(data || []);
        setLoading(false);
      });
  }, [activeLibrary]);

  if (!activeLibrary) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Choose a library first</h2>
          <p>Join or select a library to browse its catalog.</p>
          <Link to="/libraries">Find a library</Link>
        </div>
      </div>
    );
  }

  const genres = [GENRE_ALL, ...new Set(books.map((b) => b.genre).filter(Boolean))];
  const filtered = books.filter((b) => {
    const genreMatch = genre === GENRE_ALL || b.genre === genre;
    const formatMatch = format === 'all' || b.format === format || b.format === 'both';
    return genreMatch && formatMatch;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Browse {activeLibrary.name}</h1>
        <p>{books.length} titles in this library's collection.</p>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="form-field-select">
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="all">All formats</option>
          <option value="audiobook">Audiobook</option>
          <option value="ebook">Ebook</option>
        </select>
      </div>

      {loading ? (
        <p>Loading catalog…</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No titles match these filters.</p></div>
      ) : (
        <div className="book-grid">
          {filtered.map((book) => <BookCard key={book.id} book={book} />)}
        </div>
      )}
    </div>
  );
}
