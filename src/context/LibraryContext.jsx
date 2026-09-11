import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { uploadLibraryLogo } from '../lib/storageUpload';

const LibraryContext = createContext(null);

const ACTIVE_LIBRARY_KEY = 'openshelf-active-library-id';

export function LibraryProvider({ children }) {
  const { user } = useAuth();

  const [memberships, setMemberships] = useState([]); // libraries this user holds a card at
  const [adminLibraries, setAdminLibraries] = useState([]); // libraries this user administers
  const [activeLibraryId, setActiveLibraryId] = useState(
    () => localStorage.getItem(ACTIVE_LIBRARY_KEY) || null
  );
  const [loading, setLoading] = useState(true);

  const loadMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setAdminLibraries([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: memberRows, error: memberErr }, { data: adminRows, error: adminErr }] = await Promise.all([
      supabase
        .from('library_members')
        .select('id, status, card_number, joined_at, library:libraries(*)')
        .eq('user_id', user.id),
      supabase
        .from('library_admins')
        .select('id, role, library:libraries(*)')
        .eq('user_id', user.id),
    ]);

    if (memberErr) console.error('Failed to load library memberships:', memberErr);
    if (adminErr) console.error('Failed to load admin libraries:', adminErr);

    setMemberships(memberRows || []);
    setAdminLibraries(adminRows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadMemberships();
  }, [loadMemberships]);

  // Keep the active library valid — default to the first active membership.
  useEffect(() => {
    if (!memberships.length) return;
    const stillValid = memberships.some((m) => m.library.id === activeLibraryId && m.status === 'active');
    if (!stillValid) {
      const first = memberships.find((m) => m.status === 'active');
      if (first) setActiveLibrary(first.library.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberships]);

  const setActiveLibrary = useCallback((libraryId) => {
    setActiveLibraryId(libraryId);
    if (libraryId) localStorage.setItem(ACTIVE_LIBRARY_KEY, libraryId);
    else localStorage.removeItem(ACTIVE_LIBRARY_KEY);
  }, []);

  // Join a library — calls the request_library_card RPC, which generates a
  // safe numeric card number server-side and stores the member's chosen PIN
  // encrypted at rest. Lands as 'pending' or 'active' depending on the
  // library's card_signup_mode — enforced server-side, not trusted from here.
  const joinLibrary = useCallback(
    async (libraryId, pin) => {
      if (!user) throw new Error('Must be signed in to the OpenShelf Network first.');
      if (!/^\d{4,6}$/.test(pin || '')) throw new Error('Choose a 4 to 6 digit PIN (numbers only).');

      const { data, error } = await supabase.rpc('request_library_card', {
        p_library_id: libraryId,
        p_pin: pin,
      });
      if (error) throw error;

      await loadMemberships();
      return data;
    },
    [user, loadMemberships]
  );

  // Reveal the PIN on one of the current user's own cards (the "flip to
  // see PIN" action) — decrypted server-side, never stored in plaintext.
  const revealCardPin = useCallback(async (memberId) => {
    const { data, error } = await supabase.rpc('reveal_my_card_pin', { p_member_id: memberId });
    if (error) throw error;
    return data;
  }, []);

  // Create a brand new library — this is the "sign up as an admin and
  // start your own library on OpenShelf" flow. The creator automatically
  // becomes the owning admin AND a member. Order matters here: the logo
  // upload's storage policy checks library_admins, so that row has to exist
  // BEFORE the upload, which is why this doesn't just insert everything in
  // one shot.
  const createLibrary = useCallback(
    async ({ name, slug, description, logoFile, isPublic, cardSignupMode }) => {
      if (!user) throw new Error('Must be signed in to the OpenShelf Network first.');

      const { data: library, error } = await supabase
        .from('libraries')
        .insert({
          name,
          slug,
          description,
          owner_id: user.id,
          is_public: isPublic ?? true,
          card_signup_mode: cardSignupMode || 'open',
        })
        .select()
        .single();
      if (error) throw error;

      const { error: adminErr } = await supabase
        .from('library_admins')
        .insert({ library_id: library.id, user_id: user.id, role: 'owner' });
      if (adminErr) throw adminErr;

      if (logoFile) {
        const logoUrl = await uploadLibraryLogo(library.id, logoFile);
        const { error: logoErr } = await supabase.from('libraries').update({ logo_url: logoUrl }).eq('id', library.id);
        if (logoErr) throw logoErr;
        library.logo_url = logoUrl;
      }

      // Admins join their own library as an active member automatically —
      // the RPC special-cases the library's own owner to always land
      // 'active', regardless of the card_signup_mode set for everyone else.
      const ownerPin = String(Math.floor(1000 + Math.random() * 9000));
      const { error: memberErr } = await supabase.rpc('request_library_card', {
        p_library_id: library.id,
        p_pin: ownerPin,
      });
      if (memberErr) console.error('Failed to auto-create owner membership:', memberErr);

      await loadMemberships();
      return library;
    },
    [user, loadMemberships]
  );

  const activeMembership = useMemo(
    () => memberships.find((m) => m.library.id === activeLibraryId) || null,
    [memberships, activeLibraryId]
  );

  const isAdminOf = useCallback(
    (libraryId) => adminLibraries.some((a) => a.library.id === libraryId),
    [adminLibraries]
  );

  // ---------- "Manage People" — approve/reject pending card requests ----------
  const approveMember = useCallback(async (memberId) => {
    const { data, error } = await supabase.rpc('approve_member', { p_member_id: memberId });
    if (error) throw error;
    return data;
  }, []);

  const rejectMember = useCallback(async (memberId) => {
    const { error } = await supabase.rpc('reject_member', { p_member_id: memberId });
    if (error) throw error;
  }, []);

  const value = {
    memberships,
    adminLibraries,
    activeLibraryId,
    activeLibrary: activeMembership?.library || null,
    activeMembership,
    loading,
    setActiveLibrary,
    joinLibrary,
    revealCardPin,
    createLibrary,
    isAdminOf,
    approveMember,
    rejectMember,
    refresh: loadMemberships,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
