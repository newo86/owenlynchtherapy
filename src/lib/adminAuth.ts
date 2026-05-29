import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/** Name of the admin session cookie. */
export const ADMIN_COOKIE = 'ol_admin_session';

/** How long an admin session lasts before re-login is required. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

/**
 * Constant-time comparison of two secrets. Both sides are hashed to a
 * fixed-length SHA-256 digest first, so the comparison time never depends on
 * the input's length or contents — closing the timing side-channel a naive
 * `===`/`!==` check leaves open.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Returns true if the request carries `Authorization: Bearer <expected>`,
 * compared in constant time. Used for machine callers (the Vercel cron jobs)
 * that authenticate with a static secret rather than a browser session.
 */
export function bearerMatches(req: NextRequest, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!provided) return false;
  return secretsMatch(provided, expected);
}

// ── Stateless signed session token ──────────────────────────────────────────
// The browser never holds the admin secret. On login we validate the secret
// once and hand back an httpOnly cookie carrying a token of the form
// "<expiryMs>.<HMAC-SHA256(expiryMs)>", keyed by INTAKE_ADMIN_SECRET. Each
// request re-verifies the HMAC (constant time) and the expiry. No server-side
// session store is needed, and rotating the secret invalidates all sessions.

function sign(data: string, key: string): string {
  return createHmac('sha256', key).update(data).digest('base64url');
}

/** Validates a plaintext admin secret (used only at login), in constant time. */
export function adminSecretValid(provided: string): boolean {
  const expected = process.env.INTAKE_ADMIN_SECRET;
  if (!expected || !provided) return false;
  return secretsMatch(provided, expected);
}

/** Mints a fresh signed session token, or null if the secret isn't configured. */
export function createSessionToken(): string | null {
  const key = process.env.INTAKE_ADMIN_SECRET;
  if (!key) return null;
  const exp = String(Date.now() + SESSION_TTL_MS);
  return `${exp}.${sign(exp, key)}`;
}

function sessionTokenValid(token: string | undefined): boolean {
  const key = process.env.INTAKE_ADMIN_SECRET;
  if (!key || !token) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(exp, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const expMs = Number(exp);
  return Number.isFinite(expMs) && Date.now() <= expMs;
}

/** Cookie attributes for the admin session — Secure (HTTPS-only) in production,
 *  httpOnly (unreadable by JS), and SameSite=Strict (no cross-site sending). */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/**
 * Guard for admin routes. Validates the admin session cookie (constant-time
 * HMAC + expiry). Returns a NextResponse to send back when the request is NOT
 * authorised (401, or 500 if the secret isn't configured), or null when the
 * request is authorised and the handler should proceed.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  if (!process.env.INTAKE_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Server auth not configured' }, { status: 500 });
  }
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!sessionTokenValid(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
