import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL, buildPaymentPromptDigestHtml } from '@/lib/emailTemplates';
import { paymentPromptIdempotencyKey } from '@/lib/scheduleSnapshot';
import { SITE_URL } from '@/practice.config';
import { formatShortWhen } from '@/lib/dateUtils';
import {
  sessionsNeedingPrompt, promptLabel, withinSendingHours, PROMPT_WINDOW_DAYS,
  MAX_PROMPTS_PER_SESSION, REPROMPT_GAP_HOURS,
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
//   - CLAIM BEFORE SEND: each prompt row is claimed by a conditional write
//     (compare-and-swap on prompt_count, plus the gap/snooze/resolved checks)
//     that returns the row, so two overlapping runs can't both claim it;
//     only sessions actually claimed are emailed; fail-closed otherwise
//   - the send carries an idempotency key (sessions + hour), so a retried or
//     duplicate request can't produce a second digest
//   - HARD CAP: at most 10 sessions per email, 5 prompts per session ever,
//     and an unanswered prompt is repeated at most once every 18 hours
//   - the links in the email carry no secret: the action happens only after
//     the practitioner is logged in and confirms in the dashboard

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_PER_RUN = 10;

// Vercel Cron: GET + bearer only.
export async function GET(req: NextRequest) {
  if (!bearerMatches(req, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return run();
}

// Manual run from the dashboard: POST + admin cookie (or the bearer).
export async function POST(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || (await requireAdmin(req)) === null;
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return run();
}

// Same pattern as the reminders' abort alert: best-effort, via getResend().
async function sendDigestBrokenAlert(): Promise<void> {
  try {
    await getResend().emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: "Heads-up: the 'Did they pay?' emails have stopped",
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:560px;">
        <p>The hourly "Did they pay?" email was rejected by the email service as invalid, so nothing was sent. This is a fault in the website, not something you did, and retrying will not fix it.</p>
        <p>You can still tick off payments in the dashboard: <a href="${SITE_URL}/admin/intake">${SITE_URL.replace('https://', '')}/admin/intake</a></p>
      </div>`,
    });
  } catch (err) {
    console.error('[payment-prompts] failed to send broken-digest alert:', err instanceof Error ? err.message : String(err));
  }
}

async function run(): Promise<NextResponse> {
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
    .select('id, session_date, status, payment_status, fee, client_id, clients(full_name, email), receipt_sent_at')
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

  type Row = PromptSession & { client_id: string; clients: { full_name: string; email: string | null } | null; receipt_sent_at: string | null };
  const due = sessionsNeedingPrompt((sessions ?? []) as unknown as Row[], (prompts ?? []) as PromptRow[], now);
  if (due.length === 0) return NextResponse.json({ ok: true, due: 0, sent: 0 });

  const batch = due.slice(0, MAX_PER_RUN);
  const more = due.length - batch.length;
  const priorOf = new Map(((prompts ?? []) as PromptRow[]).map(p => [p.session_id, p]));

  // Make sure every session in the batch has a ledger row (count 0). Ignoring
  // duplicates means a row created by a racing run is left alone.
  const missing = batch.filter(s => !priorOf.has(s.id)).map(s => ({ session_id: s.id, prompt_count: 0 }));
  if (missing.length > 0) {
    const { error: seedErr } = await supabaseAdmin.from('payment_prompts')
      .upsert(missing, { onConflict: 'session_id', ignoreDuplicates: true });
    if (seedErr) {
      console.error('[payment-prompts] could not create ledger rows — NOT prompting:', seedErr.message);
      return NextResponse.json({ ok: false, aborted: 'claim-failed', sent: 0 });
    }
  }

  // CLAIM each prompt with a conditional write that returns the row it changed.
  // The update only matches if the row still looks exactly as we read it
  // (prompt_count unchanged), isn't resolved, is under the cap, and is past
  // its snooze / re-ask gap. Whoever's update returns a row owns the claim.
  const nowIso = now.toISOString();
  const gapCut = new Date(now.getTime() - REPROMPT_GAP_HOURS * 60 * 60 * 1000).toISOString();
  const claimed: Row[] = [];
  for (const s of batch) {
    const prior = priorOf.get(s.id)?.prompt_count ?? 0;
    const { data: got, error: claimErr } = await supabaseAdmin.from('payment_prompts')
      .update({
        last_prompted_at: nowIso,
        prompt_count: prior + 1,
        snoozed_until: null,
        ...(prior === 0 ? { first_prompted_at: nowIso } : {}),
      })
      .eq('session_id', s.id)
      .eq('prompt_count', prior)
      .lt('prompt_count', MAX_PROMPTS_PER_SESSION)
      .is('resolved_at', null)
      .or(`and(snoozed_until.is.null,or(last_prompted_at.is.null,last_prompted_at.lt."${gapCut}")),snoozed_until.lte."${nowIso}"`)
      .select('session_id');
    if (claimErr) {
      console.error('[payment-prompts] claim failed — NOT prompting:', claimErr.message);
      continue;
    }
    if (!got || got.length === 0) continue; // someone else has it, or it isn't due
    claimed.push(s);
  }
  if (claimed.length === 0) return NextResponse.json({ ok: true, due: due.length, prompted: 0, sent: 0, skipped: 'nothing-claimed' });

  let failed = false;
  let codeBug = false;
  try {
    // Hashed: Resend keys are 1-256 chars and raw uuids overflow that at 7+ sessions.
    const idempotencyKey = paymentPromptIdempotencyKey(claimed.map(c => c.id), Math.floor(now.getTime() / 3_600_000));
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
          when: formatShortWhen(s.session_date),
          canEmailReceipt: !s.receipt_sent_at && Boolean(s.clients?.email),
          receiptAlreadySent: Boolean(s.receipt_sent_at),
        })),
      }),
    }, { idempotencyKey });
    const err = result.error as { statusCode?: number | null; name?: string } | null;
    const duplicate = err?.statusCode === 409
      || err?.name === 'invalid_idempotent_request' || err?.name === 'concurrent_idempotent_requests';
    if (duplicate) {
      // Resend already has this exact digest: it went (or is going) out. Keep the claims.
      console.warn('[payment-prompts] duplicate digest refused by Resend — treating as already sent');
    } else {
      failed = Boolean(err);
      // A 4xx validation error (bad idempotency key, bad payload) is a code bug
      // that retrying can never fix: tell the practitioner instead of failing silently.
      const status = err?.statusCode ?? 0;
      if (err && (err.name === 'invalid_idempotency_key' || (status >= 400 && status < 500))) codeBug = true;
    }
    if (failed) console.error('[payment-prompts] Resend error:', JSON.stringify(result.error));
  } catch (err) {
    failed = true;
    console.error('[payment-prompts] send threw:', err instanceof Error ? err.message : String(err));
  }

  if (failed) {
    // Give the claims back (count, last-asked time and snooze) so the next
    // hourly run can try again.
    for (const s of claimed) {
      const p = priorOf.get(s.id);
      await supabaseAdmin.from('payment_prompts')
        .update({
          prompt_count: p?.prompt_count ?? 0,
          last_prompted_at: p?.last_prompted_at ?? null,
          snoozed_until: p?.snoozed_until ?? null,
          ...(p ? {} : { first_prompted_at: null }),
        })
        .eq('session_id', s.id);
    }
    if (codeBug) {
      console.error('[payment-prompts] CODE BUG: Resend rejected the digest as invalid; claims released, alerting the practice address. Retrying will not help.');
      await sendDigestBrokenAlert();
    }
    return NextResponse.json({ ok: false, aborted: 'send-failed', sent: 0 });
  }

  console.log(`[payment-prompts] prompted for ${claimed.length} session(s), ${more} more waiting`);
  return NextResponse.json({ ok: true, due: due.length, prompted: claimed.length, more, sent: 1 });
}
