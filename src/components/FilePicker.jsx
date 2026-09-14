import { Upload } from 'lucide-react';

/** A styled file input — click-to-browse, shows the chosen filename. */
export default function FilePicker({ accept, file, onChange, placeholder, compact }) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        border: '1px dashed #d7dae0',
        borderRadius: 10,
        padding: compact ? '9px 12px' : '12px 14px',
        cursor: 'pointer',
        background: '#fafbfc',
        fontSize: '0.85rem',
        color: file ? '#16181d' : '#9aa0ab',
      }}
    >
      <Upload size={16} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file ? file.name : placeholder}
      </span>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        style={{ display: 'none' }}
      />
    </label>
  );
}
