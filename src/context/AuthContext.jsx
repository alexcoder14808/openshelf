import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      return;
    }
    setProfile(data);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadProfile(data.session?.user?.id);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  // Sign up to the OpenShelf Network itself (the platform-wide account).
  const signUp = useCallback(async ({ email, password, displayName, termsAccepted }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, terms_accepted: !!termsAccepted },
        // Without this, Supabase falls back to whatever "Site URL" is set
        // in the project's Auth settings — which defaults to
        // http://localhost:3000 and won't match the deployed app, landing
        // people on a bare Supabase confirmation page instead of back in
        // OpenShelf. This makes the confirmation link return to wherever
        // the app is actually running. NOTE: the exact URL below must also
        // be added to Supabase's Auth -> URL Configuration -> Redirect URLs
        // allowlist, or Supabase will reject it and fall back anyway.
        emailRedirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    if (error) throw error;

    // Supabase quirk: signing up with an email that already has an account
    // does NOT return an error — it returns a fake "success" with an empty
    // identities array, specifically to prevent attackers from using signup
    // to discover which emails are registered. That's good security
    // behavior at the API level, but a real signup form still needs to
    // tell a genuine user "you already have an account" instead of quietly
    // pretending it worked and leaving them waiting on an email that will
    // never usefully arrive.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Try logging in instead.');
    }

    return data;
  }, []);

  const resendConfirmationEmail = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  // Log in using a library card number + PIN instead of email/password.
  // Calls the "card-login" Edge Function (verifies the card+PIN server-side
  // with the service role key, then mints a real magic-link token) and
  // exchanges the returned token_hash for an actual Supabase Auth session
  // via verifyOtp — this is a genuine signed-in session afterward, not a
  // client-side simulation.
  const signInWithCard = useCallback(async ({ libraryId, cardNumber, pin }) => {
    const functionsUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/card-login`;
    const res = await fetch(functionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ libraryId, cardNumber, pin }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || 'Invalid card number or PIN.');
    }
    const { error } = await supabase.auth.verifyOtp({ token_hash: json.token_hash, type: 'magiclink' });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signInWithCard,
    signOut,
    resendConfirmationEmail,
    refreshProfile: () => loadProfile(session?.user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
