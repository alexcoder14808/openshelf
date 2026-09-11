import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useLibrary } from '../../context/LibraryContext';
import { uploadLibraryLogo } from '../../lib/storageUpload';
import FilePicker from '../FilePicker';

export default function SettingsPanel({ libraryId, library, onSaved }) {
  const { refresh } = useLibrary();

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
    </div>
  );
}
