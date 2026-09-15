import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// Vite's `?url` suffix gives us the built worker file's final URL so pdf.js
// can load it as a separate script, instead of bundling it into the main
// chunk (which pdf.js's worker architecture doesn't support anyway).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import PageFlip from './PageFlip';
import './ReaderChrome.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const ZOOM_KEY = 'openshelf-pdf-zoom';

export default function PdfReader({ bookTitle, fileUrl, ebookId }) {
  const canvasRef = useRef(null);
  const pdfRef = useRef(null);
  const flipRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(() => Number(localStorage.getItem(ZOOM_KEY)) || 1.1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const progressKey = `openshelf-pdf-progress-${ebookId}`;

  // Load the document once per file.
  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    setLoading(true);
    setError('');

    pdfjsLib
      .getDocument(fileUrl)
      .promise.then((pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        const saved = Number(localStorage.getItem(progressKey));
        const startPage = Number.isFinite(saved) && saved >= 1 && saved <= pdf.numPages ? saved : 1;
        setPageNum(startPage);
      })
      .catch((err) => {
        console.error('Failed to open PDF:', err);
        if (!cancelled) {
          setError('This PDF file could not be opened.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      pdfRef.current?.destroy?.();
      pdfRef.current = null;
    };
  }, [fileUrl, ebookId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render whichever page is current whenever it (or zoom) changes.
  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas || !pageNum) return;

    let cancelled = false;

    async function renderPage() {
      try {
        // pdf.js throws if a previous render on this canvas hasn't finished —
        // cancel it defensively before starting a new one (guards against
        // rapid next/prev clicks racing each other).
        renderTaskRef.current?.cancel();

        const page = await pdf.getPage(pageNum);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: zoom });
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const task = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;

        localStorage.setItem(progressKey, String(pageNum));
        setLoading(false);
      } catch (err) {
        if (err?.name === 'RenderingCancelledException') return;
        console.error('Failed to render PDF page:', err);
        if (!cancelled) setError('This page could not be rendered.');
      }
    }

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pageNum, zoom, progressKey]);

  useEffect(() => {
    localStorage.setItem(ZOOM_KEY, String(zoom));
  }, [zoom]);

  const goNext = () => {
    if (pageNum >= numPages) return;
    flipRef.current?.turn('next', () => setPageNum((p) => Math.min(p + 1, numPages)));
  };
  const goPrev = () => {
    if (pageNum <= 1) return;
    flipRef.current?.turn('prev', () => setPageNum((p) => Math.max(p - 1, 1)));
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
  }, [pageNum, numPages]);

  const percent = numPages > 1 ? Math.round(((pageNum - 1) / (numPages - 1)) * 100) : 0;

  return (
    <div className="ebook-reader">
      <div className="ebook-reader-toolbar">
        <h2 className="ebook-reader-title">{bookTitle}</h2>
        <div className="ebook-reader-font-controls">
          <button onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))} aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(z + 0.1, 2.5))} aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      <div className="ebook-reader-viewport" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading && <div className="ebook-reader-viewport-loading">Opening book…</div>}
        {error && <div className="ebook-reader-viewport-error">{error}</div>}

        <PageFlip ref={flipRef}>
          <div style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', justifyContent: 'center', padding: 16 }}>
            <canvas ref={canvasRef} style={{ boxShadow: '0 4px 16px rgba(15,23,42,0.12)' }} />
          </div>
        </PageFlip>
      </div>

      <div className="ebook-reader-footer">
        <button className="ebook-reader-nav-btn" onClick={goPrev} disabled={pageNum <= 1} aria-label="Previous page">
          <ChevronLeft size={20} />
        </button>
        <div className="ebook-reader-progress">
          <div className="ebook-reader-progress-track">
            <div className="ebook-reader-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <span>{pageNum} / {numPages || '…'}</span>
        </div>
        <button className="ebook-reader-nav-btn" onClick={goNext} disabled={pageNum >= numPages} aria-label="Next page">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
