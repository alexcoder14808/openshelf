import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Don't throw — allow the app to boot so the UI can show a friendly
  // "not configured" state instead of a blank screen.
  console.warn(
    'Supabase env vars are missing. Copy .env.example to .env and fill in your project values.'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
