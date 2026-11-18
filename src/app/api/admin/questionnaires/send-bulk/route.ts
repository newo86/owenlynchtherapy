import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';
import { issueQuestionnaires, kindsFor, SEND_CHOICES, type SendChoice } from '@/lib/questionnaires/send';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Sending is sequential and paced (the email provider allows ~2 requests a
// second). A run stops itself well inside the function limit and reports who
// is left ("press again to continue"); re-running is safe because of the
// 12-hour guard below AND the provider-side idempotency key on every email.
export const maxDuration = 60;
const MAX_RECIPIENTS = 50;
const PACE_MS = 600;
const TIME_BUDGET_MS = 40_000;
/** Hard ceiling on questionnaire LINKS emailed per rolling 24 hours (a "both"
 *  email is two), counted in the database (survives cold starts), in case of
 *  a bug or a stolen session. */
const DAILY_EMAIL_CAP = 80;
/** Don't email someone the same questionnaire twice in this window
 *  (a double-click, a retry, or pressing the button again by mistake). */
const DUPLICATE_WINDOW_MS = 12 * 60 * 60 * 1000;

type Outcome = 'sent' | 'already_sent' | 'skipped_recent' | 'skipped_no_email' | 'skipped_inactive' | 'emails_off' | 'failed' | 'not_attempted';

/**
 * POST /api/admin/questionnaires/send-bulk
 * body: { client_ids: string[], kind: 'values' | 'cnip' | 'both' }
 *
 * Emails questionnaire links to several clients, one email each. Only ACTIVE
 * clients with an email on their record are sent to; anyone already emailed
 * the same questionnaire in the last 12 hours is skipped. Returns one outcome
 * per requested client so the dashboard can show exactly what happened.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  // x-real-ip is set by Vercel; the first x-forwarded-for entry is caller-controlled.
  const ip = req.headers.get('x-real-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('questionnaire-send-bulk', ip, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many bulk sends. Please try again later.' }, { status: 429 });
  }

  let body: { client_ids?: unknown; kind?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const choice = body.kind as SendChoice;
  if (!SEND_CHOICES.includes(choice)) return NextResponse.json({ error: 'Unknown questionnaire' }, { status: 400 });
  if (!Array.isArray(body.client_ids) || body.client_ids.length === 0) {
    return NextResponse.json({ error: 'Choose at least one client' }, { status: 400 });
  }
  const ids = [...new Set(body.client_ids)].filter((x): x is string => typeof x === 'string' && UUID_RE.test(x));
  if (ids.length !== body.client_ids.length) return NextResponse.json({ error: 'Invalid client list' }, { status: 400 });
  if (ids.length > MAX_RECIPIENTS) {
    return NextResponse.json({ error: `At most ${MAX_RECIPIENTS} clients per send` }, { status: 400 });
  }

  const { count: sentToday, error: capErr } = await supabaseAdmin
    .from('questionnaire_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('is_test', false)
    .gte('emailed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  if (capErr) {
    console.error('[questionnaires/send-bulk] cap check error:', dbError(capErr));
    return NextResponse.json({ error: 'Could not check today’s sending limit' }, { status: 500 });
  }
  if ((sentToday ?? 0) + ids.length * kindsFor(choice).length > DAILY_EMAIL_CAP) {
    return NextResponse.json({
      error: `That would go over today’s limit of ${DAILY_EMAIL_CAP} questionnaire links (${sentToday ?? 0} emailed in the last 24 hours; “Both” counts as two). Send to fewer clients, or try again tomorrow.`,
    }, { status: 429 });
  }

  const { data: clients, error: cErr } = await supabaseAdmin
    .from('clients').select('id, full_name, email, status').in('id', ids);
  if (cErr || !clients) {
    console.error('[questionnaires/send-bulk] clients error:', dbError(cErr));
    return NextResponse.json({ error: 'Could not load clients' }, { status: 500 });
  }

  // Recent sends of the same questionnaire(s), for the duplicate guard.
  const kinds = kindsFor(choice);
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString();
  const { data: recent, error: recentErr } = await supabaseAdmin
    .from('questionnaire_tokens')
    .select('client_id, kind')
    .in('client_id', ids)
    .in('kind', kinds)
    .not('emailed_at', 'is', null)
    .gte('emailed_at', since);
  if (recentErr) {
    // Fail closed: without this check a re-run could email people again.
    console.error('[questionnaires/send-bulk] recent-sends error:', dbError(recentErr));
    return NextResponse.json({ error: 'Could not check who was already emailed, so nothing was sent.' }, { status: 500 });
  }
  const recentlyEmailed = new Set((recent ?? []).map(r => r.client_id as string));

  const started = Date.now();
  // Same key for the same client, questionnaire and Dublin day: the provider
  // drops a repeat, so two overlapping runs can't email anyone twice.
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' });
  const results: Array<{ client_id: string; outcome: Outcome }> = [];
  let sentSoFar = 0;
  for (const [n, id] of ids.entries()) {
    if (Date.now() - started > TIME_BUDGET_MS) {
      for (const rest of ids.slice(n)) results.push({ client_id: rest, outcome: 'not_attempted' });
      break;
    }
    const c = clients.find(x => x.id === id);
    const email = ((c?.email as string | null) ?? '').trim();
    if (!c || c.status !== 'active') { results.push({ client_id: id, outcome: 'skipped_inactive' }); continue; }
    if (!email) { results.push({ client_id: id, outcome: 'skipped_no_email' }); continue; }
    if (recentlyEmailed.has(id)) { results.push({ client_id: id, outcome: 'skipped_recent' }); continue; }

    if (sentSoFar > 0) await new Promise(r => setTimeout(r, PACE_MS));
    const r = await issueQuestionnaires({
      clientId: id,
      isTest: false,
      choice,
      email: true,
      firstName: ((c.full_name as string) ?? '').trim().split(/\s+/)[0] ?? '',
      recipientEmail: email,
      idempotencyKey: `questionnaire-bulk/${id}/${choice}/${day}`,
    });
    sentSoFar++;
    if (r.emailed) results.push({ client_id: id, outcome: 'sent' });
    else if (r.alreadySent) results.push({ client_id: id, outcome: 'already_sent' });
    else if (r.killSwitch) {
      // The kill switch is on: stop rather than make links nobody receives.
      results.push({ client_id: id, outcome: 'emails_off' });
      for (const rest of ids.slice(n + 1)) results.push({ client_id: rest, outcome: 'emails_off' });
      break;
    } else results.push({ client_id: id, outcome: 'failed' });
  }

  return NextResponse.json({ results }, { headers: noCache });
}
