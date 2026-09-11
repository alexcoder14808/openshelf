import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { uploadCover, uploadAudioTrack, uploadEbookFile, guessEbookFileType, prepareChapterFolder, getAudioDuration } from '../../lib/storageUpload';
import FilePicker from '../../components/FilePicker';
import FolderPicker from '../../components/FolderPicker';
import '../pages.css';

export default function EditBook() {
  const { libraryId, id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [ebook, setEbook] = useState(null);
  const [newCoverFile, setNewCoverFile] = useState(null);
  const [newEbookFile, setNewEbookFile] = useState(null);
  const [folderImportNote, setFolderImportNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [progressLabel, setProgressLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: bookRow, error: bookErr }, { data: trackRows }, { data: ebookRow }] = await Promise.all([
        supabase.from('books').select('*').eq('id', id).single(),
        supabase.from('audiobook_tracks').select('*').eq('book_id', id).order('track_number'),
        supabase.from('ebook_files').select('*').eq('book_id', id).limit(1).maybeSingle(),
      ]);
      if (bookErr) {
        setError('Could not load this book.');
        setLoading(false);
        return;
      }
      setBook(bookRow);
      setTracks((trackRows || []).map((t) => ({ ...t, newFile: null })));
      setEbook(ebookRow || null);
      setLoading(false);
    }
    load();
  }, [id]);

  const updateField = (field, value) => setBook((prev) => ({ ...prev, [field]: value }));

  const updateTrack = (index, field, value) => {
    setTracks((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };
  const addTrackRow = () =>
    setTracks((prev) => [...prev, { track_number: prev.length + 1, title: '', audio_url: null, newFile: null, _new: true }]);
  const removeTrackRow = async (index) => {
    const track = tracks[index];
    if (track.id) {
      const { error: delErr } = await supabase.from('audiobook_tracks').delete().eq('id', track.id);
      if (delErr) {
        alert('Could not delete this chapter.');
        return;
      }
    }
    setTracks((prev) => prev.filter((_, i) => i !== index));
  };

  // Bulk-append a whole folder of additional chapters after whatever's
  // already here — doesn't touch existing chapters.
  const handleFolderSelected = (fileList) => {
    const sorted = prepareChapterFolder(fileList);
    if (sorted.length === 0) {
      setFolderImportNote('No audio files found in that folder.');
      return;
    }
    setTracks((prev) => {
      const nextNumber = prev.length ? Math.max(...prev.map((t) => t.track_number)) + 1 : 1;
      const newRows = sorted.map((file, i) => ({
        track_number: nextNumber + i,
        title: '',
        audio_url: null,
        newFile: file,
        _new: true,
      }));
      return [...prev, ...newRows];
    });
    setFolderImportNote(`${sorted.length} chapter${sorted.length === 1 ? '' : 's'} added from that folder, appended after your existing chapters.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let coverUrl = book.cover_url;
      if (newCoverFile) {
        setProgressLabel('Uploading new cover…');
        coverUrl = await uploadCover(libraryId, id, newCoverFile);
      }

      setProgressLabel('Saving book details…');
      const { error: bookErr } = await supabase
        .from('books')
        .update({
          title: book.title,
          author: book.author,
          description: book.description,
          cover_url: coverUrl,
          genre: book.genre,
          format: book.format,
        })
        .eq('id', id);
      if (bookErr) throw bookErr;

      let doneTracks = 0;
      const tracksWithChanges = tracks.filter((t) => t.newFile || t.id);
      for (const t of tracksWithChanges) {
        let audioUrl = t.audio_url;
        let durationSeconds = t.duration_seconds ?? null;
        if (t.newFile) {
          doneTracks += 1;
          setProgressLabel(`Uploading chapter file ${doneTracks}…`);
          [audioUrl, durationSeconds] = await Promise.all([
            uploadAudioTrack(libraryId, id, t.newFile),
            getAudioDuration(t.newFile),
          ]);
        }
        if (!audioUrl) continue; // new row with no file chosen yet — skip

        if (t.id) {
          const { error: updErr } = await supabase
            .from('audiobook_tracks')
            .update({ track_number: t.track_number, title: t.title || null, audio_url: audioUrl, duration_seconds: durationSeconds })
            .eq('id', t.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from('audiobook_tracks').insert({
            book_id: id,
            track_number: t.track_number,
            title: t.title || null,
            audio_url: audioUrl,
            duration_seconds: durationSeconds,
          });
          if (insErr) throw insErr;
        }
      }

      let ebookUrl = ebook?.file_url;
      let ebookType = ebook?.file_type || 'epub';
      if (newEbookFile) {
        setProgressLabel('Uploading new ebook file…');
        ebookUrl = await uploadEbookFile(libraryId, id, newEbookFile);
        ebookType = guessEbookFileType(newEbookFile);
      }
      if (ebookUrl) {
        if (ebook?.id) {
          const { error: ebookErr } = await supabase
            .from('ebook_files')
            .update({ file_url: ebookUrl, file_type: ebookType })
            .eq('id', ebook.id);
          if (ebookErr) throw ebookErr;
        } else {
          const { error: ebookErr } = await supabase
            .from('ebook_files')
            .insert({ book_id: id, file_url: ebookUrl, file_type: ebookType });
          if (ebookErr) throw ebookErr;
        }
      }

      navigate(`/admin/${libraryId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
      setProgressLabel('');
    }
  };

  if (loading) return <div className="page"><p>Loading…</p></div>;
  if (!book) return <div className="page"><div className="empty-state"><p>{error || 'Book not found.'}</p></div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Edit book</h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        <div className="form-field">
          <label>Title</label>
          <input required value={book.title || ''} onChange={(e) => updateField('title', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Author</label>
          <input required value={book.author || ''} onChange={(e) => updateField('author', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea rows={3} value={book.description || ''} onChange={(e) => updateField('description', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Cover image</label>
          {book.cover_url && !newCoverFile && (
            <img src={book.cover_url} alt="" style={{ width: 80, borderRadius: 8, marginBottom: 8 }} />
          )}
          <FilePicker accept="image/*" file={newCoverFile} onChange={setNewCoverFile} placeholder="Replace cover image…" />
        </div>
        <div className="form-field">
          <label>Genre</label>
          <input value={book.genre || ''} onChange={(e) => updateField('genre', e.target.value)} />
        </div>
        <div className="form-field">
          <label>Format</label>
          <select value={book.format} onChange={(e) => updateField('format', e.target.value)}>
            <option value="audiobook">Audiobook</option>
            <option value="ebook">Ebook</option>
            <option value="both">Both</option>
          </select>
        </div>

        {book.format !== 'ebook' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#40444c' }}>Audiobook chapters</label>

            <div style={{ margin: '10px 0 12px' }}>
              <FolderPicker onFilesSelected={handleFolderSelected} label="Add a folder of new chapters…" />
              {folderImportNote && (
                <p style={{ fontSize: '0.78rem', color: '#1f9254', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 size={14} /> {folderImportNote}
                </p>
              )}
            </div>

            {tracks.map((t, i) => (
              <div key={t.id || `new-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  min="1"
                  value={t.track_number}
                  onChange={(e) => updateTrack(i, 'track_number', Number(e.target.value))}
                  style={{ width: 60, border: '1px solid #e2e4e8', borderRadius: 10, padding: '9px 8px' }}
                />
                <input
                  placeholder="Chapter title (optional)"
                  value={t.title || ''}
                  onChange={(e) => updateTrack(i, 'title', e.target.value)}
                  style={{ flex: 1, border: '1px solid #e2e4e8', borderRadius: 10, padding: '9px 12px' }}
                />
                <div style={{ flex: 1.5 }}>
                  <FilePicker
                    accept="audio/*"
                    file={t.newFile}
                    onChange={(f) => updateTrack(i, 'newFile', f)}
                    placeholder={t.audio_url ? 'Replace audio file…' : 'Choose audio file…'}
                    compact
                  />
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

        {book.format !== 'audiobook' && (
          <div className="form-field">
            <label>Ebook file</label>
            <FilePicker
              accept=".epub,.pdf,.txt"
              file={newEbookFile}
              onChange={setNewEbookFile}
              placeholder={ebook?.file_url ? `Replace ebook file (currently ${ebook.file_type})…` : 'Choose an ebook file…'}
            />
          </div>
        )}

        <button className="form-submit" type="submit" disabled={saving}>
          {saving ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Loader2 size={16} className="spin" /> {progressLabel || 'Saving…'}
            </span>
          ) : (
            'Save changes'
          )}
        </button>
      </form>
    </div>
  );
}
