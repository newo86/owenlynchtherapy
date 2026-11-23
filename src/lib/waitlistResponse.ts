import { createHmac, timingSafeEqual } from 'node:crypto';
import { SITE_URL } from '@/practice.config';
import { waitlistResponseKey } from './signingKeys';

// Signed, stateless links for the yes/no buttons in waiting-list emails:
// "<waitlistId>.<sentAtMs>.<HMAC>" keyed by a server-only secret, so a link
// only ever answers for the person it was sent to. It's tied to that send:
// the reply route accepts it only while it matches the person's latest email
// (last_emailed_at) and for LINK_TTL_DAYS, so an old or forwarded email can't
// change someone's answer later. The answer itself is chosen on the page (a
// button press, POST), never by opening the link — email link scanners open
// every link, and must not answer on someone's behalf.

export const LINK_TTL_DAYS = 60;

function sign(id: string, sentAtMs: number, key: string): string {
  return createHmac('sha256', key).update(`waitlist-response:${id}:${sentAtMs}`).digest('base64url');
}

export function waitlistResponseUrl(id: string, sentAt: Date, answer: 'yes' | 'no'): string | null {
  const key = waitlistResponseKey();
  if (!key) return null;
  const ms = sentAt.getTime();
  return `${SITE_URL}/waitlist/respond?t=${encodeURIComponent(`${id}.${ms}.${sign(id, ms, key)}`)}&a=${answer}`;
}

/** The waitlist id and send time a token was issued for, or null if it's
 *  malformed, forged or past LINK_TTL_DAYS. */
export function verifyWaitlistToken(token: string): { id: string; sentAtMs: number } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, msStr, sig] = parts;
  const sentAtMs = Number(msStr);
  if (!id || !/^\d{10,16}$/.test(msStr) || !Number.isFinite(sentAtMs)) return null;
  const key = waitlistResponseKey();
  if (!key) return null;
  const provided = Buffer.from(sig);
  const expected = Buffer.from(sign(id, sentAtMs, key));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  if (Date.now() - sentAtMs > LINK_TTL_DAYS * 24 * 60 * 60 * 1000) return null;
  return { id, sentAtMs };
}
