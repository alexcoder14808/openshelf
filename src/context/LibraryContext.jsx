import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

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

  // Join a library — creates (or reactivates) a library_members row.
  // Depending on the library's card_signup_mode this may land as
  // 'pending' (approval_required) or 'active' (open).
  const joinLibrary = useCallback(
    async (libraryId) => {
      if (!user) throw new Error('Must be signed in to the OpenShelf Network first.');

      const { data: library, error: libErr } = await supabase
        .from('libraries')
        .select('card_signup_mode')
        .eq('id', libraryId)
        .single();
      if (libErr) throw libErr;

      const status = library.card_signup_mode === 'approval_required' ? 'pending' : 'active';

      const { data, error } = await supabase
        .from('library_members')
        .upsert(
          { library_id: libraryId, user_id: user.id, status },
          { onConflict: 'library_id,user_id' }
        )
        .select()
        .single();
      if (error) throw error;

      await loadMemberships();
      return data;
    },
    [user, loadMemberships]
  );

  // Create a brand new library — this is the "sign up as an admin and
  // start your own library on OpenShelf" flow. The creator automatically
  // becomes the owning admin AND a member (so they can browse their own
  // catalog like any other patron).
  const createLibrary = useCallback(
    async ({ name, slug, description, logoUrl, cardSignupMode }) => {
      if (!user) throw new Error('Must be signed in to the OpenShelf Network first.');

      const { data: library, error } = await supabase
        .from('libraries')
        .insert({
          name,
          slug,
          description,
          logo_url: logoUrl || null,
          owner_id: user.id,
          card_signup_mode: cardSignupMode || 'open',
        })
        .select()
        .single();
      if (error) throw error;

      const { error: adminErr } = await supabase
        .from('library_admins')
        .insert({ library_id: library.id, user_id: user.id, role: 'owner' });
      if (adminErr) throw adminErr;

      await supabase
        .from('library_members')
        .insert({ library_id: library.id, user_id: user.id, status: 'active' });

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

  const value = {
    memberships,
    adminLibraries,
    activeLibraryId,
    activeLibrary: activeMembership?.library || null,
    activeMembership,
    loading,
    setActiveLibrary,
    joinLibrary,
    createLibrary,
    isAdminOf,
    refresh: loadMemberships,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
