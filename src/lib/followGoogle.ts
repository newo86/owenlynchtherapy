import { utcToDublinLocal, localDublinToUtcIso, formatShortWhen } from '@/lib/dateUtils';
import { INSTANCE_ID, type CalLike, type EventLike } from '@/lib/googleSessionEvents';
import type { MappedEvent } from '@/lib/calendarSync';
import type { DriftItem } from '@/lib/calendarDrift';
import { addDaysLocal, daysBetweenLocal, onRhythmLocal, NEAR_DAYS, MAX_GAP_FILL } from '@/lib/sessionSeries';

/**
 * Follow Google: the few changes made in Google Calendar that the app copies
 * by itself (27 Nov 2026).
 *
 * The app is still the diary. But Owen edits in Google, and "when I delete in
 * Google Calendar it doesn't update in my dashboard, or I change things to
 * every two weeks and it doesn't update". So the 5-minute calendar job now
 * follows exactly three kinds of change, and nothing else:
 *   1. one linked occurrence deleted in Google  → that session is cancelled
 *   2. a linked repeating series deleted (or ended) in Google
 *                                              → its later sessions are
 *                                                cancelled, the series ends
 *   3. a linked series' repeat changed weekly ↔ every N weeks (N = 1–4)
 *                                              → the series' interval follows;
 *                                                sessions that no longer fall
 *                                                on a Google date are
 *                                                cancelled, new in-between
 *                                                weeks are added
 *
 * The rules that keep it safe:
 *   - Only sessions tied to Google BY ID (their own event id, or the series id
 *     resolved to that slot's occurrence). Never by title or client name, so a
 *     personal event like "Walk Orla" can never touch a session.
 *   - Only future (start > now) sessions with status 'scheduled'.
 *   - A deletion counts only on explicit evidence: Google reports the event or
 *     occurrence as cancelled (or 410 Gone), or a complete instance list has
 *     nothing on a date the repeat rule says it should. A 404, an error, a
 *     truncated read or "not connected" → no action at all.
 *   - A moved occurrence is NOT followed: it stays a difference on the
 *     dashboard for a tap (calendarDrift.ts).
 *   - Anything the rule can't read (monthly, several weekdays, a new weekday
 *     or time, every 5+ weeks) → no action; the difference card shows it.
 *   - Cap: more than MAX_CANCEL_PER_RUN sessions in the next ~10 weeks (or
 *     MAX_TOUCHED_PER_RUN overall) → nothing is applied, the practice address
 *     gets one alert per Dublin day, and the differences stay on the card.
 *   - The apply step never writes to Google, never emails a client and never
 *     sends a reminder. Every change is recorded in calendar_followed_changes
 *     and can be undone for UNDO_DAYS; an undone change is not re-applied.
 *
 * decideFollowActions() is pure (every rule is unit-tested, see also
 * src/lib/testing/fakeGoogleCalendar.ts); fetchFamilies() reads Google;
 * applyFollowPlan() writes through a FollowStore (Supabase in production,
 * in memory in tests).
 */

export const MAX_CANCEL_PER_RUN = 10;
export const MAX_TOUCHED_PER_RUN = 80;
export const UNDO_DAYS = 7;
/** A series that ends in Google is only believed ended once its last date is
 *  this far inside the read window, so a "this and following" continuation
 *  (which would show in the window) can't be missed. */
const END_MARGIN_DAYS = 28;
const INSTANCE_PAGES = 8;
const DAY = 86_400_000;

// ── Types ───────────────────────────────────────────────────────────────────

export type FollowedKind = 'cancelled_occurrence' | 'series_ended' | 'interval_changed';

export interface FollowSession {
  id: string;
  client_id: string;
  session_date: string;            // UTC ISO
  status: string;
  gcal_event_id: string | null;
  session_format?: string | null;
  location?: string | null;
  fee?: number | null;
  format_confirmed?: boolean | null;
}

export interface FollowSeries {
  id: string;
  client_id: string;
  interval_weeks: number;
  gcal_event_id: string | null;
  anchor_at: string;
  active: boolean;
}

/** A repeating (or one-off) event in a Google "family": everything whose id
 *  starts with the same base (a split series is `<base>_R<stamp>`). */
export interface GMaster {
  id: string;
  /** 'unknown' = Google said 404 or the event is unreadable: never act on it. */
  state: 'live' | 'cancelled' | 'unknown';
  recurrence: string[] | null;
  /** Dublin wall clock of the first date, "YYYY-MM-DDTHH:MM". */
  startLocal: string | null;
  allDay: boolean;
  /** Repeats on Irish wall-clock time (Europe/Dublin or London: same rules).
   *  Only then can "a date the rule generates" be worked out exactly. */
  dublinZone: boolean;
}

export interface GInstance {
  id: string;
  masterId: string;
  cancelled: boolean;
  startMs: number | null;
  originalMs: number | null;
}

export interface GFamily { base: string; masters: GMaster[]; instances: GInstance[] }

export interface UndoneMarks {
  /** Sessions whose followed change was undone: never followed again. */
  sessionIds: Set<string>;
  /** `${seriesId}:${interval}`: an undone interval change, not re-applied. */
  seriesIntervals: Set<string>;
  /** Series whose followed ending was undone. */
  seriesEnded: Set<string>;
}

export interface FollowInput {
  now: Date;
  /** End of the window the dashboard, differences and reminders look at. */
  windowEnd: Date;
  /** Scheduled sessions after now that have a Google id. */
  sessions: FollowSession[];
  /** Every session (any status) from a few days ago of clients with an
   *  active series: what "the client already has a session that week" uses. */
  clientSessions: FollowSession[];
  /** Active ongoing series. */
  series: FollowSeries[];
  families: Map<string, GFamily>;
  undone: UndoneMarks;
}

export interface SessionRef { id: string; session_date: string }
export interface SessionTemplate { session_format: string; location: string | null; fee: number; format_confirmed: boolean }

export type FollowAction =
  | { kind: 'cancelled_occurrence'; clientId: string; seriesId: string | null; base: string; session: SessionRef }
  | { kind: 'series_ended'; clientId: string; seriesId: string | null; base: string; how: 'deleted' | 'ended'; sessions: SessionRef[]; endSeries: boolean }
  | {
      kind: 'interval_changed'; clientId: string; seriesId: string; base: string;
      from: number; to: number;
      anchorBefore: string; anchorAfter: string;
      gcalBefore: string | null; gcalAfter: string;
      cancel: SessionRef[]; add: string[]; template: SessionTemplate | null;
    };

export interface FollowPlan {
  actions: FollowAction[];
  skipped: Array<{ base: string; reason: string }>;
  /** Sessions this plan cancels inside the window (what the cap counts). */
  cancelInWindow: number;
  /** Every session the plan cancels or adds. */
  touched: number;
}

// ── Repeat rules ────────────────────────────────────────────────────────────

export interface Rrule {
  freq: string;
  interval: number;
  count?: number;
  untilMs?: number;
  byday?: string[];
  /** Parts this module doesn't reason about (BYMONTHDAY, BYSETPOS, …). */
  extra: boolean;
}

export function parseRrule(recurrence: string[] | null | undefined): Rrule | null {
  if (!recurrence?.length) return null;
  const lines = recurrence.filter(l => /^RRULE:/i.test(l));
  if (lines.length !== 1 || recurrence.some(l => /^RDATE/i.test(l))) return null;
  const parts = new Map<string, string>();
  for (const p of lines[0].slice(6).split(';')) {
    const [k, v = ''] = p.split('=');
    if (k) parts.set(k.toUpperCase(), v.toUpperCase());
  }
  const freq = parts.get('FREQ');
  if (!freq) return null;
  const interval = parts.has('INTERVAL') ? Number(parts.get('INTERVAL')) : 1;
  if (!Number.isInteger(interval) || interval < 1) return null;
  const known = new Set(['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'WKST']);
  const rr: Rrule = { freq, interval, extra: [...parts.keys()].some(k => !known.has(k)) };
  if (parts.has('COUNT')) {
    const c = Number(parts.get('COUNT'));
    if (!Number.isInteger(c) || c < 1) return null;
    rr.count = c;
  }
  if (parts.has('UNTIL')) {
    const ms = untilToMs(parts.get('UNTIL')!);
    if (ms === null) return null;
    rr.untilMs = ms;
  }
  if (parts.has('BYDAY')) rr.byday = parts.get('BYDAY')!.split(',').filter(Boolean);
  return rr;
}

function untilToMs(v: string): number | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/.exec(v);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h) return new Date(localDublinToUtcIso(`${y}-${mo}-${d}T23:59`)).getTime() + 59_000;
  if (z) return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  return new Date(localDublinToUtcIso(`${y}-${mo}-${d}T${h}:${mi}`)).getTime() + Number(s) * 1000;
}

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
function weekdayOf(local: string): string {
  const [y, m, d] = local.slice(0, 10).split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** A plain "every N weeks on the first date's weekday and time" rule. */
export function isPlainWeekly(rr: Rrule | null, startLocal: string | null): rr is Rrule {
  if (!rr || !startLocal || rr.freq !== 'WEEKLY' || rr.extra) return false;
  if (rr.interval < 1 || rr.interval > 4) return false;
  if (rr.byday && !(rr.byday.length === 1 && rr.byday[0] === weekdayOf(startLocal))) return false;
  return true;
}

const msOfLocal = (local: string) => new Date(localDublinToUtcIso(local)).getTime();
const slotOfMs = (ms: number) => utcToDublinLocal(new Date(ms).toISOString());
const slotOfIso = (iso: string) => utcToDublinLocal(new Date(iso).toISOString());
const baseOf = (id: string) => id.split('_')[0];

/** Is this slot a date the master's repeat rule generates? */
function onMasterRhythm(m: GMaster, rr: Rrule, slotLocal: string): boolean {
  if (!m.startLocal || !onRhythmLocal(m.startLocal, rr.interval, slotLocal)) return false;
  const days = daysBetweenLocal(m.startLocal, slotLocal);
  if (days < 0) return false;
  if (rr.count !== undefined && days / (7 * rr.interval) >= rr.count) return false;
  if (rr.untilMs !== undefined && msOfLocal(slotLocal) > rr.untilMs) return false;
  return true;
}

/** The master's last date (ms), or Infinity when it repeats for ever. */
function lastRhythmMs(m: GMaster, rr: Rrule): number {
  if (!m.startLocal) return Infinity;
  const step = 7 * rr.interval;
  let lastK = Infinity;
  if (rr.count !== undefined) lastK = rr.count - 1;
  if (rr.untilMs !== undefined) {
    const untilLocal = slotOfMs(rr.untilMs);
    let k = Math.floor(daysBetweenLocal(m.startLocal, untilLocal) / step) + 1;
    while (k >= 0 && msOfLocal(addDaysLocal(m.startLocal, step * k)) > rr.untilMs) k--;
    lastK = Math.min(lastK, k);
  }
  if (lastK === Infinity) return Infinity;
  if (lastK < 0) return -Infinity;
  return msOfLocal(addDaysLocal(m.startLocal, step * lastK));
}

// ── The decision (pure) ────────────────────────────────────────────────────

const ref = (s: FollowSession): SessionRef => ({ id: s.id, session_date: new Date(s.session_date).toISOString() });

export function decideFollowActions(input: FollowInput): FollowPlan {
  const { now, sessions, families, undone } = input;
  const nowMs = now.getTime();
  const plan: FollowPlan = { actions: [], skipped: [], cancelInWindow: 0, touched: 0 };

  const byBase = new Map<string, FollowSession[]>();
  for (const s of sessions) {
    if (s.status !== 'scheduled' || !s.gcal_event_id) continue;
    if (new Date(s.session_date).getTime() <= nowMs) continue;
    if (undone.sessionIds.has(s.id)) continue;
    const b = baseOf(s.gcal_event_id);
    byBase.set(b, [...(byBase.get(b) ?? []), s]);
  }

  for (const [base, famSessions] of byBase) {
    const fam = families.get(base);
    if (!fam) { plan.skipped.push({ base, reason: 'not read' }); continue; }
    const clients = new Set(famSessions.map(s => s.client_id));
    if (clients.size !== 1) { plan.skipped.push({ base, reason: 'several clients' }); continue; }
    const clientId = famSessions[0].client_id;
    const series = input.series.find(r => r.active && r.client_id === clientId && r.gcal_event_id && baseOf(r.gcal_event_id) === base) ?? null;
    const out = decideFamily(fam, famSessions, series, clientId, input);
    if ('skip' in out) plan.skipped.push({ base, reason: out.skip });
    else plan.actions.push(...out.actions);
  }

  const windowMs = input.windowEnd.getTime();
  const inWindow = (r: SessionRef) => new Date(r.session_date).getTime() <= windowMs;
  for (const a of plan.actions) {
    const cancelled = a.kind === 'cancelled_occurrence' ? [a.session] : a.kind === 'series_ended' ? a.sessions : a.cancel;
    plan.cancelInWindow += cancelled.filter(inWindow).length;
    plan.touched += cancelled.length + (a.kind === 'interval_changed' ? a.add.length : 0);
  }
  return plan;
}

function decideFamily(
  fam: GFamily,
  famSessions: FollowSession[],
  series: FollowSeries | null,
  clientId: string,
  input: FollowInput,
): { actions: FollowAction[] } | { skip: string } {
  const { undone } = input;
  const nowMs = input.now.getTime();
  const base = fam.base;
  if (fam.masters.length === 0) return { skip: 'no event' };
  if (fam.masters.some(m => m.state === 'unknown')) return { skip: 'an event could not be read' };
  if (fam.masters.some(m => m.allDay)) return { skip: 'all-day event' };

  const seriesId = series?.id ?? null;
  const live = fam.masters.filter(m => m.state === 'live');

  // 2. Everything in the family deleted in Google (explicitly cancelled / 410).
  if (live.length === 0) {
    if (seriesId && undone.seriesEnded.has(seriesId)) return { skip: 'ending was undone' };
    return { actions: [{ kind: 'series_ended', clientId, seriesId, base, how: 'deleted', sessions: famSessions.map(ref), endSeries: !!series }] };
  }

  const recurring = live.filter(m => m.recurrence?.length);
  if (recurring.length === 0) {
    // A live one-off event: present. If Google has it at another time, that is
    // a move, and moves are never followed.
    return { actions: [] };
  }
  if (recurring.length !== live.length) return { skip: 'mixed one-off and repeating events' };
  const rules = new Map<string, Rrule>();
  for (const m of recurring) {
    const rr = parseRrule(m.recurrence);
    if (!isPlainWeekly(rr, m.startLocal)) return { skip: 'repeat rule the app does not follow' };
    rules.set(m.id, rr);
  }
  const governing = [...recurring].sort((a, b) => msOfLocal(b.startLocal!) - msOfLocal(a.startLocal!))[0];
  const gRule = rules.get(governing.id)!;

  // Where Google has an occurrence now, and where it explicitly removed one.
  const liveSlots = new Set<string>();
  const cancelledSlots = new Set<string>();
  const byId = new Map<string, GInstance>();
  for (const i of fam.instances) {
    byId.set(i.id, i);
    const slots = [i.startMs, i.originalMs].filter((x): x is number => x !== null).map(slotOfMs);
    for (const s of slots) (i.cancelled ? cancelledSlots : liveSlots).add(s);
  }

  let familyEndMs = -Infinity;
  for (const m of recurring) familyEndMs = Math.max(familyEndMs, lastRhythmMs(m, rules.get(m.id)!));
  const finite = familyEndMs !== Infinity;
  // Rhythm rules need Irish wall-clock repeats; otherwise only explicit
  // deletions are followed.
  const rhythmOk = recurring.every(m => m.dublinZone);
  const endKnown = rhythmOk && finite && familyEndMs + END_MARGIN_DAYS * DAY < input.windowEnd.getTime();

  // 3. The series' repeat changed in Google.
  if (series && gRule.interval !== series.interval_weeks) {
    if (!rhythmOk) return { skip: 'repeat is not on Irish time' };
    if (finite) return { skip: 'repeat changed and also ends' };
    const anchorLocal = utcToDublinLocal(series.anchor_at);
    if (weekdayOf(anchorLocal) !== weekdayOf(governing.startLocal!) || anchorLocal.slice(11, 16) !== governing.startLocal!.slice(11, 16)) {
      return { skip: 'repeat moved to another day or time' };
    }
    if (undone.seriesIntervals.has(`${series.id}:${gRule.interval}`)) return { skip: 'interval change was undone' };
    const cancel = famSessions.filter(s => {
      const slot = slotOfIso(s.session_date);
      return !liveSlots.has(slot) && onRhythmLocal(anchorLocal, series.interval_weeks, slot);
    });
    const coverUntil = Math.max(...famSessions.map(s => new Date(s.session_date).getTime()));
    const near = NEAR_DAYS * DAY;
    const clientTaken = input.clientSessions
      .filter(c => c.client_id === clientId)
      .map(c => new Date(c.session_date).getTime());
    const add: string[] = [];
    for (const i of fam.instances) {
      if (add.length >= MAX_GAP_FILL) break;
      if (i.cancelled || i.masterId !== governing.id || i.startMs === null) continue;
      if (i.originalMs !== null && i.originalMs !== i.startMs) continue;   // moved: not a rhythm date
      if (i.startMs <= nowMs || i.startMs > coverUntil) continue;
      if (clientTaken.some(t => Math.abs(t - i.startMs!) <= near)) continue;
      add.push(new Date(i.startMs).toISOString());
    }
    add.sort();
    const latestLive = [...input.clientSessions, ...famSessions]
      .filter(c => c.client_id === clientId && c.status !== 'cancelled' && c.gcal_event_id && baseOf(c.gcal_event_id) === base && c.session_format)
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];
    const template: SessionTemplate | null = latestLive ? {
      session_format: latestLive.session_format!,
      location: latestLive.location ?? null,
      fee: latestLive.fee ?? 0,
      format_confirmed: latestLive.format_confirmed ?? true,
    } : null;
    return {
      actions: [{
        kind: 'interval_changed', clientId, seriesId: series.id, base,
        from: series.interval_weeks, to: gRule.interval,
        anchorBefore: new Date(series.anchor_at).toISOString(),
        anchorAfter: new Date(localDublinToUtcIso(governing.startLocal!)).toISOString(),
        gcalBefore: series.gcal_event_id, gcalAfter: governing.id,
        cancel: cancel.map(ref), add: template ? add : [], template,
      }],
    };
  }

  // 1. Occurrences deleted one by one, and (2) a repeat that now ends.
  const actions: FollowAction[] = [];
  const ended: SessionRef[] = [];
  for (const s of famSessions) {
    const slot = slotOfIso(s.session_date);
    const gid = s.gcal_event_id!;
    const ms = new Date(s.session_date).getTime();
    if (INSTANCE_ID.test(gid) && byId.has(gid)) {
      const inst = byId.get(gid)!;
      if (inst.cancelled && !liveSlots.has(slot)) actions.push({ kind: 'cancelled_occurrence', clientId, seriesId, base, session: ref(s) });
      continue;                                   // live: present (a move is drift)
    }
    if (liveSlots.has(slot)) continue;
    if (finite && ms > familyEndMs) {
      if (endKnown) ended.push(ref(s));
      continue;
    }
    if (cancelledSlots.has(slot)) {
      actions.push({ kind: 'cancelled_occurrence', clientId, seriesId, base, session: ref(s) });
      continue;
    }
    // Missing from a complete instance list on a date the rule generates:
    // removed in Google. Anything off the rhythm was never Google's (moved in
    // the app, or a write that failed) and stays a difference.
    if (rhythmOk && recurring.some(m => onMasterRhythm(m, rules.get(m.id)!, slot))) {
      actions.push({ kind: 'cancelled_occurrence', clientId, seriesId, base, session: ref(s) });
    }
  }
  if (ended.length) {
    if (seriesId && undone.seriesEnded.has(seriesId)) return { skip: 'ending was undone' };
    actions.push({ kind: 'series_ended', clientId, seriesId, base, how: 'ended', sessions: ended, endSeries: !!series });
  }
  return { actions };
}

// ── Reading Google ─────────────────────────────────────────────────────────

/** Thrown when an instance list doesn't fit the page cap: nothing is known. */
export class FollowIncomplete extends Error {}

function httpStatus(err: unknown): number | null {
  const e = err as { code?: number | string; status?: number; response?: { status?: number } };
  const n = Number(e?.code ?? e?.status ?? e?.response?.status);
  return Number.isFinite(n) ? n : null;
}

function toMaster(id: string, e: EventLike): GMaster {
  const dt = e.start?.dateTime ?? null;
  return {
    id,
    state: e.status === 'cancelled' ? 'cancelled' : 'live',
    recurrence: e.recurrence?.length ? e.recurrence : null,
    startLocal: dt ? slotOfIso(dt) : null,
    allDay: !dt && !!e.start?.date,
    dublinZone: !e.start?.timeZone || DUBLIN_ZONES.has(e.start.timeZone),
  };
}

const DUBLIN_ZONES = new Set(['Europe/Dublin', 'Europe/London']);

/**
 * Read, for each Google family the given sessions are tied to, its events and
 * every occurrence (deleted ones included) from now to the family's latest
 * session. Throws on any Google error or an over-long list: the caller then
 * does nothing.
 */
export async function fetchFamilies(
  cal: CalLike,
  sessions: FollowSession[],
  series: FollowSeries[],
  windowEvents: MappedEvent[],
  now: Date,
): Promise<Map<string, GFamily>> {
  const byBase = new Map<string, FollowSession[]>();
  for (const s of sessions) {
    if (!s.gcal_event_id) continue;
    const b = baseOf(s.gcal_event_id);
    byBase.set(b, [...(byBase.get(b) ?? []), s]);
  }
  const out = new Map<string, GFamily>();
  for (const [base, list] of byBase) {
    const masterIds = new Set<string>([base]);
    for (const s of list) if (!INSTANCE_ID.test(s.gcal_event_id!)) masterIds.add(s.gcal_event_id!);
    for (const r of series) if (r.gcal_event_id && baseOf(r.gcal_event_id) === base) masterIds.add(r.gcal_event_id);
    for (const e of windowEvents) if (e.recurringEventId && baseOf(e.recurringEventId) === base) masterIds.add(e.recurringEventId);

    // A one-off event that the window read already saw live needs no call.
    const seen = windowEvents.find(e => e.id === base && !e.recurringEventId);
    if (masterIds.size === 1 && seen) {
      out.set(base, { base, masters: [{ id: base, state: 'live', recurrence: null, startLocal: seen.allDay ? null : slotOfIso(seen.start), allDay: !!seen.allDay, dublinZone: true }], instances: [] });
      continue;
    }

    const coverUntil = Math.max(...list.map(s => new Date(s.session_date).getTime())) + DAY;
    const masters: GMaster[] = [];
    const instances: GInstance[] = [];
    for (const id of masterIds) {
      let m: GMaster;
      try {
        m = toMaster(id, (await cal.events.get({ calendarId: 'primary', eventId: id })).data);
      } catch (err) {
        const code = httpStatus(err);
        if (code === 410) m = { id, state: 'cancelled', recurrence: null, startLocal: null, allDay: false, dublinZone: true };
        else if (code === 404) {
          // A split-series id we only guessed may simply not exist: harmless.
          // The base or a stored id missing is unknown, so never acted on.
          if (id !== base && !list.some(s => s.gcal_event_id === id) && !series.some(r => r.gcal_event_id === id)) continue;
          m = { id, state: 'unknown', recurrence: null, startLocal: null, allDay: false, dublinZone: true };
        } else throw err;
      }
      masters.push(m);
      if (m.state !== 'live' || !m.recurrence) continue;
      let pageToken: string | undefined;
      for (let page = 0; ; page++) {
        if (page >= INSTANCE_PAGES) throw new FollowIncomplete(`instances of ${id} did not fit`);
        const { data } = await cal.events.instances({
          calendarId: 'primary', eventId: id, showDeleted: true, maxResults: 250, pageToken,
          timeMin: new Date(now.getTime() - DAY).toISOString(),
          timeMax: new Date(coverUntil).toISOString(),
        });
        for (const i of data.items ?? []) {
          if (!i.id) continue;
          const st = i.start?.dateTime ? new Date(i.start.dateTime).getTime() : null;
          const orig = i.originalStartTime?.dateTime ? new Date(i.originalStartTime.dateTime).getTime() : null;
          if (st === null && orig === null) continue;           // all-day or unreadable
          instances.push({ id: i.id, masterId: id, cancelled: i.status === 'cancelled', startMs: st, originalMs: orig });
        }
        pageToken = data.nextPageToken ?? undefined;
        if (!pageToken) break;
      }
    }
    out.set(base, { base, masters, instances });
  }
  return out;
}

// ── Applying ───────────────────────────────────────────────────────────────

export interface NewSessionRow {
  client_id: string;
  session_date: string;
  session_format: string;
  format_confirmed: boolean;
  location: string | null;
  fee: number;
  gcal_event_id: string;
}

export interface NewFollowedChange {
  kind: FollowedKind;
  client_id: string;
  session_id: string | null;
  series_id: string | null;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface FollowedChangeRow extends NewFollowedChange {
  id: string;
  applied_at: string;
  undone_at: string | null;
}

export interface SeriesPatch { interval_weeks?: number; anchor_at?: string; gcal_event_id?: string | null; active?: boolean; ended_at?: string | null }

/** Everything the follow step reads and writes in the database. */
export interface FollowStore {
  /** False until the calendar_followed_changes migration is applied: then
   *  nothing is followed (every change must be recorded to be undoable). */
  ready(): Promise<boolean>;
  loadInput(now: Date): Promise<Omit<FollowInput, 'now' | 'windowEnd' | 'families'> | null>;
  /** scheduled → cancelled; returns the ids actually changed. */
  cancelSessions(ids: string[]): Promise<string[]>;
  /** cancelled → scheduled; returns the ids actually changed (one booked
   *  slot can't hold two live sessions, so a clash just skips that one). */
  restoreSessions(ids: string[]): Promise<string[]>;
  insertSessions(rows: NewSessionRow[]): Promise<SessionRef[]>;
  /** Conditional: applies only when every `expect` field still matches. */
  updateSeries(id: string, patch: SeriesPatch, expect: SeriesPatch): Promise<boolean>;
  recordChange(c: NewFollowedChange, now: Date): Promise<boolean>;
  listChanges(since: Date): Promise<FollowedChangeRow[] | null>;
  /** Marks a change undone if it is recent and not undone yet; returns it. */
  claimUndo(id: string, now: Date): Promise<FollowedChangeRow | null>;
  releaseUndo(id: string): Promise<void>;
}

export interface ApplyResult { applied: number; cancelled: number; added: number; errors: string[] }

export async function applyFollowPlan(
  store: FollowStore,
  plan: FollowPlan,
  now: Date,
  addressFor: (utcIso: string) => string | null = () => null,
): Promise<ApplyResult> {
  const res: ApplyResult = { applied: 0, cancelled: 0, added: 0, errors: [] };
  for (const a of plan.actions) {
    if (a.kind === 'cancelled_occurrence') {
      const done = await store.cancelSessions([a.session.id]);
      if (!done.length) continue;                               // changed meanwhile
      const ok = await store.recordChange({
        kind: a.kind, client_id: a.clientId, session_id: a.session.id, series_id: a.seriesId,
        before: { status: 'scheduled', session_date: a.session.session_date, base: a.base },
        after: { status: 'cancelled', reason: 'deleted_in_google' },
      }, now);
      if (!ok) { await store.restoreSessions(done); res.errors.push('could not record a change; undid it'); break; }
      res.applied++; res.cancelled += done.length;
    } else if (a.kind === 'series_ended') {
      const done = new Set(await store.cancelSessions(a.sessions.map(s => s.id)));
      const ended = a.endSeries && a.seriesId
        ? await store.updateSeries(a.seriesId, { active: false, ended_at: now.toISOString() }, { active: true })
        : false;
      if (!done.size && !ended) continue;
      const sessions = a.sessions.filter(s => done.has(s.id));
      const ok = await store.recordChange({
        kind: a.kind, client_id: a.clientId, session_id: null, series_id: a.seriesId,
        before: { sessions, series_active: ended ? true : null, base: a.base },
        after: { status: 'cancelled', series_active: ended ? false : null, how: a.how },
      }, now);
      if (!ok) {
        await store.restoreSessions([...done]);
        if (ended && a.seriesId) await store.updateSeries(a.seriesId, { active: true, ended_at: null }, { active: false });
        res.errors.push('could not record a change; undid it');
        break;
      }
      res.applied++; res.cancelled += done.size;
    } else {
      const moved = await store.updateSeries(
        a.seriesId,
        { interval_weeks: a.to, anchor_at: a.anchorAfter, gcal_event_id: a.gcalAfter },
        { interval_weeks: a.from, active: true },
      );
      if (!moved) continue;                                     // changed meanwhile
      const done = new Set(await store.cancelSessions(a.cancel.map(s => s.id)));
      const added = a.template && a.add.length
        ? await store.insertSessions(a.add.map(d => ({
            client_id: a.clientId, session_date: d,
            session_format: a.template!.session_format,
            format_confirmed: a.template!.format_confirmed,
            location: a.template!.session_format === 'in_person' ? (addressFor(d) ?? a.template!.location) : a.template!.location,
            fee: a.template!.fee,
            gcal_event_id: a.gcalAfter,
          })))
        : [];
      const ok = await store.recordChange({
        kind: a.kind, client_id: a.clientId, session_id: null, series_id: a.seriesId,
        before: { interval_weeks: a.from, anchor_at: a.anchorBefore, gcal_event_id: a.gcalBefore, cancelled: a.cancel.filter(s => done.has(s.id)), base: a.base },
        after: { interval_weeks: a.to, anchor_at: a.anchorAfter, gcal_event_id: a.gcalAfter, added },
      }, now);
      if (!ok) {
        await store.updateSeries(a.seriesId, { interval_weeks: a.from, anchor_at: a.anchorBefore, gcal_event_id: a.gcalBefore }, { interval_weeks: a.to });
        await store.restoreSessions([...done]);
        await store.cancelSessions(added.map(s => s.id));
        res.errors.push('could not record a change; undid it');
        break;
      }
      res.applied++; res.cancelled += done.size; res.added += added.length;
    }
  }
  return res;
}

export type FollowOutcome =
  | { status: 'skipped'; reason: 'truncated' | 'not_ready' | 'db' | 'google' }
  | { status: 'nothing'; skipped: FollowPlan['skipped'] }
  | { status: 'held'; wouldCancel: number; touched: number }
  | { status: 'applied'; result: ApplyResult };

/**
 * One follow pass, run by the 5-minute calendar job right after it reads the
 * calendar window. `cal` is used only to READ.
 */
export async function followGoogle(opts: {
  cal: CalLike;
  events: MappedEvent[];
  truncated: boolean;
  now: Date;
  windowEnd: Date;
  store: FollowStore;
  /** Tell the practice a run was held back (one per Dublin day). */
  alert: (p: { wouldCancel: number; touched: number; now: Date }) => Promise<void>;
  addressFor?: (utcIso: string) => string | null;
}): Promise<FollowOutcome> {
  const { cal, events, truncated, now, windowEnd, store } = opts;
  if (truncated) return { status: 'skipped', reason: 'truncated' };
  if (!(await store.ready())) return { status: 'skipped', reason: 'not_ready' };
  const loaded = await store.loadInput(now);
  if (!loaded) return { status: 'skipped', reason: 'db' };
  let families: Map<string, GFamily>;
  try {
    families = await fetchFamilies(cal, loaded.sessions, loaded.series, events, now);
  } catch (err) {
    console.error('[followGoogle] Google read failed, nothing followed:', err instanceof Error ? err.message : String(err));
    return { status: 'skipped', reason: 'google' };
  }
  const plan = decideFollowActions({ ...loaded, now, windowEnd, families });
  if (plan.actions.length === 0) return { status: 'nothing', skipped: plan.skipped };
  if (plan.cancelInWindow > MAX_CANCEL_PER_RUN || plan.touched > MAX_TOUCHED_PER_RUN) {
    await opts.alert({ wouldCancel: plan.cancelInWindow, touched: plan.touched, now });
    return { status: 'held', wouldCancel: plan.cancelInWindow, touched: plan.touched };
  }
  return { status: 'applied', result: await applyFollowPlan(store, plan, now, opts.addressFor) };
}

// ── Undo ───────────────────────────────────────────────────────────────────

export interface UndoResult { ok: boolean; message: string }

const refs = (v: unknown): SessionRef[] => (Array.isArray(v) ? v.filter((x): x is SessionRef => !!x && typeof (x as SessionRef).id === 'string') : []);

/** Put back what one followed change did. Never writes to Google. */
export async function undoFollowedChange(store: FollowStore, id: string, now: Date): Promise<UndoResult> {
  const row = await store.claimUndo(id, now);
  if (!row) return { ok: false, message: `That change was already undone, or is more than ${UNDO_DAYS} days old.` };
  const b = row.before ?? {};
  const a = row.after ?? {};
  if (row.kind === 'cancelled_occurrence') {
    const back = row.session_id ? await store.restoreSessions([row.session_id]) : [];
    if (!back.length) {
      await store.releaseUndo(id);
      return { ok: false, message: 'Couldn’t bring it back: that session has changed since, or another session is booked at that time.' };
    }
    return { ok: true, message: 'Brought back in the app. Google still shows it as deleted — re-add it there or it will show as a difference.' };
  }
  if (row.kind === 'series_ended') {
    const ids = refs(b.sessions).map(s => s.id);
    const back = await store.restoreSessions(ids);
    if (b.series_active === true && row.series_id) await store.updateSeries(row.series_id, { active: true, ended_at: null }, { active: false });
    const missed = ids.length - back.length;
    return {
      ok: true,
      message: `Brought back ${back.length} session${back.length === 1 ? '' : 's'}${missed ? ` (${missed} had changed since, so were left alone)` : ''}. Google still shows the series as deleted — re-add it there or they will show as differences.`,
    };
  }
  // interval_changed
  if (row.series_id) {
    await store.updateSeries(
      row.series_id,
      { interval_weeks: Number(b.interval_weeks), anchor_at: String(b.anchor_at), gcal_event_id: (b.gcal_event_id as string | null) ?? null },
      { interval_weeks: Number(a.interval_weeks) },
    );
  }
  await store.restoreSessions(refs(b.cancelled).map(s => s.id));
  await store.cancelSessions(refs(a.added).map(s => s.id));
  return { ok: true, message: 'Back to how it was in the app. Google still shows the new repeat — change it back there or it will show as differences.' };
}

/** Undone changes as the decision's "never follow again" marks. */
export function undoneMarks(rows: Pick<FollowedChangeRow, 'kind' | 'session_id' | 'series_id' | 'before' | 'after' | 'undone_at'>[]): UndoneMarks {
  const m: UndoneMarks = { sessionIds: new Set(), seriesIntervals: new Set(), seriesEnded: new Set() };
  for (const r of rows) {
    if (!r.undone_at) continue;
    if (r.session_id) m.sessionIds.add(r.session_id);
    if (r.kind === 'series_ended') {
      for (const s of refs(r.before?.sessions)) m.sessionIds.add(s.id);
      if (r.series_id) m.seriesEnded.add(r.series_id);
    }
    if (r.kind === 'interval_changed' && r.series_id) {
      m.seriesIntervals.add(`${r.series_id}:${Number(r.after?.interval_weeks)}`);
      for (const s of refs(r.before?.cancelled)) m.sessionIds.add(s.id);
    }
  }
  return m;
}

// ── Dashboard list ─────────────────────────────────────────────────────────

export interface FollowedItem {
  id: string;
  kind: FollowedKind;
  /** "Aoife E." */
  label: string;
  /** Plain-English line, e.g. "Cancelled Aoife E.'s Tue 2 Dec, 4:00pm session — deleted in Google". */
  line: string;
  appliedAt: string;
  undone: boolean;
  canUndo: boolean;
}

const freqWords = (n: number) => (n === 1 ? 'weekly' : `every ${n} weeks`);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** One plain line per change. No money, no full names. */
export function followedLine(row: Pick<FollowedChangeRow, 'kind' | 'before' | 'after'>, label: string): string {
  const b = row.before ?? {};
  const a = row.after ?? {};
  if (row.kind === 'cancelled_occurrence') {
    const when = typeof b.session_date === 'string' ? formatShortWhen(b.session_date) : 'a';
    return `Cancelled ${label}’s ${when} session — deleted in Google`;
  }
  if (row.kind === 'series_ended') {
    const list = refs(b.sessions).sort((x, y) => x.session_date.localeCompare(y.session_date));
    const why = a.how === 'ended' ? 'the repeat ends in Google' : 'the series was deleted in Google';
    if (!list.length) return `Ended ${label}’s repeating sessions — ${why}`;
    return `Cancelled ${label}’s ${plural(list.length, 'session')} from ${formatShortWhen(list[0].session_date)} — ${why}`;
  }
  const cancelled = refs(b.cancelled).length;
  const added = refs(a.added).length;
  const extra = [cancelled ? `cancelled ${plural(cancelled, 'session')} that no longer fit` : '', added ? `added ${plural(added, 'session')}` : '']
    .filter(Boolean).join(', ');
  return `${label} now ${freqWords(Number(a.interval_weeks))} (was ${freqWords(Number(b.interval_weeks))}) — changed in Google${extra ? `; ${extra}` : ''}`;
}

export function toFollowedItems(rows: FollowedChangeRow[], labelOf: (clientId: string) => string, now: Date): FollowedItem[] {
  const limit = now.getTime() - UNDO_DAYS * DAY;
  return rows
    .filter(r => new Date(r.applied_at).getTime() >= limit)
    .sort((x, y) => y.applied_at.localeCompare(x.applied_at))
    .map(r => {
      const label = labelOf(r.client_id);
      return { id: r.id, kind: r.kind, label, line: followedLine(r, label), appliedAt: r.applied_at, undone: !!r.undone_at, canUndo: !r.undone_at };
    });
}

/**
 * Differences the dashboard should NOT list because a followed change already
 * covers them: a session the app just cancelled or added to follow Google, and
 * Google-only occurrences of a series whose repeat was just followed.
 */
export function hideFollowedDrift(items: DriftItem[], changes: Pick<FollowedChangeRow, 'kind' | 'session_id' | 'before' | 'after' | 'undone_at'>[]): DriftItem[] {
  const sessionIds = new Set<string>();
  const bases = new Set<string>();
  for (const c of changes) {
    if (c.undone_at) continue;
    if (c.session_id) sessionIds.add(c.session_id);
    for (const s of [...refs(c.before?.sessions), ...refs(c.before?.cancelled), ...refs(c.after?.added)]) sessionIds.add(s.id);
    if (c.kind === 'interval_changed' && typeof c.before?.base === 'string') bases.add(c.before.base);
  }
  if (!sessionIds.size && !bases.size) return items;
  return items.filter(i => {
    if (i.sessionId && sessionIds.has(i.sessionId)) return false;
    if (i.kind === 'only_in_google' && i.eventId && bases.has(baseOf(i.eventId))) return false;
    return true;
  });
}
