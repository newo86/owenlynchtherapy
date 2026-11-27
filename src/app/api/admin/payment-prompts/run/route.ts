import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL, buildPaymentPromptDigestHtml } from '@/lib/emailTemplates';
import { SITE_URL } from '@/practice.config';
import {
  sessionsNeedingPrompt, promptLabel, withinSendingHours, PROMPT_WINDOW_DAYS,
  type PromptSession, type PromptRow,
} from '@/lib/paymentPrompts';

// "Did they pay?" run. Called hourly by Vercel Cron (see vercel.json); also
// callable by hand with the admin session cookie.
//
// Clients mostly pay by Revolut transfer to a personal account no software can
// see, so after each session we ASK THE PRACTITIONER. Safety rules, copied
// from the reminder run:
//   - the email goes ONLY to the practice address, never to a client
//   - quiet hours: nothing is sent between 22:00 and 08:00 Dublin time
//   - KILL SWITCH: if EMAILS_ENABLED is not 'true', nothing is claimed
//   - CLAIM BEFORE SEND: each prompt row is claimed (count bumped) before the
//     email goes; fail-closed if the claim can't be recorded
//   - HARD CAP: at most 10 sessions per email, 5 prompts per session ever,
//     and an unanswered prompt is repeated at most once every 18 hours
//   - the links in the email carry no secret: the action happens only after
//     the practitioner is logged in and confirms in the dashboard

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_PER_RUN = 10;

function whenLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' });
  const time = d.toLocaleTimeString('en-IE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin' })
    .replace(/\s/g, '').toLowerCase();
  return `${day.replace(',', '')}, ${time}`;
}

export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || (await requireAdmin(req)) === null;
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();

  if (!withinSendingHours(now)) {
    return NextResponse.json({ ok: true, skipped: 'quiet-hours', sent: 0 });
  }

  // Kill switch: check before anything is claimed, so a switched-off window
  // never burns a session's prompts (getResend() would otherwise return a
  // stub that looks like a successful send).
  if (process.env.EMAILS_ENABLED !== 'true') {
    console.warn('[payment-prompts] EMAILS_ENABLED is not true — claiming and sending nothing.');
    return NextResponse.json({ ok: false, aborted: 'kill-switch', sent: 0 });
  }

  const since = new Date(now.getTime() - PROMPT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('id, session_date, status, payment_status, fee, client_id, clients(full_name)')
    .in('status', ['scheduled', 'attended'])
    .eq('payment_status', 'unpaid')
    .gte('session_date', since)
    .lte('session_date', now.toISOString())
    .order('session_date', { ascending: true });
  if (error) {
    console.error('[payment-prompts] sessions query failed:', dbError(error));
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  const { data: prompts, error: promptErr } = await supabaseAdmin
    .from('payment_prompts')
    .select('session_id, prompt_count, last_prompted_at, snoozed_until, resolved_at');
  if (promptErr) {
    // Fail closed: without the ledger we can't know what was already asked.
    console.error('[payment-prompts] prompt ledger unavailable — sending nothing:', dbError(promptErr));
    return NextResponse.json({ ok: false, aborted: 'ledger-unavailable', sent: 0 }, { status: 500 });
  }

  type Row = PromptSession & { client_id: string; clients: { full_name: string } | null };
  const due = sessionsNeedingPrompt((sessions ?? []) as unknown as Row[], (prompts ?? []) as PromptRow[], now);
  if (due.length === 0) return NextResponse.json({ ok: true, due: 0, sent: 0 });

  const batch = due.slice(0, MAX_PER_RUN);
  const more = due.length - batch.length;
  const countOf = new Map(((prompts ?? []) as PromptRow[]).map(p => [p.session_id, p.prompt_count]));

  // CLAIM each prompt before sending; only claimed sessions go in the email.
  const claimed: Row[] = [];
  for (const s of batch) {
    const nowIso = now.toISOString();
    const { error: claimErr } = await supabaseAdmin.from('payment_prompts').upsert(
      {
        session_id: s.id,
        // first_prompted_at is only set on the first claim (a re-claim leaves it).
        ...(countOf.has(s.id) ? {} : { first_prompted_at: nowIso }),
        last_prompted_at: nowIso,
        prompt_count: (countOf.get(s.id) ?? 0) + 1,
        snoozed_until: null,
      },
      { onConflict: 'session_id' },
    );
    if (claimErr) {
      console.error('[payment-prompts] claim failed — NOT prompting:', claimErr.message);
      continue;
    }
    claimed.push(s);
  }
  if (claimed.length === 0) return NextResponse.json({ ok: false, aborted: 'claim-failed', sent: 0 });

  let failed = false;
  try {
    const result = await getResend().emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: `Did they pay? ${claimed.length} session${claimed.length === 1 ? '' : 's'} to check`,
      html: buildPaymentPromptDigestHtml({
        origin: SITE_URL,
        moreCount: more,
        items: claimed.map(s => ({
          sessionId: s.id,
          label: promptLabel({ full_name: s.clients?.full_name ?? '' }),
          when: whenLabel(s.session_date),
          feeEuros: Math.round((s.fee ?? 0) / 100),
        })),
      }),
    });
    failed = Boolean(result.error);
    if (result.error) console.error('[payment-prompts] Resend error:', JSON.stringify(result.error));
  } catch (err) {
    failed = true;
    console.error('[payment-prompts] send threw:', err instanceof Error ? err.message : String(err));
  }

  if (failed) {
    // Give the claims back so the next hourly run can try again.
    for (const s of claimed) {
      const prior = countOf.get(s.id) ?? 0;
      await supabaseAdmin.from('payment_prompts')
        .update({ prompt_count: prior }).eq('session_id', s.id);
    }
    return NextResponse.json({ ok: false, aborted: 'send-failed', sent: 0 });
  }

  console.log(`[payment-prompts] prompted for ${claimed.length} session(s), ${more} more waiting`);
  return NextResponse.json({ ok: true, due: due.length, prompted: claimed.length, more, sent: 1 });
}
