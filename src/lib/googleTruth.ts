import { supabaseAdmin, dbError } from '@/lib/supabase';
import type { DriftItem } from '@/lib/calendarDrift';
import { applyDriftChoice, type FixChoice } from '@/lib/calendarFix';
import type { CalLike } from '@/lib/googleSessionEvents';

/**
 * Google Calendar leads the schedule (Owen's choice, 27 Nov 2026).
 *
 * Every few minutes the sync job compares the app with Google
 * (src/lib/calendarDrift.ts) and makes the app follow Google:
 *  - a session event that appeared in Google → added to the app
 *    (with the strict client-name matcher; invitations from others never count);
 *  - an event moved in Google → the session moves;
 *  - an event deleted in Google → the session is cancelled.
 *
 * Safety:
 *  - a paid session is never changed or cancelled automatically: it stays in
 *    the dashboard's list for a tap;
 *  - a session cancelled in the app is never brought back automatically (that
 *    was a deliberate choice in the app; it stays in the list);
 *  - a session made in the app whose write to Google failed is retried, not
 *    cancelled (the sync job's retry step handles it);
 *  - if Google suddenly shows more than MAX_AUTO_CANCELS deleted sessions at
 *    once, none of them is cancelled and a "held" line is logged for the
 *    dashboard (a calendar glitch must never cancel a week of sessions);
 *    additions and moves go MAX_AUTO_CHANGES at a time, the rest next run;
 *  - an added session whose format can't be told stays unconfirmed, so no
 *    reminder goes out until the practitioner picks in person / online;
 *  - every change is written to `calendar_sync_log`, shown on the dashboard.
 */

/** Only events titled like a session are added on their own ("Session — Jake
 *  Walsh", "Philip client"); a bare name ("Call Jane Durnin's GP") waits for a tap. */
const SESSIONISH = /\b(session|client)\b/i;
/** Most cancellations in 24 hours before the rest are held (a slow glitch). */
export const MAX_CANCELS_PER_DAY = 15;
/** Most additions and moves in one run; the rest follow on the next run. */
export const MAX_AUTO_CHANGES = 15;
/** More deletions than this at once looks like a glitch: cancel none, flag it. */
export const MAX_AUTO_CANCELS = 6;

export interface PlannedChange { item: DriftItem; choice: FixChoice; action: 'added' | 'moved' | 'cancelled' }

export interface TruthPlan {
  changes: PlannedChange[];
  /** How many deletions were held back because there were too many at once (0 = none). */
  held: number;
  /** Differences left for the practitioner to tap (paid, cancelled in the app, …). */
  left: number;
}

/** What to change so the app follows Google. Pure: `paidIds` are sessions marked paid. */
export function planGoogleTruth(items: DriftItem[], paidIds: Set<string>): TruthPlan {
  const changes: PlannedChange[] = [];
  let left = 0;
  for (const item of items) {
    const paid = item.sessionId ? paidIds.has(item.sessionId) : false;
    if (item.kind === 'only_in_google' && item.eventId && item.googleStart && SESSIONISH.test(item.eventTitle ?? '')) {
      changes.push({ item, choice: 'add_to_app', action: 'added' });
    } else if (item.kind === 'moved_in_google' && !paid && item.sessionId && item.googleStart) {
      changes.push({ item, choice: 'keep_google', action: 'moved' });
    } else if (item.kind === 'not_in_google' && !item.retry && !paid && item.sessionId) {
      changes.push({ item, choice: 'cancel_in_app', action: 'cancelled' });
    } else if (!(item.kind === 'not_in_google' && item.retry)) {
      left += 1;                                   // paid, or cancelled in the app: a tap
    }
  }
  const cancels = changes.filter(c => c.action === 'cancelled');
  const others = changes.filter(c => c.action !== 'cancelled').slice(0, MAX_AUTO_CHANGES);
  if (cancels.length > MAX_AUTO_CANCELS) return { changes: others, held: cancels.length, left: left + cancels.length };
  return { changes: [...others, ...cancels], held: 0, left };
}

export interface TruthOutcome { applied: number; held: number; failed: number }

/** Apply the plan with the dashboard's own fix actions, logging each one first. */
export async function applyGoogleTruth(cal: CalLike, items: DriftItem[]): Promise<TruthOutcome> {
  const sessionIds = items.map(i => i.sessionId).filter((x): x is string => Boolean(x));
  const paidIds = new Set<string>();
  if (sessionIds.length) {
    const { data } = await supabaseAdmin.from('sessions').select('id').in('id', sessionIds).eq('payment_status', 'paid');
    for (const r of data ?? []) paidIds.add(r.id as string);
  }
  const plan = planGoogleTruth(items, paidIds);
  let held = plan.held;
  let changes = plan.changes;

  // A slow glitch can delete a few each run: cap cancellations per 24 hours too.
  const cancels = changes.filter(c => c.action === 'cancelled');
  if (cancels.length) {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count, error } = await supabaseAdmin.from('calendar_sync_log')
      .select('id', { count: 'exact', head: true }).eq('action', 'cancelled').gte('at', since);
    if (error || (count ?? 0) + cancels.length > MAX_CANCELS_PER_DAY) {
      held += cancels.length;
      changes = changes.filter(c => c.action !== 'cancelled');
    }
  }

  if (held && !(await heldRecently())) {
    await log({ action: 'held', client_id: null, session_id: null, detail: `${held} sessions disappeared from Google Calendar in a short time, so none were cancelled. Check them in the list below.` });
  }

  let applied = 0;
  let failed = 0;
  for (const { item, choice, action } of changes) {
    // Record first: a change must never happen without its line on the dashboard.
    const logId = await log({ action, client_id: item.clientId, session_id: item.sessionId ?? null, detail: describe(action, item) });
    if (!logId) break;
    const r = await applyDriftChoice(cal, item, choice, { auto: true });
    if (r.ok) { applied += 1; continue; }
    failed += 1;
    await supabaseAdmin.from('calendar_sync_log').delete().eq('id', logId);   // it didn't happen
  }
  await purgeOldLog();
  return { applied, held, failed };
}

const fmt = (iso?: string) => iso
  ? new Date(iso).toLocaleString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin' })
  : '';

function describe(action: PlannedChange['action'], item: DriftItem): string {
  if (action === 'added') return `${item.clientName}: added ${fmt(item.googleStart)} (new in Google Calendar)`;
  if (action === 'moved') return `${item.clientName}: moved from ${fmt(item.appStart)} to ${fmt(item.googleStart)}`;
  return `${item.clientName}: ${fmt(item.appStart)} cancelled (deleted in Google Calendar)`;
}

interface LogLine { action: string; client_id: string | null; session_id: string | null; detail: string }

async function log(line: LogLine): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('calendar_sync_log').insert(line).select('id').single();
  if (error || !data) { console.error('[googleTruth] could not write the change log, so no change was made:', dbError(error)); return null; }
  return data.id as string;
}

/** The log is a short-term record: keep 90 days. */
async function purgeOldLog() {
  const before = new Date(Date.now() - 90 * 86_400_000).toISOString();
  await supabaseAdmin.from('calendar_sync_log').delete().lt('at', before);
}

/** One "held" line per few hours is enough; the job runs every 5 minutes. */
async function heldRecently(): Promise<boolean> {
  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { data } = await supabaseAdmin.from('calendar_sync_log').select('id').eq('action', 'held').gte('at', since).limit(1);
  return Boolean(data?.length);
}

export interface SyncLogLine { at: string; action: string; detail: string }

/** The last week of automatic changes, newest first, for the dashboard. */
export async function recentGoogleChanges(days = 7): Promise<SyncLogLine[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabaseAdmin.from('calendar_sync_log').select('at, action, detail')
    .gte('at', since).order('at', { ascending: false }).limit(30);
  return (data ?? []) as SyncLogLine[];
}
