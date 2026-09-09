import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import '../pages.css';

function emptyTrack(n) {
  return { track_number: n, title: '', audio_url: '' };
}

export default function AddBook() {
  const { libraryId } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [format, setFormat] = useState('audiobook');
  const [copies, setCopies] = useState(1);
  const [tracks, setTracks] = useState([emptyTrack(1)]);
  const [ebookUrl, setEbookUrl] = useState('');
  const [ebookType, setEbookType] = useState('epub');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      const { data: book, error: bookErr } = await supabase
        .from('books')
        .insert({
          library_id: libraryId,
          title,
          author,
          description,
          cover_url: coverUrl || null,
          genre: genre || null,
          format,
          total_copies: copies,
          available_copies: copies,
        })
        .select()
        .single();
      if (bookErr) throw bookErr;

      if (format !== 'ebook') {
        const validTracks = tracks.filter((t) => t.audio_url.trim());
        if (validTracks.length > 0) {
          const { error: tracksErr } = await supabase.from('audiobook_tracks').insert(
            validTracks.map((t, i) => ({
              book_id: book.id,
              track_number: t.track_number || i + 1,
              title: t.title || null,
              audio_url: t.audio_url,
            }))
          );
          if (tracksErr) throw tracksErr;
        }
      }

      if (format !== 'audiobook' && ebookUrl.trim()) {
        const { error: ebookErr } = await supabase.from('ebook_files').insert({
          book_id: book.id,
          file_type: ebookType,
          file_url: ebookUrl,
        });
        if (ebookErr) throw ebookErr;
      }

      navigate(`/admin/${libraryId}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not save this book.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Add a book</h1>
        <p>Add a new title to your library's private collection.</p>
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
          <label>Cover image URL</label>
          <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://…" />
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
          <input
            type="number"
            min="1"
            value={copies}
            onChange={(e) => setCopies(Math.max(1, Number(e.target.value)))}
          />
          <p style={{ fontSize: '0.78rem', color: '#9aa0ab', margin: '2px 0 0' }}>
            How many members can borrow this title at the same time. You can change this later
            from the catalog list — extra copies immediately clear the waitlist.
          </p>
        </div>

        {format !== 'ebook' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#40444c' }}>Audiobook chapters</label>
            <p style={{ fontSize: '0.78rem', color: '#9aa0ab', margin: '4px 0 10px' }}>
              The "title" field is optional — leave it blank and OpenShelf will label it "Chapter N" automatically.
              The audio URL is never shown to readers.
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
                <input
                  placeholder="Audio file URL"
                  value={t.audio_url}
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

        {format !== 'audiobook' && (
          <div style={{ marginBottom: 20 }}>
            <div className="form-field">
              <label>Ebook file URL</label>
              <input value={ebookUrl} onChange={(e) => setEbookUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div className="form-field">
              <label>Ebook file type</label>
              <select value={ebookType} onChange={(e) => setEbookType(e.target.value)}>
                <option value="epub">EPUB</option>
                <option value="pdf">PDF</option>
                <option value="txt">Plain text</option>
              </select>
            </div>
          </div>
        )}

        <button className="form-submit" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save book'}
        </button>
      </form>
    </div>
  );
}
