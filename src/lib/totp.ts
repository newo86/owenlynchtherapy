import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Minimal, dependency-free TOTP (RFC 6238: HMAC-SHA1, 30-second step, 6 digits)
// for admin two-factor auth. The shared secret is stored in Supabase (table
// admin_mfa) and passed in here — these functions are pure crypto and hold no
// state. See src/lib/adminMfa.ts for the storage/enable logic.

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Generate a fresh base32 secret for enrolling an authenticator app. */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = 0, value = 0, out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of s.replace(/=+$/, '').toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 0xff); bits -= 8; }
  }
  return Buffer.from(out);
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', secret).update(buf).digest();
  const off = h[h.length - 1] & 0x0f;
  const bin = ((h[off] & 0x7f) << 24) | ((h[off + 1] & 0xff) << 16)
    | ((h[off + 2] & 0xff) << 8) | (h[off + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, '0');
}

function codesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Verify a 6-digit code against the given base32 secret, allowing ±1 time step
 *  for clock drift. Returns false if the secret is empty or the code malformed. */
export function verifyTotp(token: string, secret: string): boolean {
  if (!secret || !/^\d{6}$/.test(token)) return false;
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 30_000);
  for (let w = -1; w <= 1; w++) {
    if (codesEqual(hotp(key, counter + w), token)) return true;
  }
  return false;
}

/** Build the otpauth:// URL to enrol the secret in an authenticator app. */
export function otpauthUrl(secret: string, label = 'Owen Lynch Admin', issuer = 'Owen Lynch Therapy'): string {
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}`
    + `&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
