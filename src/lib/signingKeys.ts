import { createHmac } from 'node:crypto';

// Keys for signing admin session cookies and reminder opt-out links.
//
// These used to be the admin PASSWORD (INTAKE_ADMIN_SECRET) used directly as
// the HMAC key. That meant anyone who knew the password could mint a valid
// session cookie offline and skip two-factor entirely, and every opt-out link
// in a reminder email was a sample that could be brute-forced offline to
// recover the password.
//
// Now each key is derived from a SERVER-ONLY secret the password holder never
// sees (SESSION_SIGNING_KEY if set, otherwise the Supabase service-role key,
// which is always present in production). The session key also mixes in the
// password, so changing the password still logs everyone out.

function serverSecret(): string | null {
  return process.env.SESSION_SIGNING_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

/** HMAC key for admin session cookies, or null if not configured. */
export function sessionSigningKey(): string | null {
  const password = process.env.INTAKE_ADMIN_SECRET;
  const secret = serverSecret();
  if (!password || !secret) return null;
  return createHmac('sha256', secret).update(`admin-session-v2:${password}`).digest('base64url');
}

/** HMAC key for reminder opt-out links, or null if not configured. */
export function optOutSigningKey(): string | null {
  const secret = serverSecret();
  if (!secret) return null;
  return createHmac('sha256', secret).update('reminder-optout-v2').digest('base64url');
}
