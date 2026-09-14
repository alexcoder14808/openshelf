import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import './SlidePanel.css';

export default function SlidePanel({ open, title, onClose, children }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    function handlePointerDown(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="slide-panel-overlay" role="presentation">
      <div className="slide-panel" ref={panelRef} role="dialog" aria-modal="true" aria-label={title}>
        <div className="slide-panel-header">
          <h3>{title}</h3>
          <button className="slide-panel-close" onClick={onClose} aria-label="Close panel">
            <X size={20} />
          </button>
        </div>
        <div className="slide-panel-body">{children}</div>
      </div>
    </div>
  );
}
