import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';
import { rateLimitDurable } from '@/lib/rateLimitDurable';
import { verifyWaitlistToken } from '@/lib/waitlistResponse';
import { PRACTICE } from '@/practice.config';

// Public: someone on the waiting list answering "still interested?" from the
// buttons in their email. Authorised only by the signed link, which can only
// ever answer for the person it was sent to. A 'no' takes them off the
// active list (status 'declined'); the practitioner then removes their
// details from the dashboard.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('waitlist-respond', ip, 20, 15 * 60 * 1000)
      || !(await rateLimitDurable('waitlist-respond', ip, 20, 15 * 60 * 1000))) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: { t?: unknown; answer?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const answer = body.answer === 'yes' || body.answer === 'no' ? body.answer : null;
  const token = typeof body.t === 'string' ? verifyWaitlistToken(body.t) : null;
  if (!answer || !token) {
    return NextResponse.json({ error: 'This link is invalid or has expired.' }, { status: 400 });
  }

  const { data: row, error: readErr } = await supabaseAdmin
    .from('waitlist').select('id, status, last_emailed_at').eq('id', token.id).maybeSingle();
  if (readErr) {
    console.error('[waitlist/respond] read error:', dbError(readErr));
    return NextResponse.json({ error: `Sorry, something went wrong. Please email ${PRACTICE.email}.` }, { status: 500 });
  }
  // Already removed (e.g. they became a client, or asked to be deleted):
  // nothing to record, and no hint whether they were ever on the list.
  if (!row) return NextResponse.json({ ok: true });
  // Only the buttons in their most recent email count: an older email's link
  // (or one sent before a newer check-in) can't change today's answer.
  const latest = row.last_emailed_at ? new Date(row.last_emailed_at as string).getTime() : NaN;
  if (latest !== token.sentAtMs) {
    return NextResponse.json({ error: 'This link is from an older email. Please use the buttons in my latest email, or just reply to it.' }, { status: 400 });
  }

  const patch: Record<string, unknown> = { response: answer, responded_at: new Date().toISOString() };
  // Only move people between waiting and declined; leave 'contacted' (and
  // anything else) as the practitioner set it.
  if (row.status === 'waiting' || row.status === 'declined') {
    patch.status = answer === 'no' ? 'declined' : 'waiting';
  }
  const { error } = await supabaseAdmin.from('waitlist').update(patch).eq('id', token.id);
  if (error) {
    console.error('[waitlist/respond] update error:', dbError(error));
    return NextResponse.json({ error: `Sorry, something went wrong. Please email ${PRACTICE.email}.` }, { status: 500 });
  }
  console.log('[waitlist/respond] answer recorded');
  return NextResponse.json({ ok: true });
}
