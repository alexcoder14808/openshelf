import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import '../pages.css';

export default function EditBook() {
  const { libraryId, id } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [ebook, setEbook] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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
      setTracks(trackRows || []);
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
    setTracks((prev) => [...prev, { track_number: prev.length + 1, title: '', audio_url: '', _new: true }]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { error: bookErr } = await supabase
        .from('books')
        .update({
          title: book.title,
          author: book.author,
          description: book.description,
          cover_url: book.cover_url,
          genre: book.genre,
          format: book.format,
        })
        .eq('id', id);
      if (bookErr) throw bookErr;

      for (const t of tracks) {
        if (!t.audio_url?.trim()) continue;
        if (t.id) {
          const { error: updErr } = await supabase
            .from('audiobook_tracks')
            .update({ track_number: t.track_number, title: t.title || null, audio_url: t.audio_url })
            .eq('id', t.id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase.from('audiobook_tracks').insert({
            book_id: id,
            track_number: t.track_number,
            title: t.title || null,
            audio_url: t.audio_url,
          });
          if (insErr) throw insErr;
        }
      }

      if (ebook?.file_url?.trim()) {
        if (ebook.id) {
          const { error: ebookErr } = await supabase
            .from('ebook_files')
            .update({ file_url: ebook.file_url, file_type: ebook.file_type })
            .eq('id', ebook.id);
          if (ebookErr) throw ebookErr;
        } else {
          const { error: ebookErr } = await supabase
            .from('ebook_files')
            .insert({ book_id: id, file_url: ebook.file_url, file_type: ebook.file_type || 'epub' });
          if (ebookErr) throw ebookErr;
        }
      }

      navigate(`/admin/${libraryId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
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
          <label>Cover image URL</label>
          <input value={book.cover_url || ''} onChange={(e) => updateField('cover_url', e.target.value)} />
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
                <input
                  placeholder="Audio file URL"
                  value={t.audio_url || ''}
                  onChange={(e) => updateTrack(i, 'audio_url', e.target.value)}
                  style={{ flex: 1.5, border: '1px solid #e2e4e8', borderRadius: 10, padding: '9px 12px' }}
                />
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

        {book.format !== 'audiobook' && (
          <div style={{ marginBottom: 20 }}>
            <div className="form-field">
              <label>Ebook file URL</label>
              <input
                value={ebook?.file_url || ''}
                onChange={(e) => setEbook((prev) => ({ ...(prev || { file_type: 'epub' }), file_url: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label>Ebook file type</label>
              <select
                value={ebook?.file_type || 'epub'}
                onChange={(e) => setEbook((prev) => ({ ...(prev || {}), file_type: e.target.value }))}
              >
                <option value="epub">EPUB</option>
                <option value="pdf">PDF</option>
                <option value="txt">Plain text</option>
              </select>
            </div>
          </div>
        )}

        <button className="form-submit" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
