import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useLibrary } from '../../context/LibraryContext';
import { uploadLibraryLogo } from '../../lib/storageUpload';
import FilePicker from '../FilePicker';

export default function SettingsPanel({ libraryId, library, onSaved }) {
  const { refresh } = useLibrary();
  const navigate = useNavigate();

  const [name, setName] = useState(library.name || '');
  const [description, setDescription] = useState(library.description || '');
  const [newLogoFile, setNewLogoFile] = useState(null);
  const [isPublic, setIsPublic] = useState(library.is_public ?? true);
  const [cardSignupMode, setCardSignupMode] = useState(library.card_signup_mode || 'open');
  const [lendingLimit, setLendingLimit] = useState(library.lending_limit_per_member ?? 5);
  const [holdLimit, setHoldLimit] = useState(library.hold_limit_per_member ?? 5);
  const [loanPeriodDays, setLoanPeriodDays] = useState(library.loan_period_days ?? 21);
  const [holdExpiryDays, setHoldExpiryDays] = useState(library.hold_expiry_days ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleDelete = async () => {
    if (deleteConfirmText.trim() !== library.name) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from('libraries').delete().eq('id', libraryId);
    setDeleting(false);
    if (delErr) {
      alert(delErr.message || 'Could not delete this library.');
      return;
    }
    await refresh();
    navigate('/admin');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      let logoUrl = library.logo_url;
      if (newLogoFile) {
        logoUrl = await uploadLibraryLogo(libraryId, newLogoFile);
      }

      const { error: updErr } = await supabase
        .from('libraries')
        .update({
          name,
          description,
          logo_url: logoUrl,
          is_public: isPublic,
          card_signup_mode: cardSignupMode,
          lending_limit_per_member: lendingLimit,
          hold_limit_per_member: holdLimit,
          loan_period_days: loanPeriodDays,
          hold_expiry_days: holdExpiryDays,
        })
        .eq('id', libraryId);
      if (updErr) throw updErr;

      await refresh();
      setSaved(true);
      onSaved?.();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      {saved && <p style={{ color: '#1f9254', fontSize: '0.85rem', marginBottom: 14 }}>Saved.</p>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="form-field">
          <label>Library name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Library logo</label>
          {library.logo_url && !newLogoFile && (
            <img src={library.logo_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', marginBottom: 8 }} />
          )}
          <FilePicker accept="image/*" file={newLogoFile} onChange={setNewLogoFile} placeholder="Replace logo image…" />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Card signup mode</label>
          <select value={cardSignupMode} onChange={(e) => setCardSignupMode(e.target.value)}>
            <option value="open">Open</option>
            <option value="approval_required">Approval required — you approve each request</option>
            <option value="invite_only">Invite only</option>
          </select>
        </div>
        <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ width: 'auto' }} />
          <label htmlFor="isPublic" style={{ margin: 0 }}>Listed in the public "Find a Library" directory</label>
        </div>

        <h3 style={{ fontSize: '0.95rem', margin: '24px 0 4px', color: '#16181d' }}>Lending policy</h3>
        <p style={{ fontSize: '0.8rem', color: '#9aa0ab', margin: '0 0 14px' }}>
          Controls how many titles a member can borrow or wait on at once, how long a loan lasts,
          and how long a ready hold stays reserved before it's offered to the next person in line.
        </p>
        <div className="form-field">
          <label>Simultaneous checkout limit</label>
          <input type="number" min="1" value={lendingLimit} onChange={(e) => setLendingLimit(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Simultaneous hold limit</label>
          <input type="number" min="0" value={holdLimit} onChange={(e) => setHoldLimit(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Loan period (days)</label>
          <input type="number" min="1" value={loanPeriodDays} onChange={(e) => setLoanPeriodDays(Number(e.target.value))} />
        </div>
        <div className="form-field">
          <label>Hold claim window (days)</label>
          <input type="number" min="1" value={holdExpiryDays} onChange={(e) => setHoldExpiryDays(Number(e.target.value))} />
        </div>

        <button className="form-submit" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <div style={{ maxWidth: 480, marginTop: 40, paddingTop: 24, borderTop: '1px solid #eef0f3' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#d1414a', margin: '0 0 6px' }}>Danger zone</h3>
        <p style={{ fontSize: '0.8rem', color: '#9aa0ab', margin: '0 0 14px' }}>
          Deleting this library permanently removes its entire catalog, every member's card,
          checkouts, holds, and bookmarks tied to it. This cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#fdf1f1', color: '#d1414a', border: '1px solid #f6d5d5',
              borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            }}
          >
            <Trash2 size={16} /> Delete this library
          </button>
        ) : (
          <div style={{ background: '#fdf1f1', border: '1px solid #f6d5d5', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: '0.85rem', color: '#7a1f1f', margin: '0 0 10px', fontWeight: 600 }}>
              Are you sure you want to delete "{library.name}"? Type its name below to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={library.name}
              style={{ width: '100%', border: '1px solid #e2b8b8', borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText.trim() !== library.name}
                style={{
                  background: '#d1414a', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '9px 16px', fontWeight: 700, fontSize: '0.85rem',
                  cursor: deleteConfirmText.trim() === library.name ? 'pointer' : 'not-allowed',
                  opacity: deleteConfirmText.trim() === library.name ? 1 : 0.5,
                }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                style={{ background: '#fff', color: '#40444c', border: '1px solid #e2e4e8', borderRadius: 8, padding: '9px 16px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
