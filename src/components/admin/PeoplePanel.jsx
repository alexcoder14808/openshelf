import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useLibrary } from '../../context/LibraryContext';

export default function PeoplePanel({ libraryId }) {
  const { approveMember, rejectMember } = useLibrary();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('library_members')
      .select('id, status, card_number, joined_at, profile:profiles(display_name)')
      .eq('library_id', libraryId)
      .order('joined_at', { ascending: false });
    if (err) console.error(err);
    setMembers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryId]);

  const handleApprove = async (memberId) => {
    setError('');
    setBusyId(memberId);
    try {
      await approveMember(memberId);
      await load();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not approve this member.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (memberId) => {
    if (!window.confirm('Remove this card request? This cannot be undone.')) return;
    setError('');
    setBusyId(memberId);
    try {
      await rejectMember(memberId);
      await load();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not remove this member.');
    } finally {
      setBusyId(null);
    }
  };

  const pending = members.filter((m) => m.status === 'pending');
  const active = members.filter((m) => m.status === 'active');

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      {error && <p className="form-error">{error}</p>}

      <div className="dashboard-section" style={{ marginBottom: 20 }}>
        <h2>Pending requests ({pending.length})</h2>
        {pending.length === 0 ? (
          <p style={{ color: '#9aa0ab', fontSize: '0.9rem' }}>No card requests waiting on you.</p>
        ) : (
          <ul className="card-list">
            {pending.map((m) => (
              <li className="card-list-item" key={m.id}>
                <span>
                  <strong>{m.profile?.display_name || 'Member'}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#9aa0ab', fontFamily: 'monospace' }}>
                    Card #{m.card_number}
                  </span>
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="toolbar-btn"
                    disabled={busyId === m.id}
                    onClick={() => handleApprove(m.id)}
                    style={{ color: '#1f9254' }}
                  >
                    <Check size={14} /> <span>Approve</span>
                  </button>
                  <button className="panel-list-delete" disabled={busyId === m.id} onClick={() => handleReject(m.id)}>
                    <X size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="dashboard-section">
        <h2>Active members ({active.length})</h2>
        {active.length === 0 ? (
          <p style={{ color: '#9aa0ab', fontSize: '0.9rem' }}>No active members yet.</p>
        ) : (
          <ul className="card-list">
            {active.map((m) => (
              <li className="card-list-item" key={m.id}>
                <span>
                  <strong>{m.profile?.display_name || 'Member'}</strong>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: '#9aa0ab', fontFamily: 'monospace' }}>
                    Card #{m.card_number}
                  </span>
                </span>
                <button className="panel-list-delete" disabled={busyId === m.id} onClick={() => handleReject(m.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
