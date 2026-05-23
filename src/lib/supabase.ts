import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side only — use exclusively in API routes and server components.
// Never import this in client components.
//
// Lazy initialisation: the Next build runs API route module-loads at
// "collect page data" time. If we constructed the client at import time
// and the env vars were absent (or temporarily blanked locally) the whole
// build would fail with a cryptic "supabaseUrl is required". We defer to
// first use so missing env vars only surface as a runtime error inside the
// request that needed Supabase, and the build itself stays unblocked.

let client: SupabaseClient | null = null;

function build(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return createClient(url, key);
}

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!client) client = build();
    return Reflect.get(client, prop, client);
  },
});
