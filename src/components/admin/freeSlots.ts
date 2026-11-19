import { localDublinToUtcIso, utcToDublinLocal } from '@/lib/dateUtils';

/**
 * Free-time finder for the phone home screen.
 *
 * A slot is free when nothing overlaps it: no non-cancelled session, and no
 * timed Google Calendar event that blocks time (all-day items and events
 * marked "free" in Google don't). Slots start on the hour inside the working
 * hours from Settings, and must finish by closing time.
 *
 * Each free slot also says how it can repeat, looking ahead at the same
 * weekday and time:
 *   - weekly       free the next three weeks too
 *   - fortnightly  free two and four weeks on (the alternate week of an
 *                  existing fortnightly client, the usual way two fortnightly
 *                  clients share one weekly slot)
 *   - once         only this date
 * Weeks past `knownUntil` (where the calendar data stops) are never assumed
 * free, so a slot is only called weekly/fortnightly on evidence.
 */

export type Cadence = 'weekly' | 'fortnightly' | 'once';

export interface FreeSlot {
  /** Dublin wall-clock "YYYY-MM-DDTHH:MM" — what the booking API takes. */
  local: string;
  startMs: number;
  cadence: Cadence;
}

export interface OpeningHours { dayOfWeek: string; opens: string; closes: string }

export interface SlotInputs {
  hours: OpeningHours[];
  sessionMinutes: number;
  sessions: Array<{ session_date: string; status: string }>;
  events: Array<{ start: string; end: string; allDay?: boolean; free?: boolean }>;
  now: Date;
  /** Calendar data is complete up to here. */
  knownUntil: Date;
  /** How many days ahead to list (from today). */
  days: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Add whole days to a Dublin "YYYY-MM-DD" date (calendar arithmetic, DST-proof). */
function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function weekdayOf(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

function makeChecker(input: Omit<SlotInputs, 'hours' | 'days'>) {
  const { sessionMinutes, sessions, events, now, knownUntil } = input;
  const lenMs = sessionMinutes * 60_000;

  const busy: Array<[number, number]> = [];
  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    const t = new Date(s.session_date).getTime();
    busy.push([t, t + lenMs]);
  }
  for (const e of events) {
    if (e.allDay || e.free) continue;
    busy.push([new Date(e.start).getTime(), new Date(e.end).getTime()]);
  }

  const known = knownUntil.getTime();
  const isFree = (local: string): boolean => {
    const start = new Date(localDublinToUtcIso(local)).getTime();
    if (start <= now.getTime() || start + lenMs > known) return false;
    return !busy.some(([b0, b1]) => b0 < start + lenMs && b1 > start);
  };
  /** How a free time can repeat; null when the time itself is taken or past. */
  const cadenceOf = (local: string): Cadence | null => {
    if (!isFree(local)) return null;
    const [ymd, time] = local.split('T');
    const later = (w: number) => isFree(`${addDays(ymd, w * 7)}T${time}`);
    return later(1) && later(2) && later(3) ? 'weekly' : later(2) && later(4) ? 'fortnightly' : 'once';
  };
  return cadenceOf;
}

/**
 * Check any time (e.g. a one-off lunchtime session outside working hours):
 * the cadence it is free at, or null when it clashes or is in the past.
 */
export function checkTime(local: string, input: Omit<SlotInputs, 'hours' | 'days'>): Cadence | null {
  return makeChecker(input)(local);
}

export function findFreeSlots(input: SlotInputs): FreeSlot[] {
  const { hours, sessionMinutes, now, days } = input;
  const cadenceOf = makeChecker(input);

  const today = utcToDublinLocal(now.toISOString()).slice(0, 10);
  const out: FreeSlot[] = [];
  for (let i = 0; i < days; i++) {
    const ymd = addDays(today, i);
    const weekday = weekdayOf(ymd);
    for (const h of hours.filter(x => x.dayOfWeek === weekday)) {
      const open = toMinutes(h.opens);
      const close = toMinutes(h.closes);
      for (let m = Math.ceil(open / 60) * 60; m + sessionMinutes <= close; m += 60) {
        const time = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
        const local = `${ymd}T${time}`;
        const cadence = cadenceOf(local);
        if (!cadence) continue;
        out.push({ local, startMs: new Date(localDublinToUtcIso(local)).getTime(), cadence });
      }
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

export const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: 'Free every week',
  fortnightly: 'Free every 2 weeks',
  once: 'This date only',
};
