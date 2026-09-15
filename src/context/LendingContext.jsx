import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const LendingContext = createContext(null);

export function LendingProvider({ children }) {
  const { user } = useAuth();
  const [checkouts, setCheckouts] = useState([]); // active + past, this user
  const [holds, setHolds] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCheckouts([]);
      setHolds([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Best-effort sweep of any holds whose claim window has lapsed. Safe to
    // call frequently — it's a no-op when nothing is stale. In production
    // this should also run on a schedule (pg_cron / Edge Function cron) so
    // it doesn't depend on someone having the app open.
    await supabase.rpc('expire_stale_holds');

    const [{ data: checkoutRows, error: coErr }, { data: holdRows, error: holdErr }] = await Promise.all([
      supabase
        .from('checkouts')
        .select('*, book:books(*)')
        .eq('user_id', user.id)
        .order('checked_out_at', { ascending: false }),
      supabase
        .from('holds')
        .select('*, book:books(*)')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false }),
    ]);

    if (coErr) console.error('Failed to load checkouts:', coErr);
    if (holdErr) console.error('Failed to load holds:', holdErr);

    setCheckouts(checkoutRows || []);
    setHolds(holdRows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const borrowBook = useCallback(
    async (bookId) => {
      const { data, error } = await supabase.rpc('borrow_book', { p_book_id: bookId });
      if (error) throw error;
      await refresh();
      return data;
    },
    [refresh]
  );

  const returnBook = useCallback(
    async (checkoutId) => {
      const { data, error } = await supabase.rpc('return_book', { p_checkout_id: checkoutId });
      if (error) throw error;
      await refresh();
      return data;
    },
    [refresh]
  );

  const placeHold = useCallback(
    async (bookId) => {
      const { data, error } = await supabase.rpc('place_hold', { p_book_id: bookId });
      if (error) throw error;
      await refresh();
      return data;
    },
    [refresh]
  );

  const cancelHold = useCallback(
    async (holdId) => {
      const { data, error } = await supabase.rpc('cancel_hold', { p_hold_id: holdId });
      if (error) throw error;
      await refresh();
      return data;
    },
    [refresh]
  );

  const claimReadyHold = useCallback(
    async (holdId) => {
      const { data, error } = await supabase.rpc('claim_ready_hold', { p_hold_id: holdId });
      if (error) throw error;
      await refresh();
      return data;
    },
    [refresh]
  );

  const activeCheckouts = checkouts.filter((c) => !c.returned_at);
  const activeHolds = holds.filter((h) => h.status === 'waiting' || h.status === 'ready');

  const getCheckoutForBook = useCallback(
    (bookId) => activeCheckouts.find((c) => c.book_id === bookId) || null,
    [activeCheckouts]
  );
  const getHoldForBook = useCallback(
    (bookId) => activeHolds.find((h) => h.book_id === bookId) || null,
    [activeHolds]
  );

  const value = {
    checkouts,
    holds,
    activeCheckouts,
    activeHolds,
    loading,
    refresh,
    borrowBook,
    returnBook,
    placeHold,
    cancelHold,
    claimReadyHold,
    getCheckoutForBook,
    getHoldForBook,
  };

  return <LendingContext.Provider value={value}>{children}</LendingContext.Provider>;
}

export function useLending() {
  const ctx = useContext(LendingContext);
  if (!ctx) throw new Error('useLending must be used within LendingProvider');
  return ctx;
}
