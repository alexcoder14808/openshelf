// card-login: lets a member sign in using their library card number + PIN
// instead of email/password.
//
// This is safe to expose pre-auth (verify_jwt disabled in its Supabase
// settings) because it runs with the SERVICE_ROLE_KEY, which is injected
// automatically as an environment variable by the Supabase platform — it is
// never present in this source file and never sent to the browser. The only
// thing a caller can influence is which card number + PIN pair to try; the
// actual lookup, PIN check, and session issuance all happen server-side via
// the card_login_lookup() Postgres function (schema.sql), which is itself
// only grantable to service_role.
//
// Flow:
//   1. Client POSTs { libraryId, cardNumber, pin }.
//   2. This function calls card_login_lookup() with the service role key
//      (bypasses RLS) to verify the card + PIN and fetch the account email.
//   3. On success, it calls Supabase Auth's admin.generateLink() to mint a
//      magic-link token — WITHOUT sending an email — and returns just the
//      token_hash to the client.
//   4. The client immediately exchanges that token_hash for a real session
//      via supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }). This
//      produces a genuine Supabase Auth session, identical to a normal
//      login, not a client-side simulation.
//
// Deploy this via the Supabase Dashboard (Edge Functions -> Deploy a new
// function -> paste this file) — see the README for exact steps. No CLI
// required.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { libraryId, cardNumber, pin } = await req.json();

    if (!libraryId || !cardNumber || !pin) {
      return new Response(
        JSON.stringify({ error: 'Library, card number, and PIN are all required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: rows, error: lookupError } = await supabaseAdmin.rpc('card_login_lookup', {
      p_library_id: libraryId,
      p_card_number: String(cardNumber).trim(),
      p_pin: String(pin).trim(),
    });

    if (lookupError || !rows || rows.length === 0) {
      // Deliberately generic — never reveal whether the card exists, is
      // inactive, or the PIN was just wrong.
      return new Response(JSON.stringify({ error: 'Invalid card number or PIN.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email } = rows[0];

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('generateLink failed:', linkError);
      return new Response(JSON.stringify({ error: 'Could not sign you in. Try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ token_hash: linkData.properties.hashed_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('card-login error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
