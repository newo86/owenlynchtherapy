import { localDublinToUtcIso, utcToDublinLocal, formatShortDay } from '@/lib/dateUtils';
import { normaliseLocalDateTime, addMinutesLocal } from '@/lib/googleOAuth';
import { parseRrule, isPlainWeekly } from '@/lib/followGoogle';
import { resolveEventId, insertSessionEvent, deleteEvent, type CalLike, type EventLike } from '@/lib/googleSessionEvents';
import { sessionEventFields } from '@/lib/calendarFix';
import type { IntervalPlan } from '@/lib/sessionSeries';

/**
 * Changing how often an ongoing client comes, from the app (the client
 * record's "How often"). The app is the source here, so Google is updated to
 * match:
 *   - the old repeating event is ended the day before the change ("this and
 *     following" in Google's terms), which removes every cancelled date from
 *     Google in one edit and keeps past occurrences exactly as they were;
 *   - a new repeating event starts on the first date of the new rhythm.
 *     (If the change starts on the series' very first date, the repeat rule is
 *     edited in place instead.)
 * Editing the rule in place on an older series would rewrite its PAST dates
 * in Google (old weekly sessions vanish, phantom fortnightly ones appear), so
 * it is only done when there is no past to rewrite.
 *
 * Order (changeSeriesInterval): claim the series row (a short lock, so a
 * double tap or the 5-minute job can't act at the same time) → start the new
 * repeat in Google → every database step in one transaction → only then end
 * the old repeat. If the database step fails, the new repeat is deleted (or
 * an in-place rule edit is put back), so Google and the app stay as they were.
 *
 * Nothing here emails anyone.
 */

const CAL = 'primary';
const TZ = 'Europe/Dublin';

export const rruleFor = (weeks: number) => (weeks === 1 ? 'RRULE:FREQ=WEEKLY' : `RRULE:FREQ=WEEKLY;INTERVAL=${weeks}`);
export const freqLabel = (weeks: number) => (weeks === 1 ? 'weekly' : `every ${weeks} weeks`);

const utcStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

/** The recurrence lines with the RRULE ended at `untilMs` (other lines kept). */
export function withUntil(recurrence: string[], untilMs: number): string[] {
  return recurrence.map(r => (/^RRULE:/i.test(r) ? r.replace(/;?(COUNT|UNTIL)=[^;]*/gi, '') + `;UNTIL=${utcStamp(untilMs)}` : r));
}

/** The recurrence lines with the RRULE replaced (EXDATEs kept). */
export function withRule(recurrence: string[], weeks: number): string[] {
  return recurrence.map(r => (/^RRULE:/i.test(r) ? rruleFor(weeks) : r));
}

/** "Weekly · ongoing" in an app-written description → the new rhythm. */
export function relabelDescription(desc: string | null | undefined, weeks: number): string | undefined {
  if (!desc) return desc ?? undefined;
  const label = weeks === 1 ? 'Weekly' : weeks === 2 ? 'Fortnightly' : `Every ${weeks} weeks`;
  return desc.replace(/^(Weekly|Fortnightly|Monthly|Every \d+ weeks) · ongoing$/m, `${label} · ongoing`);
}

export interface Repeat { master: EventLike; id: string; startLocal: string; minutes: number; recurrence: string[] }

/** Read the series' repeating event; refuses anything that isn't a plain,
 *  open-ended weekly / every-N-weeks repeat. */
export async function readRepeat(cal: CalLike, masterId: string): Promise<Repeat | { error: string }> {
  let master: EventLike;
  try {
    master = (await cal.events.get({ calendarId: CAL, eventId: masterId })).data;
  } catch {
    return { error: "Couldn't find this client's repeating event in Google Calendar." };
  }
  if (master.status === 'cancelled') return { error: 'The repeating event has been deleted in Google Calendar.' };
  const start = master.start?.dateTime;
  if (!start || !master.recurrence?.length) return { error: "This client's Google event doesn't repeat." };
  const startLocal = utcToDublinLocal(new Date(start).toISOString());
  const rr = parseRrule(master.recurrence);
  if (!isPlainWeekly(rr, startLocal) || rr.count !== undefined || rr.untilMs !== undefined) {
    return { error: 'The repeat in Google Calendar has an end date or an unusual rule. Change it in Google instead.' };
  }
  const end = master.end?.dateTime;
  const minutes = end ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000) : 50;
  return { master, id: masterId, startLocal, minutes: minutes > 0 ? minutes : 50, recurrence: master.recurrence };
}

/** Step 1 (before the database changes): make Google repeat at the new rhythm
 *  from `fromLocal`. Returns the id the series' sessions should now carry. */
export async function startNewRepeat(cal: CalLike, r: Repeat, fromLocal: string, weeks: number): Promise<{ id: string; inPlace: boolean }> {
  if (r.startLocal === fromLocal) {
    await cal.events.patch({ calendarId: CAL, eventId: r.id, requestBody: { recurrence: withRule(r.recurrence, weeks), description: relabelDescription(r.master.description, weeks) } });
    return { id: r.id, inPlace: true };
  }
  const start = normaliseLocalDateTime(fromLocal);
  const { data } = await cal.events.insert({
    calendarId: CAL,
    requestBody: {
      summary: r.master.summary ?? undefined,
      description: relabelDescription(r.master.description, weeks),
      location: r.master.location ?? undefined,
      start: { dateTime: start, timeZone: TZ },
      end: { dateTime: addMinutesLocal(start, r.minutes), timeZone: TZ },
      recurrence: [rruleFor(weeks)],
    },
  });
  if (!data.id) throw new Error('Google returned no event id');
  return { id: data.id, inPlace: false };
}

/** Step 2 (after the database changes): end the old repeat just before the
 *  new one starts. */
export async function endOldRepeat(cal: CalLike, r: Repeat, fromLocal: string): Promise<void> {
  const fromMs = new Date(localDublinToUtcIso(fromLocal)).getTime();
  await cal.events.patch({ calendarId: CAL, eventId: r.id, requestBody: { recurrence: withUntil(r.recurrence, fromMs - 60_000) } });
}

const listDays = (isos: string[], max = 6) => {
  const days = isos.slice(0, max).map(formatShortDay);
  const more = isos.length - days.length;
  if (more > 0) return `${days.join(', ')} and ${more} more`;
  return days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}` : days.join('');
};

/** The confirm text: exactly what the change does. */
export function describeIntervalPlan(plan: IntervalPlan, weeks: number): string {
  const parts = [`From ${formatShortDay(plan.effectiveFrom)}, ${freqLabel(weeks)}.`];
  if (plan.cancel.length) {
    const n = plan.cancel.length;
    parts.push(`Cancels ${n} session${n === 1 ? '' : 's'}: ${listDays(plan.cancel.map(c => new Date(c.session_date).toISOString()))}.`);
  }
  if (plan.add.length) {
    const n = plan.add.length;
    parts.push(`Adds ${n} session${n === 1 ? '' : 's'}: ${listDays(plan.add)}.`);
  }
  if (plan.moved.length) {
    parts.push(`${plan.moved.length} session${plan.moved.length === 1 ? '' : 's'} you moved by hand stay${plan.moved.length === 1 ? 's' : ''} as ${plan.moved.length === 1 ? 'it is' : 'they are'}.`);
  }
  parts.push('Google Calendar will be updated. Your client won’t be emailed, so let them know yourself.');
  return parts.join(' ');
}

// ── The whole change ────────────────────────────────────────────────────────

/** How long a change may hold the series before the lock lapses by itself. */
export const LOCK_MINUTES = 4;

export interface AddRow { session_date: string; session_format: string; format_confirmed: boolean; location: string | null; fee: number }

/** The database side of a change (Supabase in the route, in memory in tests). */
export interface IntervalDb {
  /** Conditional claim: only if the series still has this rhythm and Google
   *  id, is active, and isn't locked. 'unavailable' = the lock column or the
   *  transaction function doesn't exist yet (migration not applied). */
  claim(seriesId: string, expect: { interval_weeks: number; gcal_event_id: string }, until: Date): Promise<'ok' | 'conflict' | 'unavailable'>;
  release(seriesId: string): Promise<void>;
  /** Every database step in one transaction; also releases the lock. */
  runChange(p: { seriesId: string; interval: number; anchor: string; newGcal: string; cancel: string[]; relink: string[]; adds: AddRow[] }):
    Promise<{ ok: true; added: number } | { ok: false }>;
  setSessionEvent(sessionId: string, gcal: string): Promise<void>;
}

export interface SeriesSessionRow {
  id: string; session_date: string; status: string; gcal_event_id: string | null;
  session_format: string; location: string | null; fee: number; format_confirmed: boolean | null;
}

export type ChangeResult =
  | { ok: true; message: string; calendar: 'ok' | 'failed' }
  | { ok: false; status: number; message: string };

const NOTHING = 'Nothing was changed.';

export async function changeSeriesInterval(
  cal: CalLike | null,
  db: IntervalDb,
  input: {
    series: { id: string; interval_weeks: number; gcal_event_id: string };
    plan: IntervalPlan;
    weeks: number;
    clientName: string;
    upcoming: SeriesSessionRow[];
    now: Date;
    addressFor: (utcIso: string) => string | null;
  },
): Promise<ChangeResult> {
  const { series, plan, weeks, upcoming, now } = input;
  if (!cal) return { ok: false, status: 502, message: `Google Calendar isn’t connected. ${NOTHING} Connect it and try again.` };

  const claim = await db.claim(series.id, { interval_weeks: series.interval_weeks, gcal_event_id: series.gcal_event_id }, new Date(now.getTime() + LOCK_MINUTES * 60_000));
  if (claim === 'conflict') return { ok: false, status: 409, message: 'This changed meanwhile, so nothing was done. Close the record and open it again.' };
  if (claim === 'unavailable') return { ok: false, status: 503, message: `This needs a one-off database update before it can be used. ${NOTHING}` };

  const fromLocal = utcToDublinLocal(plan.effectiveFrom);
  let repeat: Repeat;
  let started: { id: string; inPlace: boolean };
  try {
    const r = await readRepeat(cal, series.gcal_event_id);
    if ('error' in r) { await db.release(series.id); return { ok: false, status: 409, message: `${r.error} ${NOTHING}` }; }
    repeat = r;
    started = await startNewRepeat(cal, repeat, fromLocal, weeks);
  } catch {
    await db.release(series.id);
    return { ok: false, status: 502, message: `Google Calendar didn’t accept the change. ${NOTHING} Try again in a moment.` };
  }

  // The app: all in one transaction.
  const template = upcoming.find(s => plan.keep.some(k => k.id === s.id)) ?? upcoming[0];
  const saved = await db.runChange({
    seriesId: series.id, interval: weeks, anchor: plan.effectiveFrom, newGcal: started.id,
    cancel: plan.cancel.map(c => c.id),
    relink: started.inPlace ? [] : plan.keep.map(k => k.id),
    adds: template ? plan.add.map(d => ({
      session_date: d, session_format: template.session_format, format_confirmed: template.format_confirmed ?? true,
      location: template.session_format === 'in_person' ? (input.addressFor(d) ?? template.location) : template.location,
      fee: template.fee,
    })) : [],
  });
  if (!saved.ok) {
    // Put Google back so both stay as they were.
    try {
      if (started.inPlace) {
        await cal.events.patch({ calendarId: CAL, eventId: repeat.id, requestBody: { recurrence: repeat.recurrence, description: repeat.master.description ?? undefined } });
      } else {
        await deleteEvent(cal, started.id);
      }
    } catch (err) {
      console.error('[seriesInterval] could not put Google back:', err instanceof Error ? err.message : String(err));
    }
    await db.release(series.id);
    return { ok: false, status: 500, message: `Couldn’t save the change in the app, so Google Calendar was put back. ${NOTHING}` };
  }

  // Google again: end the old repeat; sessions moved by hand get their own
  // event first, since their occurrence goes with the old repeat.
  let googleOk = true;
  if (!started.inPlace) {
    try {
      for (const m of plan.moved) {
        if (new Date(m.session_date).getTime() < new Date(plan.effectiveFrom).getTime()) continue;
        const row = upcoming.find(u => u.id === m.id);
        if (!row?.gcal_event_id) continue;
        const old = await resolveEventId(cal, row.gcal_event_id, utcToDublinLocal(row.session_date));
        const one = await insertSessionEvent(cal, sessionEventFields(row, input.clientName));
        await db.setSessionEvent(row.id, one);
        if (old) await deleteEvent(cal, old);
      }
      await endOldRepeat(cal, repeat, fromLocal);
    } catch (err) {
      googleOk = false;
      console.error('[seriesInterval] old repeat not ended:', err instanceof Error ? err.message : String(err));
    }
  }

  const parts = [`Now ${freqLabel(weeks)} from ${formatShortDay(plan.effectiveFrom)}.`];
  if (plan.cancel.length) parts.push(`Cancelled ${plan.cancel.length} session${plan.cancel.length === 1 ? '' : 's'}.`);
  if (saved.added) parts.push(`Added ${saved.added}.`);
  parts.push(googleOk
    ? 'Google Calendar updated.'
    : `Google Calendar still shows the old repeat from ${formatShortDay(plan.effectiveFrom)}: delete those dates in Google (“this and following”).`);
  return { ok: true, message: parts.join(' '), calendar: googleOk ? 'ok' : 'failed' };
}
