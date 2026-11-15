import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { setEnabled, verifyStored } from '@/lib/adminMfa';
import { rateLimit } from '@/lib/rateLimit';
import { rateLimitDurable } from '@/lib/rateLimitDurable';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

/** Turn two-factor off. Requires a current valid code so a hijacked session
 *  alone can't disable MFA. */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  // Six-digit codes can be guessed by brute force, so cap attempts. Keyed to
  // the single admin account, not the IP: someone holding a stolen session can
  // rotate IPs, but not accounts (docs/SECURITY.md #5).
  const allowed = rateLimit('admin-mfa', 'admin', 5, 15 * 60 * 1000)
    && await rateLimitDurable('admin-mfa', 'admin', 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, { status: 429, headers: noCache });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const code = (body.code ?? '').trim();
  if (!(await verifyStored(code))) {
    return NextResponse.json({ error: 'Enter a current code to turn off two-factor.' }, { status: 400, headers: noCache });
  }

  if (!(await setEnabled(false))) {
    return NextResponse.json({ error: 'Could not disable two-factor.' }, { status: 500, headers: noCache });
  }
  return NextResponse.json({ ok: true, enabled: false }, { headers: noCache });
}
