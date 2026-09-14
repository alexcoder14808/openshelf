import { useEffect, useRef } from 'react';
import { FolderUp } from 'lucide-react';

/**
 * A folder picker — lets someone select an entire folder of chapter audio
 * files in one go instead of adding chapters one at a time. `webkitdirectory`
 * isn't a standard React prop and is unreliable when set via JSX attributes
 * across React/browser versions, so it's set imperatively on the DOM node
 * instead, which works consistently everywhere that supports it (Chrome,
 * Edge, Safari, and current Firefox).
 */
export default function FolderPicker({ onFilesSelected, label = 'Choose a chapter folder…' }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.webkitdirectory = true;
      inputRef.current.directory = true;
    }
  }, []);

  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        border: '1px dashed #5b6df5',
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'pointer',
        background: '#f5f6ff',
        fontSize: '0.85rem',
        fontWeight: 600,
        color: '#5b6df5',
      }}
    >
      <FolderUp size={16} />
      <span>{label}</span>
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => {
          onFilesSelected(e.target.files);
          e.target.value = ''; // allow re-selecting the same folder later
        }}
        style={{ display: 'none' }}
      />
    </label>
  );
}
