// Pure helpers for the desktop Today page (Sage Diary stage 2). Times are
// Dublin wall-clock, 24-hour, as in the prototype ("15:00", "Fri 4 Dec").
import { utcToDublinLocal } from '@/lib/dateUtils';
import type { FreeSlot, OpeningHours } from './freeSlots';
import type { ClientRow, SessionRow } from './types';
import { dedupeSessions } from './api';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n: number) => String(n).padStart(2, '0');

const parts = (ymd: string) => ymd.split('-').map(Number) as [number, number, number];
export const addDaysYmd = (ymd: string, n: number): string => {
  const [y, m, d] = parts(ymd);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};
const weekdayIndex = (ymd: string) => { const [y, m, d] = parts(ymd); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

/** "Fri 4 Dec" from a Dublin "YYYY-MM-DD…" string. */
export function shortDay(local: string): string {
  const [y, m, d] = parts(local.slice(0, 10));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
/** "Friday 4 December" from a Dublin "YYYY-MM-DD…" string. */
export function longDay(local: string): string {
  const [y, m, d] = parts(local.slice(0, 10));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
}
/** "15:00" for a UTC instant. */
export const clockTime = (iso: string): string => utcToDublinLocal(iso).slice(11, 16);
export const dublinYmd = (iso: string): string => utcToDublinLocal(iso).slice(0, 10);
export const firstName = (full: string): string => full.trim().split(/\s+/)[0] ?? full;

/** How often this client usually comes, from their last two sessions. */
export function cadenceLabel(c: ClientRow): string {
  const dates = dedupeSessions(c.sessions)
    .filter(s => s.status !== 'cancelled')
    .map(s => new Date(s.session_date).getTime())
    .sort((a, b) => b - a);
  // Look at the most recent pair on or before the newest: sessions are booked ahead, so
  // the gap between the two nearest sessions is what the rhythm is.
  if (dates.length < 2) return 'One-off';
  const days = Math.round((dates[0] - dates[1]) / 86_400_000);
  if (days <= 9) return 'Weekly';
  if (days >= 12 && days <= 16) return 'Every 2 wks';
  return `Every ${Math.max(2, Math.round(days / 7))} wks`;
}

const DOTS = ['var(--sd-art-blue)', 'var(--sd-art-yellow)', 'var(--sd-art-dot)'];
/** A steady colour per client (decoration only; the name is always shown). */
export function dotColour(clientId: string): string {
  let h = 0;
  for (const ch of clientId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return DOTS[h % DOTS.length];
}

/** Free slots from today through the next seven days (what "Free this week" shows). */
export function slotsNextWeek(slots: FreeSlot[], todayYmd: string): FreeSlot[] {
  const last = addDaysYmd(todayYmd, 7);
  return slots.filter(s => s.local.slice(0, 10) <= last);
}

export interface ClinicDay {
  ymd: string;
  isToday: boolean;
  /** Time-ordered entries: a booked session or a free slot. */
  items: Array<{ time: string; kind: 'session' | 'free'; name?: string }>;
}

/** The next `count` working days (days named in the opening hours), today first. */
export function clinicDays(
  hours: OpeningHours[],
  all: Array<{ s: SessionRow; c: ClientRow }>,
  slots: FreeSlot[],
  todayYmd: string,
  count = 5,
): ClinicDay[] {
  const open = new Set(hours.map(h => h.dayOfWeek));
  const out: ClinicDay[] = [];
  for (let i = 0; i < 70 && out.length < count; i++) {
    const ymd = addDaysYmd(todayYmd, i);
    if (!open.has(DAY_NAMES[weekdayIndex(ymd)])) continue;
    const items: ClinicDay['items'] = [
      ...all.filter(({ s }) => s.status !== 'cancelled' && dublinYmd(s.session_date) === ymd)
        .map(({ s, c }) => ({ time: clockTime(s.session_date), kind: 'session' as const, name: firstName(c.full_name) })),
      ...slots.filter(f => f.local.slice(0, 10) === ymd)
        .map(f => ({ time: f.local.slice(11, 16), kind: 'free' as const })),
    ].sort((a, b) => a.time.localeCompare(b.time));
    out.push({ ymd, isToday: ymd === todayYmd, items });
  }
  return out;
}

/** "Tue and Fri" from the opening hours, in week order starting Monday. */
export function clinicDaysLabel(hours: OpeningHours[]): string {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const names = order.map(i => DAY_NAMES[i]).filter(n => hours.some(h => h.dayOfWeek === n)).map(n => n.slice(0, 3));
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
