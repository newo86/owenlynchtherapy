import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  adminSecretValid,
  createSessionToken,
  requireAdmin,
  sessionCookieOptions,
  SESSION_TTL_SECONDS,
} from '@/lib/adminAuth';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

/**
 * Admin session endpoint.
 *  POST   — log in: validate the typed secret and set the httpOnly session cookie.
 *  GET    — report whether the current request carries a valid session (used by
 *           the login gate to decide whether to show the sign-in screen).
 *  DELETE — log out: clear the cookie.
 *
 * The admin secret is validated here once; thereafter the browser holds only an
 * httpOnly, Secure, SameSite=Strict cookie that JavaScript cannot read.
 */
export async function POST(req: NextRequest) {
  let body: { secret?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!adminSecretValid(body.secret ?? '')) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401, headers: noCache });
  }

  const token = createSessionToken();
  if (!token) {
    return NextResponse.json({ error: 'Server auth not configured' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true }, { headers: noCache });
  res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(SESSION_TTL_SECONDS));
  return res;
}

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  return NextResponse.json({ authed: denied === null }, { headers: noCache });
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true }, { headers: noCache });
  res.cookies.set(ADMIN_COOKIE, '', sessionCookieOptions(0));
  return res;
}
