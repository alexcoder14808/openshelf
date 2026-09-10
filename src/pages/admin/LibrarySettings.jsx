import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useLibrary } from '../../context/LibraryContext';
import '../pages.css';

export default function LibrarySettings() {
  const { libraryId } = useParams();
  const { adminLibraries, refresh } = useLibrary();
  const navigate = useNavigate();

  const entry = adminLibraries.find((a) => a.library.id === libraryId);
  const [name, setName] = useState(entry?.library.name || '');
  const [description, setDescription] = useState(entry?.library.description || '');
  const [logoUrl, setLogoUrl] = useState(entry?.library.logo_url || '');
  const [isPublic, setIsPublic] = useState(entry?.library.is_public ?? true);
  const [cardSignupMode, setCardSignupMode] = useState(entry?.library.card_signup_mode || 'open');
  const [lendingLimit, setLendingLimit] = useState(entry?.library.lending_limit_per_member ?? 5);
  const [holdLimit, setHoldLimit] = useState(entry?.library.hold_limit_per_member ?? 5);
  const [loanPeriodDays, setLoanPeriodDays] = useState(entry?.library.loan_period_days ?? 21);
  const [holdExpiryDays, setHoldExpiryDays] = useState(entry?.library.hold_expiry_days ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!entry) {
    return <div className="page"><div className="empty-state"><p>You don't administer this library.</p></div></div>;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { error: updErr } = await supabase
      .from('libraries')
      .update({
        name,
        description,
        logo_url: logoUrl || null,
        is_public: isPublic,
        card_signup_mode: cardSignupMode,
        lending_limit_per_member: lendingLimit,
        hold_limit_per_member: holdLimit,
        loan_period_days: loanPeriodDays,
        hold_expiry_days: holdExpiryDays,
      })
      .eq('id', libraryId);
    setSaving(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }
    await refresh();
    navigate(`/admin/${libraryId}`);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Library settings</h1>
        <p>This only affects your own library — not the OpenShelf system.</p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="form-field">
          <label>Library name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Logo URL</label>
          <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Card signup mode</label>
          <select value={cardSignupMode} onChange={(e) => setCardSignupMode(e.target.value)}>
            <option value="open">Open</option>
            <option value="approval_required">Approval required</option>
            <option value="invite_only">Invite only</option>
          </select>
        </div>
        <div className="form-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="isPublic" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} style={{ width: 'auto' }} />
          <label htmlFor="isPublic" style={{ margin: 0 }}>Listed in the public library directory</label>
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
