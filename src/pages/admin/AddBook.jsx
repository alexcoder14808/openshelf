import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { uploadCover, uploadAudioTrack, uploadEbookFile, guessEbookFileType, prepareChapterFolder, getAudioDuration } from '../../lib/storageUpload';
import FilePicker from '../../components/FilePicker';
import FolderPicker from '../../components/FolderPicker';
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
  const [folderImportNote, setFolderImportNote] = useState('');
  const [ebookFile, setEbookFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');

  const updateTrack = (index, field, value) => {
    setTracks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };
  const addTrackRow = () => setTracks((prev) => [...prev, emptyTrack(prev.length + 1)]);
  const removeTrackRow = (index) => setTracks((prev) => prev.filter((_, i) => i !== index));

  // The whole point: drop in a folder, every audio file inside becomes a
  // chapter, already in the right order, in one action.
  const handleFolderSelected = (fileList) => {
    const sorted = prepareChapterFolder(fileList);
    if (sorted.length === 0) {
      setFolderImportNote('No audio files found in that folder.');
      return;
    }

    setTracks((prev) => {
      // If the form is still just the untouched default first row, replace
      // it outright rather than leaving an empty chapter 1 behind.
      const startingFrom = prev.length === 1 && !prev[0].file && !prev[0].title ? [] : prev;
      const nextNumber = startingFrom.length ? Math.max(...startingFrom.map((t) => t.track_number)) + 1 : 1;
      const newRows = sorted.map((file, i) => ({
        track_number: nextNumber + i,
        title: '',
        file,
      }));
      return [...startingFrom, ...newRows];
    });

    setFolderImportNote(`${sorted.length} chapter${sorted.length === 1 ? '' : 's'} added from that folder, in order. Give them real titles below if you'd like — otherwise they'll show as "Chapter 1", "Chapter 2", etc.`);
  };

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
        let done = 0;
        for (const t of validTracks) {
          done += 1;
          setProgressLabel(`Uploading chapter ${done} of ${validTracks.length}…`);
          const [audioUrl, durationSeconds] = await Promise.all([
            uploadAudioTrack(libraryId, book.id, t.file),
            getAudioDuration(t.file),
          ]);
          const { error: trackErr } = await supabase.from('audiobook_tracks').insert({
            book_id: book.id,
            track_number: t.track_number,
            title: t.title || null,
            audio_url: audioUrl,
            duration_seconds: durationSeconds,
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
              Fastest way: pick the whole folder of chapter files and they'll be added below already in order.
              Uploaded filenames are never shown to readers.
            </p>

            <div style={{ marginBottom: 12 }}>
              <FolderPicker onFilesSelected={handleFolderSelected} label="Choose a chapter folder…" />
              {folderImportNote && (
                <p style={{ fontSize: '0.78rem', color: '#1f9254', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> {folderImportNote}
                </p>
              )}
            </div>

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
              <Plus size={14} /> <span>Add one chapter manually</span>
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
