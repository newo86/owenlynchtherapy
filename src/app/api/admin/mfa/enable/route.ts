import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { setEnabled, verifyStored } from '@/lib/adminMfa';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

/** Confirm setup: verify a code against the pending secret, then enable MFA. */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const code = (body.code ?? '').trim();
  if (!(await verifyStored(code))) {
    return NextResponse.json({ error: 'That code didn’t match. Check your authenticator and try again.' }, { status: 400, headers: noCache });
  }

  if (!(await setEnabled(true))) {
    return NextResponse.json({ error: 'Could not enable two-factor.' }, { status: 500, headers: noCache });
  }
  return NextResponse.json({ ok: true, enabled: true }, { headers: noCache });
}
