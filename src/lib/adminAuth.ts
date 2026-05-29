import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Constant-time comparison of two secrets. Both sides are hashed to a
 * fixed-length SHA-256 digest first, so the comparison time never depends on
 * the input's length or contents — closing the timing side-channel that a
 * naive `provided === expected` (or `!==`) check leaves open.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Returns true if the request carries `Authorization: Bearer <expected>`,
 * compared in constant time. Used where more than one secret is accepted
 * (e.g. the weekly-report route accepts a Vercel cron secret OR the admin
 * secret).
 */
export function bearerMatches(req: NextRequest, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!provided) return false;
  return secretsMatch(provided, expected);
}

/**
 * Validates the `Authorization: Bearer <INTAKE_ADMIN_SECRET>` header for an
 * admin-only route, in constant time. Returns a NextResponse to send back when
 * the request is NOT authorised (401, or 500 if the secret isn't configured),
 * or null when the request is authorised and the handler should proceed.
 *
 * Centralised here so every admin route shares one hardened implementation
 * instead of 20 copy-pasted `authHeader !== \`Bearer ${secret}\`` checks.
 */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const expected = process.env.INTAKE_ADMIN_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'Server auth not configured' }, { status: 500 });
  }
  if (!bearerMatches(req, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
