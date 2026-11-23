import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL, buildWaitlistMessageHtml } from '@/lib/emailTemplates';
import { waitlistResponseUrl } from '@/lib/waitlistResponse';
import { hasButtons, MAX_MESSAGE, MAX_SUBJECT } from '@/lib/waitlistMessage';
import { PRACTICE } from '@/practice.config';
import { createHash } from 'node:crypto';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// "Email the waiting list" (dashboard → Waitlist). One private email per
// person, never a group email. Only people currently 'waiting' are sent to;
// anyone emailed in the last 12 hours is skipped, so pressing Send again
// (or continuing a long run) can't email anyone twice. Replies typed into
// the email go to the practice inbox (replyTo); button answers are recorded
// on the person's row (see /api/waitlist/respond).
export const maxDuration = 60;
const MAX_RECIPIENTS = 100;
const PACE_MS = 600;           // the email provider allows ~2 requests a second
const TIME_BUDGET_MS = 40_000; // stop well inside the function limit; press again to continue
const DUPLICATE_WINDOW_MS = 12 * 60 * 60 * 1000;

/** The signup form doesn't verify names, so only a plain name goes into the
 *  greeting: something like "evil.example" would turn into a link in the
 *  recipient's email app. Anything else falls back to "Hi there". */
function safeFirstName(fullName: string | null): string {
  const first = (fullName ?? '').trim().split(/\s+/)[0] ?? '';
  return /^[\p{L}\p{M}'’-]{1,40}$/u.test(first) ? first : '';
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('waitlist-email', ip, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many sends. Please try again later.' }, { status: 429 });
  }

  let body: { subject?: unknown; message?: unknown; test?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const subject = typeof body.subject === 'string' ? body.subject.replace(/[\r\n]+/g, ' ').trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!subject || subject.length > MAX_SUBJECT) {
    return NextResponse.json({ error: `Add a subject (up to ${MAX_SUBJECT} characters).` }, { status: 400 });
  }
  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: `Add a message (up to ${MAX_MESSAGE} characters).` }, { status: 400 });
  }
  const withButtons = hasButtons(message);

  // Test: one copy to the practice inbox. Buttons are inert (no real person
  // behind them), so a test can never record an answer.
  if (body.test === true) {
    try {
      const r = await getResend().emails.send({
        from: EMAIL_FROM,
        to: CONTACT_EMAIL,
        replyTo: CONTACT_EMAIL,
        subject: `[Test] ${subject}`,
        html: buildWaitlistMessageHtml({ firstName: PRACTICE.practitionerFirstName, message, yesUrl: null, noUrl: null }),
      });
      if (r.error) return NextResponse.json({ error: 'The test email could not be sent.' }, { status: 502 });
      if (!r.data?.id) return NextResponse.json({ error: 'Emails are switched off on the site (EMAILS_ENABLED), so nothing was sent.' }, { status: 409 });
      return NextResponse.json({ ok: true, test: true, to: CONTACT_EMAIL }, { headers: noCache });
    } catch {
      return NextResponse.json({ error: 'The test email could not be sent.' }, { status: 502 });
    }
  }

  const { data: people, error } = await supabaseAdmin
    .from('waitlist')
    .select('id, full_name, email, last_emailed_at')
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
    .limit(MAX_RECIPIENTS);
  if (error || !people) {
    console.error('[admin/waitlist/email] load error:', dbError(error));
    return NextResponse.json({ error: 'Could not load the waiting list, so nothing was sent.' }, { status: 500 });
  }

  // Same message to the same person on the same day → the provider drops a
  // repeat, so two overlapping runs can't double-send.
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' });
  const msgHash = createHash('sha256').update(`${subject}\n${message}`).digest('hex').slice(0, 16);
  const cutoff = Date.now() - DUPLICATE_WINDOW_MS;
  const started = Date.now();
  let sent = 0, skippedRecent = 0, failed = 0, remaining = 0, unrecorded = 0;

  for (const [n, p] of people.entries()) {
    if (p.last_emailed_at && new Date(p.last_emailed_at as string).getTime() > cutoff) { skippedRecent++; continue; }
    if (Date.now() - started > TIME_BUDGET_MS) { remaining = people.length - n; break; }
    const email = ((p.email as string | null) ?? '').trim();
    if (!email) { failed++; continue; }

    // Millisecond precision, matching what Postgres stores (microseconds), so
    // the reply link's send time equals last_emailed_at exactly.
    const sentAt = new Date(Math.floor(Date.now()));
    const yesUrl = withButtons ? waitlistResponseUrl(p.id as string, sentAt, 'yes') : null;
    const noUrl = withButtons ? waitlistResponseUrl(p.id as string, sentAt, 'no') : null;
    if (withButtons && (!yesUrl || !noUrl)) {
      return NextResponse.json({ error: 'Reply links are not configured on the server, so nothing was sent.' }, { status: 500 });
    }

    if (sent + failed > 0) await new Promise(r => setTimeout(r, PACE_MS));
    try {
      const r = await getResend().emails.send(
        {
          from: EMAIL_FROM,
          to: email,
          replyTo: CONTACT_EMAIL,
          subject,
          html: buildWaitlistMessageHtml({
            firstName: safeFirstName(p.full_name as string | null),
            message, yesUrl, noUrl,
          }),
        },
        { idempotencyKey: `waitlist-msg/${p.id}/${day}/${msgHash}` },
      );
      if (r.error) {
        const name = String(r.error.name);
        if (name === 'invalid_idempotent_request' || name === 'concurrent_idempotent_requests') { skippedRecent++; continue; }
        console.error('[admin/waitlist/email] send error:', name);
        failed++;
        continue;
      }
      if (!r.data?.id) {
        return NextResponse.json({
          error: 'Emails are switched off on the site (EMAILS_ENABLED), so nothing was sent.',
          sent, skipped_recent: skippedRecent, failed,
        }, { status: 409 });
      }
      sent++;
      // A fresh message: clear any answer to an earlier one. The reply links
      // only work once this send time is recorded, so a failure here is
      // reported (as unrecorded) for the practitioner to follow up by hand.
      const { error: markErr } = await supabaseAdmin.from('waitlist')
        .update({ last_emailed_at: sentAt.toISOString(), response: null, responded_at: null })
        .eq('id', p.id);
      if (markErr) {
        console.error('[admin/waitlist/email] mark error:', dbError(markErr));
        unrecorded++;
      }
    } catch (e) {
      console.error('[admin/waitlist/email] send thrown:', e instanceof Error ? e.message : String(e));
      failed++;
    }
  }

  console.log(`[admin/waitlist/email] sent ${sent}, skipped ${skippedRecent}, failed ${failed}, remaining ${remaining}`);
  return NextResponse.json({ ok: true, sent, skipped_recent: skippedRecent, failed, remaining, unrecorded }, { headers: noCache });
}
