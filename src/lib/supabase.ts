import { createClient } from '@supabase/supabase-js';

// Server-side only — use exclusively in API routes and server components.
// Never import this in client components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
