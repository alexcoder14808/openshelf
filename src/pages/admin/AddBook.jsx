import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { uploadCover, uploadAudioTrack, uploadEbookFile, guessEbookFileType } from '../../lib/storageUpload';
import '../pages.css';

function emptyTrack(n) {
  return { track_number: n, title: '', file: null };
}

export default function AddBook() {
  const { libraryId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [coverFile, setCoverFile] = useState(null);
  const [genre, setGenre] = useState('');
  const [format, setFormat] = useState('audiobook');
  const [copies, setCopies] = useState(1);
  const [tracks, setTracks] = useState([emptyTrack(1)]);
  const [ebookFile, setEbookFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');

  const updateTrack = (index, field, value) => {
    setTracks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };
  const addTrackRow = () => setTracks((prev) => [...prev, emptyTrack(prev.length + 1)]);
  const removeTrackRow = (index) => setTracks((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      setProgressLabel('Creating book record…');
      const { data: book, error: bookErr } = await supabase
        .from('books')
        .insert({
          library_id: libraryId,
          title,
          author,
          description,
          genre: genre || null,
          format,
          total_copies: copies,
          available_copies: copies,
        })
        .select()
        .single();
      if (bookErr) throw bookErr;

      if (coverFile) {
        setProgressLabel('Uploading cover image…');
        const coverUrl = await uploadCover(libraryId, book.id, coverFile);
        const { error: coverErr } = await supabase.from('books').update({ cover_url: coverUrl }).eq('id', book.id);
        if (coverErr) throw coverErr;
      }

      if (format !== 'ebook') {
        const validTracks = tracks.filter((t) => t.file);
        for (const t of validTracks) {
          setProgressLabel(`Uploading ${t.title || `chapter ${t.track_number}`}…`);
          const audioUrl = await uploadAudioTrack(libraryId, book.id, t.file);
          const { error: trackErr } = await supabase.from('audiobook_tracks').insert({
            book_id: book.id,
            track_number: t.track_number,
            title: t.title || null,
            audio_url: audioUrl,
          });
          if (trackErr) throw trackErr;
        }
      }

      if (format !== 'audiobook' && ebookFile) {
        setProgressLabel('Uploading ebook file…');
        const fileUrl = await uploadEbookFile(libraryId, book.id, ebookFile);
        const { error: ebookErr } = await supabase.from('ebook_files').insert({
          book_id: book.id,
          file_type: guessEbookFileType(ebookFile),
          file_url: fileUrl,
        });
        if (ebookErr) throw ebookErr;
      }

      navigate(`/admin/${libraryId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not save this book.');
    } finally {
      setSaving(false);
      setProgressLabel('');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Add a book</h1>
        <p>Add a new title to your library's private collection. Upload files straight from your computer — no URLs needed.</p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        <div className="form-field">
          <label>Title</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Author</label>
          <input required value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Cover image</label>
          <FilePicker accept="image/*" file={coverFile} onChange={setCoverFile} placeholder="Choose an image file…" />
        </div>
        <div className="form-field">
          <label>Genre</label>
          <input value={genre} onChange={(e) => setGenre(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="audiobook">Audiobook</option>
            <option value="ebook">Ebook</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="form-field">
          <label>Copies available to lend</label>
          <input type="number" min="1" value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))} />
        </div>

        {format !== 'ebook' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#40444c' }}>Audiobook chapters</label>
            <p style={{ fontSize: '0.78rem', color: '#9aa0ab', margin: '4px 0 10px' }}>
              Upload each chapter's audio file. Leave the title blank and OpenShelf will label it "Chapter N" automatically.
              The uploaded filename is never shown to readers.
            </p>
            {tracks.map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  value={t.track_number}
                  onChange={(e) => updateTrack(i, 'track_number', Number(e.target.value))}
                  style={{ width: 60, border: '1px solid #e2e4e8', borderRadius: 10, padding: '9px 8px' }}
                />
                <input
                  placeholder="Chapter title (optional)"
                  value={t.title}
                  onChange={(e) => updateTrack(i, 'title', e.target.value)}
                  style={{ flex: 1, border: '1px solid #e2e4e8', borderRadius: 10, padding: '9px 12px' }}
                />
                <div style={{ flex: 1.5 }}>
                  <FilePicker accept="audio/*" file={t.file} onChange={(f) => updateTrack(i, 'file', f)} placeholder="Choose audio file…" compact />
                </div>
                <button type="button" className="panel-list-delete" onClick={() => removeTrackRow(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="toolbar-btn" onClick={addTrackRow}>
              <Plus size={14} /> <span>Add chapter</span>
            </button>
          </div>
        )}

        {format !== 'audiobook' && (
          <div className="form-field">
            <label>Ebook file (.epub, .pdf, or .txt)</label>
            <FilePicker accept=".epub,.pdf,.txt" file={ebookFile} onChange={setEbookFile} placeholder="Choose an ebook file…" />
          </div>
        )}

        <button className="form-submit" type="submit" disabled={saving}>
          {saving ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} className="spin" /> {progressLabel || 'Saving…'}
            </span>
          ) : (
            'Save book'
          )}
        </button>
      </form>
    </div>
  );
}

/** A styled file input — click-to-browse, shows the chosen filename. */
function FilePicker({ accept, file, onChange, placeholder, compact }) {
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
