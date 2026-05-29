import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { setEnabled, verifyStored } from '@/lib/adminMfa';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

/** Turn two-factor off. Requires a current valid code so a hijacked session
 *  alone can't disable MFA. */
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
    return NextResponse.json({ error: 'Enter a current code to turn off two-factor.' }, { status: 400, headers: noCache });
  }

  if (!(await setEnabled(false))) {
    return NextResponse.json({ error: 'Could not disable two-factor.' }, { status: 500, headers: noCache });
  }
  return NextResponse.json({ ok: true, enabled: false }, { headers: noCache });
}
