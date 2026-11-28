import { supabaseAdmin, dbError } from '@/lib/supabase';
import { utcToDublinLocal, localDublinToUtcIso } from '@/lib/dateUtils';
import { inPersonAddressFor } from '@/lib/emailTemplates';

/**
 * Ongoing clients: keep their sessions booked ahead.
 *
 * A `session_series` row says a client carries on every N weeks with no end,
 * from an anchor session (its weekday and Dublin time). Each day this tops the
 * series up so there are always HORIZON_WEEKS of sessions ahead: the next
 * dates on the anchor's rhythm after the client's latest session in the series,
 * with the format, place and fee of their latest live session.
 *
 * Dates come from the anchor, not the latest session, so one session moved to
 * another day doesn't drag the rest with it. A cancelled session (a holiday)
 * doesn't end anything. The series ends when the client is marked Completed
 * (src/app/api/admin/clients/update) or `active` is set false.
 *
 * Changing how often (in the client record, or followed from Google by
 * src/lib/followGoogle.ts) sets `interval_weeks` and moves `anchor_at` to the
 * first date of the new rhythm, so from then on the daily top-up steps from
 * the new anchor at the new interval. Getting MORE frequent also fills the
 * new in-between weeks once, at the time of the change (planGapFill).
 *
 * The daily top-up never reads Google and never imports anything from it.
 */

export const HORIZON_WEEKS = 16;
/** Most sessions one series may gain in one run. */
export const MAX_NEW_PER_SERIES = 20;
/** Most sessions one run may add across all series: above this, add none and report it. */
export const MAX_NEW_PER_RUN = 200;

export interface SeriesRow {
  id: string;
  client_id: string;
  interval_weeks: number;
  gcal_event_id: string | null;
  anchor_at: string;             // UTC ISO of a session on the series' rhythm
  active: boolean;
}

export interface SeriesSession {
  client_id: string;
  session_date: string;          // UTC ISO
  status: string;
  gcal_event_id: string | null;
  session_format: string;
  location: string | null;
  fee: number;
  format_confirmed?: boolean | null;
}

const baseId = (gid: string | null) => (gid ? gid.split('_')[0] : null);
const DAY = 86_400_000;

/** Dublin wall clock "YYYY-MM-DDTHH:MM" plus whole days, DST-safe. */
export function addDaysLocal(local: string, days: number): string {
  const [d, t] = local.split('T');
  const [y, m, dd] = d.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, dd + days));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getUTCFullYear()}-${p(x.getUTCMonth() + 1)}-${p(x.getUTCDate())}T${t.slice(0, 5)}`;
}

/** Whole calendar days from local date a to local date b. */
export function daysBetweenLocal(a: string, b: string): number {
  const day = (s: string) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
  return day(b) - day(a);
}

/** Is a Dublin wall-clock slot on the rhythm "anchor + k × interval weeks"
 *  (same weekday and time, any whole k, before or after the anchor)? */
export function onRhythmLocal(anchorLocal: string, intervalWeeks: number, slotLocal: string): boolean {
  if (anchorLocal.slice(11, 16) !== slotLocal.slice(11, 16)) return false;
  return daysBetweenLocal(anchorLocal, slotLocal) % (7 * intervalWeeks) === 0;
}

/** A session this close to a rhythm date (any status) already covers that
 *  week: a holiday cancelled in the app, or a session moved a day or two. */
export const NEAR_DAYS = 3;
/** Most sessions one frequency change may add. */
export const MAX_GAP_FILL = 60;

/**
 * Rhythm dates (UTC ISO) in (fromMs, untilMs] for which the client has no
 * session near (within NEAR_DAYS, any status). Used once, when a series gets
 * MORE frequent (every 2 weeks → weekly): the daily extension only adds dates
 * after the latest session, so the new in-between weeks are filled here.
 */
export function planGapFill(
  anchorLocal: string,
  intervalWeeks: number,
  clientSessions: { session_date: string }[],
  fromMs: number,
  untilMs: number,
): string[] {
  if (!(intervalWeeks >= 1 && intervalWeeks <= 4) || untilMs <= fromMs) return [];
  const step = 7 * intervalWeeks;
  const near = NEAR_DAYS * DAY;
  const taken = clientSessions.map(s => new Date(s.session_date).getTime());
  let k = Math.max(0, Math.floor(daysBetweenLocal(anchorLocal, utcToDublinLocal(new Date(fromMs).toISOString())) / step) - 1);
  const out: string[] = [];
  for (; out.length < MAX_GAP_FILL; k++) {
    const ms = new Date(localDublinToUtcIso(addDaysLocal(anchorLocal, step * k))).getTime();
    if (ms > untilMs) break;
    if (ms <= fromMs) continue;
    if (taken.some(t => Math.abs(t - ms) <= near)) continue;
    out.push(new Date(ms).toISOString());
  }
  return out;
}

export interface IntervalSession { id: string; session_date: string; status: string; gcal_event_id: string | null }

export interface IntervalPlan {
  /** First session on the new rhythm (UTC ISO): the next upcoming one. */
  effectiveFrom: string;
  /** Upcoming sessions on the new rhythm: kept. */
  keep: IntervalSession[];
  /** Upcoming sessions on the old rhythm but not the new one: cancelled. */
  cancel: IntervalSession[];
  /** Upcoming sessions moved off the old rhythm by hand: left exactly as they are. */
  moved: IntervalSession[];
  /** New dates (UTC ISO) when the series gets more frequent. */
  add: string[];
}

/**
 * What changing an ongoing series to every `toWeeks` weeks does, from the
 * client's next session on. Pure so the confirm text and the change itself
 * come from the same plan. `upcoming` = the series' scheduled sessions after
 * now; `clientSessions` = every session the client has from now (any status).
 */
export function planIntervalChange(
  series: Pick<SeriesRow, 'interval_weeks' | 'anchor_at'>,
  upcoming: IntervalSession[],
  clientSessions: { id?: string; session_date: string }[],
  toWeeks: number,
  now: Date,
): IntervalPlan | { error: string } {
  if (!(toWeeks >= 1 && toWeeks <= 4)) return { error: 'Choose weekly or every 2, 3 or 4 weeks.' };
  if (toWeeks === series.interval_weeks) return { error: 'It already repeats at that rhythm.' };
  const oldAnchor = utcToDublinLocal(series.anchor_at);
  const sorted = upcoming
    .filter(s => s.status === 'scheduled' && new Date(s.session_date).getTime() > now.getTime())
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  const slot = (s: IntervalSession) => utcToDublinLocal(s.session_date);
  const first = sorted.find(s => onRhythmLocal(oldAnchor, series.interval_weeks, slot(s)));
  if (!first) return { error: 'There are no upcoming sessions in this series to change.' };
  const fromLocal = slot(first);
  const plan: IntervalPlan = { effectiveFrom: new Date(first.session_date).toISOString(), keep: [], cancel: [], moved: [], add: [] };
  for (const s of sorted) {
    const sl = slot(s);
    if (!onRhythmLocal(oldAnchor, series.interval_weeks, sl)) { plan.moved.push(s); continue; }
    if (new Date(s.session_date).getTime() < new Date(first.session_date).getTime()) continue;
    if (onRhythmLocal(fromLocal, toWeeks, sl)) plan.keep.push(s); else plan.cancel.push(s);
  }
  const latest = new Date(sorted[sorted.length - 1].session_date).getTime();
  const cancelled = new Set(plan.cancel.map(c => c.id));
  plan.add = toWeeks < series.interval_weeks
    ? planGapFill(fromLocal, toWeeks, clientSessions.filter(c => !c.id || !cancelled.has(c.id)), now.getTime(), latest)
    : [];
  return plan;
}

/**
 * The session dates (UTC ISO) a series needs adding so it reaches
 * `now + HORIZON_WEEKS`. `seriesSessions` are the client's sessions in this
 * series (any status); `takenMs` holds every slot the client already has.
 */
export function planExtension(
  series: SeriesRow,
  seriesSessions: SeriesSession[],
  takenMs: Set<number>,
  now: Date,
  clientActive: boolean,
): string[] {
  if (!series.active || !clientActive || !series.gcal_event_id) return [];
  if (!(series.interval_weeks >= 1 && series.interval_weeks <= 4)) return [];
  if (!seriesSessions.length) return [];

  const latestMs = Math.max(...seriesSessions.map(s => new Date(s.session_date).getTime()));
  const fromMs = Math.max(latestMs, now.getTime());
  const horizon = now.getTime() + HORIZON_WEEKS * 7 * DAY;
  if (fromMs >= horizon) return [];

  const anchorLocal = utcToDublinLocal(series.anchor_at);
  const step = 7 * series.interval_weeks;
  // First rhythm date on or after the latest session (local days, then exact check).
  let k = Math.max(0, Math.floor(daysBetweenLocal(anchorLocal, utcToDublinLocal(new Date(fromMs).toISOString())) / step));
  const out: string[] = [];
  for (; out.length < MAX_NEW_PER_SERIES; k++) {
    const ms = new Date(localDublinToUtcIso(addDaysLocal(anchorLocal, step * k))).getTime();
    if (ms > horizon) break;
    if (ms <= fromMs || takenMs.has(ms)) continue;
    out.push(new Date(ms).toISOString());
  }
  return out;
}

export interface ExtendOutcome { series: number; added: number; errors: string[] }

/** Top up every active series. Safe to run any number of times. */
export async function extendAllSeries(now = new Date()): Promise<ExtendOutcome> {
  const { data: series, error } = await supabaseAdmin
    .from('session_series')
    .select('id, client_id, interval_weeks, gcal_event_id, anchor_at, active')
    .eq('active', true);
  if (error) return { series: 0, added: 0, errors: [dbError(error).message ?? 'error'] };
  if (!series?.length) return { series: 0, added: 0, errors: [] };

  const clientIds = [...new Set(series.map(s => s.client_id as string))];
  const { data: clients } = await supabaseAdmin.from('clients').select('id, status').in('id', clientIds);
  const activeClients = new Set((clients ?? []).filter(c => c.status === 'active').map(c => c.id as string));

  const errors: string[] = [];
  const planned: { s: SeriesRow; template: SeriesSession; dates: string[] }[] = [];
  const LIMIT = 500;
  for (const s of series as SeriesRow[]) {
    if (!activeClients.has(s.client_id) || !s.gcal_event_id) continue;
    const base = baseId(s.gcal_event_id)!;
    // Read per series and per client, each well inside the API's row limit.
    const [{ data: mine, error: e1 }, { data: ahead, error: e2 }] = await Promise.all([
      supabaseAdmin.from('sessions')
        .select('client_id, session_date, status, gcal_event_id, session_format, location, fee, format_confirmed')
        .eq('client_id', s.client_id).like('gcal_event_id', `${base}%`)
        .order('session_date', { ascending: false }).limit(LIMIT),
      supabaseAdmin.from('sessions').select('session_date')
        .eq('client_id', s.client_id).gte('session_date', now.toISOString()).limit(LIMIT),
    ]);
    if (e1 || e2 || !mine || !ahead) { errors.push(`${s.id}: ${dbError(e1 ?? e2).message ?? 'read failed'}`); continue; }
    if (mine.length >= LIMIT || ahead.length >= LIMIT) { errors.push(`${s.id}: too many rows to judge safely`); continue; }
    const seriesSessions = (mine as SeriesSession[]).filter(x => baseId(x.gcal_event_id) === base);
    const template = seriesSessions.find(x => x.status !== 'cancelled');
    if (!template) continue;
    const taken = new Set((ahead as { session_date: string }[]).map(x => new Date(x.session_date).getTime()));
    const dates = planExtension(s, seriesSessions, taken, now, true);
    if (dates.length) planned.push({ s, template, dates });
  }

  const total = planned.reduce((n, p) => n + p.dates.length, 0);
  if (total > MAX_NEW_PER_RUN) {
    return { series: series.length, added: 0, errors: [...errors, `would add ${total} sessions (cap ${MAX_NEW_PER_RUN}); added none`] };
  }

  let added = 0;
  for (const { s, template, dates } of planned) {
    const rows = dates.map(d => ({
      client_id: s.client_id,
      session_date: d,
      session_format: template.session_format,
      format_confirmed: template.format_confirmed ?? true,
      location: template.session_format === 'in_person' ? inPersonAddressFor(d) : template.location,
      fee: template.fee,
      status: 'scheduled',
      payment_status: 'unpaid',
      gcal_event_id: s.gcal_event_id,
    }));
    const { data, error: insErr } = await supabaseAdmin.from('sessions').insert(rows).select('id');
    if (insErr) { errors.push(`${s.id}: ${dbError(insErr).message ?? 'insert failed'}`); continue; }
    added += data?.length ?? 0;
  }
  return { series: series.length, added, errors };
}

/** End a client's ongoing series (the client was marked Completed). */
export async function endSeriesForClient(clientId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('session_series')
    .update({ active: false, ended_at: new Date().toISOString() })
    .eq('client_id', clientId).eq('active', true);
  if (error) console.error('[sessionSeries] could not end series:', dbError(error));
}
