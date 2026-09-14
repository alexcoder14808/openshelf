import { useEffect, useRef, useState } from 'react';
import ePub from 'epubjs';
import { ChevronLeft, ChevronRight, Minus, Plus, List } from 'lucide-react';
import PageFlip from './PageFlip';
import './ReaderChrome.css';

const FONT_KEY = 'openshelf-ebook-font-size';

/**
 * Renders a real .epub file via epub.js in paginated mode.
 * - Progress (CFI) and font size persist per-ebook in localStorage.
 * - Next/Previous run through the shared PageFlip transition; the actual
 *   epub.js pagination (rendition.next()/prev()) happens at the transition's
 *   midpoint, so the visual "turn" and the real page change land together.
 */
export default function EpubReader({ bookTitle, fileUrl, ebookId }) {
  const containerRef = useRef(null);
  const bookRef = useRef(null);
  const renditionRef = useRef(null);
  const flipRef = useRef(null);

  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem(FONT_KEY)) || 100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toc, setToc] = useState([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [percent, setPercent] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const progressKey = `openshelf-epub-progress-${ebookId}`;

  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;
    let cancelled = false;

    setLoading(true);
    setError('');

    const book = ePub(fileUrl);
    bookRef.current = book;

    const rendition = book.renderTo(containerRef.current, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'auto', // two-page spread on wide screens, single page on narrow ones — matches a real book
    });
    renditionRef.current = rendition;

    rendition.themes.default({
      body: { padding: '0 8px' },
    });
    rendition.themes.fontSize(`${fontSize}%`);

    const savedCfi = localStorage.getItem(progressKey);

    book.ready
      .then(() => rendition.display(savedCfi || undefined))
      .then(() => {
        if (cancelled) return;
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to open EPUB:', err);
        if (!cancelled) {
          setError('This EPUB file could not be opened.');
          setLoading(false);
        }
      });

    book.loaded.navigation
      .then((nav) => {
        if (!cancelled) setToc(nav.toc || []);
      })
      .catch((err) => console.error('Failed to load table of contents:', err));

    // Generate a location map in the background so we can show a percentage.
    // This can take a moment on large books — it's non-blocking.
    book.ready
      .then(() => book.locations.generate(1200))
      .catch((err) => console.error('Failed to generate locations:', err));

    rendition.on('relocated', (location) => {
      if (cancelled) return;
      localStorage.setItem(progressKey, location.start.cfi);
      setAtStart(!!location.atStart);
      setAtEnd(!!location.atEnd);
      if (book.locations?.length?.()) {
        setPercent(Math.round((book.locations.percentageFromCfi(location.start.cfi) || 0) * 100));
      }
    });

    rendition.on('rendered', () => setLoading(false));

    return () => {
      cancelled = true;
      renditionRef.current = null;
      bookRef.current = null;
      book.destroy();
    };
  }, [fileUrl, ebookId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (renditionRef.current) renditionRef.current.themes.fontSize(`${fontSize}%`);
    localStorage.setItem(FONT_KEY, String(fontSize));
  }, [fontSize]);

  const goNext = () => {
    if (atEnd || !renditionRef.current) return;
    flipRef.current?.turn('next', () => renditionRef.current?.next());
  };
  const goPrev = () => {
    if (atStart || !renditionRef.current) return;
    flipRef.current?.turn('prev', () => renditionRef.current?.prev());
  };

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atStart, atEnd]);

  const goToTocItem = (href) => {
    renditionRef.current?.display(href);
    setTocOpen(false);
  };

  return (
    <div className="ebook-reader">
      <div className="ebook-reader-toolbar">
        <h2 className="ebook-reader-title">{bookTitle}</h2>
        <div className="ebook-reader-toolbar-right">
          <div className="ebook-reader-font-controls">
            <button onClick={() => setFontSize((s) => Math.max(s - 10, 70))} aria-label="Decrease font size">
              <Minus size={16} />
            </button>
            <span>{fontSize}%</span>
            <button onClick={() => setFontSize((s) => Math.min(s + 10, 200))} aria-label="Increase font size">
              <Plus size={16} />
            </button>
          </div>
          {toc.length > 0 && (
            <button className="ebook-reader-toc-btn" onClick={() => setTocOpen((o) => !o)}>
              <List size={14} /> Contents
            </button>
          )}
        </div>
      </div>

      <div className="ebook-reader-viewport">
        {loading && <div className="ebook-reader-viewport-loading">Opening book…</div>}
        {error && <div className="ebook-reader-viewport-error">{error}</div>}

        <PageFlip ref={flipRef}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </PageFlip>

        {tocOpen && (
          <div className="ebook-reader-toc-panel">
            <h4>Contents</h4>
            {toc.map((item) => (
              <button key={item.href} className="ebook-reader-toc-item" onClick={() => goToTocItem(item.href)}>
                {item.label?.trim() || item.href}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ebook-reader-footer">
        <button className="ebook-reader-nav-btn" onClick={goPrev} disabled={atStart} aria-label="Previous page">
          <ChevronLeft size={20} />
        </button>
        <div className="ebook-reader-progress">
          <div className="ebook-reader-progress-track">
            <div className="ebook-reader-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <span>{percent}%</span>
        </div>
        <button className="ebook-reader-nav-btn" onClick={goNext} disabled={atEnd} aria-label="Next page">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
