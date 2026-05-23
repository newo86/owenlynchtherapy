import { Resend } from 'resend';

// Lazy Resend client — same reasoning as src/lib/supabase.ts. Constructing
// at module load would throw "Missing API key" during the Next build's
// "collect page data" step whenever RESEND_API_KEY happens to be unset
// locally, even though no email is actually about to be sent.

let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY env var is missing.');
  cached = new Resend(key);
  return cached;
}
