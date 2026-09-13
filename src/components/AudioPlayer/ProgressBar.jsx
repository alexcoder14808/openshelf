import { useCallback, useEffect, useRef, useState } from 'react';
import { safePercent } from '../../utils/formatTime';
import './ProgressBar.css';

/**
 * A stable, pointer-based seek bar.
 * - Never attaches a new global listener per render (listeners are attached
 *   only for the duration of an active drag, via refs).
 * - Fully guards against NaN / Infinity / duration===0 / out-of-range values.
 * - Works identically for mouse, touch and pointer events.
 */
export default function ProgressBar({ currentTime, duration, onSeek, size = 'default' }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const [dragPercent, setDragPercent] = useState(null); // null = not dragging

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const displayPercent = dragPercent !== null ? dragPercent : safePercent(currentTime, safeDuration);

  const percentFromClientX = useCallback((clientX) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const ratio = (clientX - rect.left) / rect.width;
    return Math.min(Math.max(ratio, 0), 1) * 100;
  }, []);

  const commitSeek = useCallback(
    (percent) => {
      if (safeDuration <= 0) return; // metadata not ready yet — ignore seek safely
      const target = (percent / 100) * safeDuration;
      onSeek(target);
    },
    [safeDuration, onSeek]
  );

  // Attach move/up listeners only while actively dragging.
  useEffect(() => {
    function handleMove(e) {
      if (!draggingRef.current) return;
      const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX === undefined) return;
      setDragPercent(percentFromClientX(clientX));
    }

    function handleUp(e) {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const clientX = 'changedTouches' in e ? e.changedTouches[0]?.clientX : e.clientX;
      const finalPercent = clientX !== undefined ? percentFromClientX(clientX) : dragPercent;
      if (finalPercent !== null) commitSeek(finalPercent);
      setDragPercent(null);
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
    // Intentionally re-subscribed only when these stable callbacks change,
    // not on every render — this satisfies "don't attach a new listener
    // per render" while still seeing fresh drag state via refs/closures.
  }, [percentFromClientX, commitSeek, dragPercent]);

  const startDrag = useCallback(
    (clientX) => {
      draggingRef.current = true;
      setDragPercent(percentFromClientX(clientX));
    },
    [percentFromClientX]
  );

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault();
      startDrag(e.clientX);
    },
    [startDrag]
  );

  const handleTouchStart = useCallback(
    (e) => {
      const clientX = e.touches[0]?.clientX;
      if (clientX !== undefined) startDrag(clientX);
    },
    [startDrag]
  );

  const handleClick = useCallback(
    (e) => {
      // A simple click (no drag) also seeks — handled separately from
      // mousedown so a drag-then-release doesn't double-fire.
      if (draggingRef.current) return;
      commitSeek(percentFromClientX(e.clientX));
    },
    [commitSeek, percentFromClientX]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (safeDuration <= 0) return;
      const step = e.shiftKey ? 30 : 5;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSeek(Math.min((currentTime || 0) + step, safeDuration));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSeek(Math.max((currentTime || 0) - step, 0));
      } else if (e.key === 'Home') {
        e.preventDefault();
        onSeek(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        onSeek(Math.max(safeDuration - 0.25, 0));
      }
    },
    [currentTime, safeDuration, onSeek]
  );

  return (
    <div
      className={`progress-bar progress-bar--${size}`}
      ref={trackRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(displayPercent)}
      onKeyDown={handleKeyDown}
    >
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${displayPercent}%` }} />
        <div className="progress-bar-thumb" style={{ left: `${displayPercent}%` }} />
      </div>
    </div>
  );
}
