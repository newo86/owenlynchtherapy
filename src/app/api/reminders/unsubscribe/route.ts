import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyOptOutToken } from '@/lib/reminderOptOut';

// Public endpoint — no admin login. Authorised purely by the signed token in
// the email link, which only ever resolves to the client it was issued for.
// Used by the /unsubscribe confirmation page.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const clientId = body.token ? verifyOptOutToken(body.token) : null;
  if (!clientId) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .update({ reminders_opted_out: true })
    .eq('id', clientId);

  if (error) {
    console.error('[reminders/unsubscribe] update error:', error.message);
    return NextResponse.json({ error: 'Sorry, something went wrong. Please email info@owenlynchtherapy.com.' }, { status: 500 });
  }

  console.log('[reminders/unsubscribe] client opted out of reminders');
  return NextResponse.json({ ok: true });
}
