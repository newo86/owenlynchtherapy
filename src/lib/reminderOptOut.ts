import { createHmac, timingSafeEqual } from 'node:crypto';
import { SITE_URL } from '@/practice.config';

// Signed, stateless opt-out links for reminder emails. The link carries
// "<clientId>.<HMAC-SHA256(clientId)>" keyed by INTAKE_ADMIN_SECRET (the same
// secret the admin session uses). No token is stored in the database, and the
// signature can't be forged without the secret, so a client can only ever
// unsubscribe themselves — they can't guess another client's link.

const BASE_URL = SITE_URL;

function sign(clientId: string, key: string): string {
  return createHmac('sha256', key).update(`reminder-optout:${clientId}`).digest('base64url');
}

/** Public opt-out URL for a client's reminder emails, or null if the signing
 *  secret isn't configured (in which case the email simply omits the link). */
export function reminderOptOutUrl(clientId: string): string | null {
  const key = process.env.INTAKE_ADMIN_SECRET;
  if (!key) return null;
  const token = `${clientId}.${sign(clientId, key)}`;
  return `${BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Verify an opt-out token and return the clientId it authorises, or null if
 *  the token is missing, malformed or the signature doesn't match. */
export function verifyOptOutToken(token: string): string | null {
  const key = process.env.INTAKE_ADMIN_SECRET;
  if (!key) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const clientId = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(clientId, key));
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;
  return clientId;
}
