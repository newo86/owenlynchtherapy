import { localDublinToUtcIso, utcToDublinLocal, formatShortDay } from '@/lib/dateUtils';
import { normaliseLocalDateTime, addMinutesLocal } from '@/lib/googleOAuth';
import { parseRrule, isPlainWeekly } from '@/lib/followGoogle';
import type { CalLike, EventLike } from '@/lib/googleSessionEvents';
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
  parts.push('Google Calendar will be updated. Your client isn’t emailed.');
  return parts.join(' ');
}
