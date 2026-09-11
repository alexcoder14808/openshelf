import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import './PageFlip.css';

/**
 * A lightweight "page turning" transition wrapper.
 *
 * This is NOT a literal 3D paper-curl simulation — it's a slide + tilt +
 * fade that reads clearly as "the page is turning" while staying simple,
 * fast, and free of cross-browser 3D-transform-origin quirks. It wraps
 * whatever reading surface is inside it (an epub.js iframe, a PDF canvas,
 * or plain text pages) without needing to know anything about that content.
 *
 * Usage: call `ref.current.turn('next' | 'prev', onMidpoint)`. `onMidpoint`
 * fires once the outgoing page has fully turned away — that's where the
 * caller should swap the underlying content (go to the next PDF page,
 * call epub.js's rendition.next(), advance the text pagination, etc).
 * The wrapper then animates the new content turning into place.
 */
const PageFlip = forwardRef(function PageFlip({ children }, ref) {
  const [phase, setPhase] = useState('idle'); // idle | out | in-start | in
  const [direction, setDirection] = useState('next');
  const midpointCallback = useRef(null);

  useImperativeHandle(ref, () => ({
    turn(dir, onMidpoint) {
      if (phase !== 'idle') return false; // ignore taps while mid-animation
      setDirection(dir);
      midpointCallback.current = onMidpoint;
      setPhase('out');
      return true;
    },
    get isAnimating() {
      return phase !== 'idle';
    },
  }));

  const handleTransitionEnd = (e) => {
    if (e.target !== e.currentTarget) return; // ignore bubbled child transitions
    if (phase === 'out') {
      midpointCallback.current?.();
      midpointCallback.current = null;
      setPhase('in-start');
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase('in')));
    } else if (phase === 'in') {
      setPhase('idle');
    }
  };

  const className = ['page-flip-surface', phase !== 'idle' && `page-flip--${phase}-${direction}`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="page-flip-viewport">
      <div className={className} onTransitionEnd={handleTransitionEnd}>
        {children}
      </div>
    </div>
  );
});

export default PageFlip;
