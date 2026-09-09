import { useEffect, Suspense, lazy, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLending } from '../context/LendingContext';
import './pages.css';

// epub.js and pdf.js are large — only fetch their code when someone actually
// opens a book that needs them, instead of bloating every page's bundle.
const TextReader = lazy(() => import('../components/EbookReader/TextReader'));
const EpubReader = lazy(() => import('../components/EbookReader/EpubReader'));
const PdfReader = lazy(() => import('../components/EbookReader/PdfReader'));

export default function Read() {
  const { id } = useParams();
  const { getCheckoutForBook, loading: lendingLoading } = useLending();
  const hasCheckout = !!getCheckoutForBook(id);
  const [book, setBook] = useState(null);
  const [ebook, setEbook] = useState(null);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data: bookRow, error: bookErr } = await supabase.from('books').select('*').eq('id', id).single();
      if (bookErr) {
        console.error(bookErr);
        if (!cancelled) setError('Could not load this book.');
        return;
      }

      const { data: ebookRow, error: ebookErr } = await supabase
        .from('ebook_files')
        .select('*')
        .eq('book_id', id)
        .limit(1)
        .maybeSingle();
      if (ebookErr) console.error(ebookErr);

      if (cancelled) return;
      setBook(bookRow);
      setEbook(ebookRow || null);

      // EPUB and PDF are handed to their real renderers as a file URL — only
      // plain text needs to be fetched and paginated ourselves here.
      if (ebookRow?.file_type === 'txt' && ebookRow.file_url) {
        try {
          const res = await fetch(ebookRow.file_url);
          const text = await res.text();
          if (!cancelled) setContent(text);
        } catch (err) {
          console.error('Failed to fetch ebook content:', err);
          if (!cancelled) setContent('');
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  if (lendingLoading) {
    return <div className="page"><p>Loading…</p></div>;
  }

  if (!hasCheckout) {
    return <Navigate to={`/book/${id}`} replace />;
  }

  if (error) {
    return (
      <div className="page">
        <div className="empty-state"><p>{error}</p></div>
      </div>
    );
  }

  if (!book) {
    return <div className="page"><p>Loading…</p></div>;
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 12 }}>
        <Link to={`/book/${id}`} className="navbar-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back to Book
        </Link>
      </div>

      {!ebook ? (
        <div className="empty-state"><p>No ebook file is attached to this title yet.</p></div>
      ) : (
        <Suspense fallback={<div className="empty-state"><p>Loading reader…</p></div>}>
          {ebook.file_type === 'epub' ? (
            <EpubReader bookTitle={book.title} fileUrl={ebook.file_url} ebookId={ebook.id} />
          ) : ebook.file_type === 'pdf' ? (
            <PdfReader bookTitle={book.title} fileUrl={ebook.file_url} ebookId={ebook.id} />
          ) : (
            <TextReader bookTitle={book.title} content={content} ebookId={ebook.id} />
          )}
        </Suspense>
      )}
    </div>
  );
}
