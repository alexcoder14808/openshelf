import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Settings, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useLibrary } from '../../context/LibraryContext';
import '../pages.css';

export default function ManageBooks() {
  const { libraryId } = useParams();
  const { adminLibraries } = useLibrary();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiesBusyId, setCopiesBusyId] = useState(null);

  const adminEntry = adminLibraries.find((a) => a.library.id === libraryId);

  const adjustCopies = async (book, delta) => {
    const newTotal = book.total_copies + delta;
    if (newTotal < 0) return;
    setCopiesBusyId(book.id);
    const { data, error } = await supabase.rpc('admin_set_total_copies', {
      p_book_id: book.id,
      p_new_total: newTotal,
    });
    setCopiesBusyId(null);
    if (error) {
      console.error(error);
      alert(error.message || 'Could not update copy count.');
      return;
    }
    setBooks((prev) => prev.map((b) => (b.id === book.id ? { ...b, ...data } : b)));
  };

  useEffect(() => {
    supabase
      .from('books')
      .select('*')
      .eq('library_id', libraryId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setBooks(data || []);
        setLoading(false);
      });
  }, [libraryId]);

  const handleDelete = async (bookId) => {
    if (!window.confirm('Remove this title from your library? This cannot be undone.')) return;
    const { error } = await supabase.from('books').delete().eq('id', bookId);
    if (error) {
      console.error(error);
      alert('Could not delete this title.');
      return;
    }
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
  };

  if (!adminEntry) {
    return (
      <div className="page">
        <div className="empty-state"><p>You don't administer this library.</p></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>{adminEntry.library.name} — Catalog</h1>
          <p>{books.length} titles in this library's collection.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to={`/admin/${libraryId}/settings`} className="toolbar-btn" style={{ textDecoration: 'none' }}>
            <Settings size={16} /> <span>Library settings</span>
          </Link>
          <Link to={`/admin/${libraryId}/add-book`} className="form-submit" style={{ width: 'auto', padding: '9px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <Plus size={16} /> Add book
          </Link>
        </div>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <p>No titles yet.</p>
          <Link to={`/admin/${libraryId}/add-book`}>Add your first book</Link>
        </div>
      ) : (
        <ul className="card-list">
          {books.map((book) => (
            <li className="card-list-item" key={book.id}>
              <span><strong>{book.title}</strong> — {book.author}</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #eceef1', borderRadius: 999, padding: '3px 8px' }}>
                  <button
                    className="toolbar-btn"
                    style={{ padding: 4, background: 'none', border: 'none' }}
                    disabled={copiesBusyId === book.id || book.total_copies <= 0}
                    onClick={() => adjustCopies(book, -1)}
                    aria-label="Remove a copy"
                  >
                    <Minus size={12} />
                  </button>
                  <span style={{ fontSize: '0.78rem', color: '#40444c', minWidth: 60, textAlign: 'center' }}>
                    {book.available_copies}/{book.total_copies} copies
                  </span>
                  <button
                    className="toolbar-btn"
                    style={{ padding: 4, background: 'none', border: 'none' }}
                    disabled={copiesBusyId === book.id}
                    onClick={() => adjustCopies(book, 1)}
                    aria-label="Add a copy"
                  >
                    <Plus size={12} />
                  </button>
                </span>
                <Link to={`/admin/${libraryId}/edit-book/${book.id}`} className="toolbar-btn" style={{ textDecoration: 'none', padding: '6px 10px' }}>
                  <Pencil size={14} />
                </Link>
                <button className="panel-list-delete" onClick={() => handleDelete(book.id)}>
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
