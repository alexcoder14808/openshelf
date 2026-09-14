import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLibrary } from '../context/LibraryContext';
import { useAuth } from '../context/AuthContext';
import BookCard from '../components/BookCard';
import './pages.css';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { activeLibrary, memberships } = useLibrary();
  const [recentBooks, setRecentBooks] = useState([]);

  useEffect(() => {
    if (!activeLibrary) {
      setRecentBooks([]);
      return;
    }
    supabase
      .from('books')
      .select('*')
      .eq('library_id', activeLibrary.id)
      .order('created_at', { ascending: false })
      .limit(12)
      .then(({ data, error }) => {
        if (error) console.error(error);
        setRecentBooks(data || []);
      });
  }, [activeLibrary]);

  return (
    <div className="page">
      {!isAuthenticated && (
        <div className="page-header">
          <h1>Every library, one shelf.</h1>
          <p>
            OpenShelf connects independent libraries — audiobooks and ebooks from the collections
            you belong to, all in one place.
          </p>
        </div>
      )}

      {isAuthenticated && memberships.length === 0 && (
        <div className="empty-state">
          <h2>You don't have a library card yet</h2>
          <p>Join a library on the network to start borrowing audiobooks and ebooks.</p>
          <Link to="/libraries">Find a library</Link>
        </div>
      )}

      {activeLibrary && (
        <>
          <div className="page-header">
            <h1>New at {activeLibrary.name}</h1>
            <p>Recently added to this library's collection.</p>
          </div>
          {recentBooks.length === 0 ? (
            <div className="empty-state">
              <p>No titles have been added to this library yet.</p>
            </div>
          ) : (
            <div className="book-grid">
              {recentBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </>
      )}

      {!isAuthenticated && (
        <div className="empty-state">
          <p>Sign up to the OpenShelf Network, then join a library to browse its collection.</p>
          <Link to="/signup">Get started</Link>
        </div>
      )}
    </div>
  );
}
