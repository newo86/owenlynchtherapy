import { createHmac, timingSafeEqual } from 'node:crypto';
import { SITE_URL } from '@/practice.config';
import { optOutSigningKey } from './signingKeys';

// Signed, stateless opt-out links for reminder emails. The link carries
// "<clientId>.<HMAC-SHA256(clientId)>" keyed by optOutSigningKey() — derived
// from a server-only secret, NOT the admin password (see signingKeys.ts), so a
// link in someone's inbox can't be used to guess the password offline. No
// token is stored in the database, and the signature can't be forged, so a
// client can only ever unsubscribe themselves.

const BASE_URL = SITE_URL;

function sign(clientId: string, key: string): string {
  return createHmac('sha256', key).update(`reminder-optout:${clientId}`).digest('base64url');
}

function matches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Public opt-out URL for a client's reminder emails, or null if the signing
 *  secret isn't configured (in which case the email simply omits the link). */
export function reminderOptOutUrl(clientId: string): string | null {
  const key = optOutSigningKey();
  if (!key) return null;
  const token = `${clientId}.${sign(clientId, key)}`;
  return `${BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Verify an opt-out token and return the clientId it authorises, or null if
 *  the token is missing, malformed or the signature doesn't match. */
export function verifyOptOutToken(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const clientId = token.slice(0, dot);
  const provided = token.slice(dot + 1);

  const key = optOutSigningKey();
  if (key && matches(provided, sign(clientId, key))) return clientId;

  // Links already sitting in clients' inboxes were signed with the old
  // password-derived key. Keep honouring them so "unsubscribe" never silently
  // breaks; new emails only carry the new signature.
  const legacyKey = process.env.INTAKE_ADMIN_SECRET;
  if (legacyKey && matches(provided, sign(clientId, legacyKey))) return clientId;

  return null;
}
