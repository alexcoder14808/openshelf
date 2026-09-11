import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useLibrary } from '../context/LibraryContext';
import BookCard from '../components/BookCard';
import './pages.css';

export default function Search() {
  const { activeLibrary } = useLibrary();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!activeLibrary || !query.trim()) return;
    setSearched(true);
    // Typo-tolerant: search_books() uses pg_trgm similarity as well as
    // substring matching, so a near-miss spelling still finds results.
    const { data, error } = await supabase.rpc('search_books', {
      p_library_id: activeLibrary.id,
      p_query: query.trim(),
    });
    if (error) console.error(error);
    setResults(data || []);
  };

  if (!activeLibrary) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Choose a library first</h2>
          <p>Join or select a library to search its catalog.</p>
          <Link to="/libraries">Find a library</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Search {activeLibrary.name}</h1>
      </div>

      <form onSubmit={runSearch} style={{ display: 'flex', gap: 10, marginBottom: 28, maxWidth: 480 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title or author…"
          style={{ flex: 1, border: '1px solid #e2e4e8', borderRadius: 10, padding: '10px 14px' }}
        />
        <button type="submit" className="form-submit" style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <SearchIcon size={16} /> Search
        </button>
      </form>

      {searched && results.length === 0 && (
        <div className="empty-state"><p>No results for "{query}".</p></div>
      )}

      {results.length > 0 && (
        <div className="book-grid">
          {results.map((book) => <BookCard key={book.id} book={book} />)}
        </div>
      )}
    </div>
  );
}
