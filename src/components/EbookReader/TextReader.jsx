import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import PageFlip from './PageFlip';
import './ReaderChrome.css';

const FONT_KEY = 'openshelf-ebook-font-size';
const PAGE_CHARS = 1800; // simple client-side pagination chunk size

/**
 * A lightweight paginated reader for plain-text content.
 */
export default function TextReader({ bookTitle, content, ebookId }) {
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem(FONT_KEY)) || 18);
  const [pageIndex, setPageIndex] = useState(0);
  const flipRef = useRef(null);

  const pages = useMemo(() => {
    if (!content) return [];
    const chunks = [];
    for (let i = 0; i < content.length; i += PAGE_CHARS) {
      chunks.push(content.slice(i, i + PAGE_CHARS));
    }
    return chunks.length ? chunks : [''];
  }, [content]);

  const progressKey = `openshelf-ebook-progress-${ebookId}`;

  useEffect(() => {
    const saved = Number(localStorage.getItem(progressKey));
    if (Number.isFinite(saved) && saved >= 0 && saved < pages.length) {
      setPageIndex(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ebookId, pages.length]);

  useEffect(() => {
    localStorage.setItem(progressKey, String(pageIndex));
  }, [pageIndex, progressKey]);

  useEffect(() => {
    localStorage.setItem(FONT_KEY, String(fontSize));
  }, [fontSize]);

  const goPrev = () => {
    if (pageIndex <= 0) return;
    flipRef.current?.turn('prev', () => setPageIndex((p) => Math.max(p - 1, 0)));
  };
  const goNext = () => {
    if (pageIndex >= pages.length - 1) return;
    flipRef.current?.turn('next', () => setPageIndex((p) => Math.min(p + 1, pages.length - 1)));
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
  }, [pageIndex, pages.length]);

  const percent = pages.length > 1 ? Math.round((pageIndex / (pages.length - 1)) * 100) : 0;

  return (
    <div className="ebook-reader">
      <div className="ebook-reader-toolbar">
        <h2 className="ebook-reader-title">{bookTitle}</h2>
        <div className="ebook-reader-font-controls">
          <button onClick={() => setFontSize((s) => Math.max(s - 2, 12))} aria-label="Decrease font size">
            <Minus size={16} />
          </button>
          <span>{fontSize}px</span>
          <button onClick={() => setFontSize((s) => Math.min(s + 2, 32))} aria-label="Increase font size">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="ebook-reader-viewport">
        <PageFlip ref={flipRef}>
          <div className="ebook-reader-page" style={{ fontSize: `${fontSize}px`, padding: 24, height: '100%', overflowY: 'auto' }}>
            {pages[pageIndex] || 'No content available for this ebook yet.'}
          </div>
        </PageFlip>
      </div>

      <div className="ebook-reader-footer">
        <button className="ebook-reader-nav-btn" onClick={goPrev} disabled={pageIndex === 0} aria-label="Previous page">
          <ChevronLeft size={20} />
        </button>
        <div className="ebook-reader-progress">
          <div className="ebook-reader-progress-track">
            <div className="ebook-reader-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <span>{pageIndex + 1} / {pages.length}</span>
        </div>
        <button className="ebook-reader-nav-btn" onClick={goNext} disabled={pageIndex >= pages.length - 1} aria-label="Next page">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
