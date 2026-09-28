import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { sessionSigningKey } from './signingKeys';
import { supabaseAdmin } from './supabase';

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
// "<expiryMs>.<HMAC-SHA256(expiryMs)>", keyed by sessionSigningKey() — a key
// derived from a server-only secret plus the password (see signingKeys.ts), so
// knowing the password alone can't forge a cookie and skip two-factor. Each
// request re-verifies the HMAC (constant time) and the expiry. No server-side
// session store is needed, and rotating the password invalidates all sessions.

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
  const key = sessionSigningKey();
  if (!key) return null;
  const exp = String(Date.now() + SESSION_TTL_MS);
  return `${exp}.${sign(exp, key)}`;
}

/** Signature + expiry check. Returns the token's issue time (ms), or null. */
function sessionTokenIssuedAt(token: string | undefined): number | null {
  const key = sessionSigningKey();
  if (!key || !token) return null;
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(exp, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const expMs = Number(exp);
  if (!Number.isFinite(expMs) || Date.now() > expMs) return null;
  // Every token lives exactly SESSION_TTL_MS, so its issue time is implied —
  // no change to the cookie format was needed for revocation.
  return expMs - SESSION_TTL_MS;
}

// ── Server-side revocation ──────────────────────────────────────────────────
// "Sign out" stamps admin_session_state.valid_after; any cookie issued before
// it is rejected everywhere (a copied cookie no longer survives logout).
// Cached briefly per server instance so the dashboard's polling doesn't hit
// the database on every request.

const REVOCATION_CACHE_MS = 15_000;
let revocationCache: { validAfterMs: number; fetchedAt: number } | null = null;

// Supabase REST reports a missing table as PGRST205; raw Postgres as 42P01.
function isMissingTable(code: string | undefined): boolean {
  return code === 'PGRST205' || code === '42P01';
}

async function sessionsValidAfterMs(): Promise<number> {
  if (revocationCache && Date.now() - revocationCache.fetchedAt < REVOCATION_CACHE_MS) {
    return revocationCache.validAfterMs;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('admin_session_state')
      .select('valid_after')
      .eq('id', 1)
      .maybeSingle();
    if (error) {
      // Migration not run yet → nothing has ever been revoked.
      if (isMissingTable(error.code)) {
        revocationCache = { validAfterMs: 0, fetchedAt: Date.now() };
        return 0;
      }
      throw new Error(error.message);
    }
    const ms = data?.valid_after ? new Date(data.valid_after as string).getTime() : 0;
    revocationCache = { validAfterMs: ms, fetchedAt: Date.now() };
    return ms;
  } catch (err) {
    // Transient database fault: reuse the last known value if we have one,
    // otherwise fail closed (a signed-out cookie must never slip through).
    console.error('[adminAuth] revocation check failed:', err instanceof Error ? err.message : String(err));
    return revocationCache?.validAfterMs ?? Number.POSITIVE_INFINITY;
  }
}

/** Invalidate every admin session issued up to now (all devices). Returns
 *  false if the revocation table isn't set up yet (the cookie is still
 *  cleared by the caller either way). */
export async function revokeAllAdminSessions(): Promise<boolean> {
  const now = Date.now();
  const { error } = await supabaseAdmin
    .from('admin_session_state')
    .upsert(
      { id: 1, valid_after: new Date(now).toISOString(), updated_at: new Date(now).toISOString() },
      { onConflict: 'id' },
    );
  if (error) {
    console.warn('[adminAuth] could not revoke sessions (run admin_session_state.sql):', error.message);
    return false;
  }
  revocationCache = { validAfterMs: now, fetchedAt: now };
  return true;
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
 * HMAC + expiry) and that it wasn't issued before the last sign-out. Returns a
 * NextResponse to send back when the request is NOT authorised (401, or 500 if
 * the secret isn't configured), or null when the handler should proceed.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!process.env.INTAKE_ADMIN_SECRET) {
    return NextResponse.json({ error: 'Server auth not configured' }, { status: 500 });
  }
  const issuedAt = sessionTokenIssuedAt(req.cookies.get(ADMIN_COOKIE)?.value);
  if (issuedAt === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (issuedAt <= (await sessionsValidAfterMs())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
