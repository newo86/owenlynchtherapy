// Pure helpers for the phone app (Sage Diary stage 3): booking rules, the swipe
// decision, and the sentences Owen reads before a destructive tap. Kept free of
// React so they are unit tested.
import { dedupeSessions } from '../api';
import type { FreeSlot } from '../freeSlots';
import { firstName } from '../desktopToday';
import { formatShortDay } from '@/lib/dateUtils';
import type { ClientRow, SessionRow } from '../types';

export type Repeat = 'once' | 'weekly' | 'biweekly';
/** Labels as in the prototype's Repeats control. */
export const REPEAT_LABEL: Record<Repeat, string> = { once: 'Once', weekly: 'Weekly', biweekly: 'Every 2 wks' };
export const REPEAT_WORDS: Record<Repeat, string> = { once: 'once', weekly: 'every week', biweekly: 'every 2 weeks' };

/** Weekly vs fortnightly, read from the client's two most recent sessions. */
export function usualRepeat(c: ClientRow): Repeat {
  const dates = dedupeSessions(c.sessions)
    .filter(s => s.status !== 'cancelled')
    .map(s => new Date(s.session_date).getTime())
    .sort((a, b) => b - a);
  if (dates.length < 2) return 'weekly';
  const days = Math.round((dates[0] - dates[1]) / 86_400_000);
  return days >= 12 && days <= 16 ? 'biweekly' : 'weekly';
}

export function lastFormat(c: ClientRow): 'in_person' | 'online' {
  const s = dedupeSessions(c.sessions)
    .filter(x => x.status !== 'cancelled')
    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];
  return s?.session_format === 'online' ? 'online' : 'in_person';
}

/** The repeat a free time suggests: free only once books once, free every 2 weeks books fortnightly. */
export function repeatFor(slot: FreeSlot, current: Repeat): Repeat {
  if (slot.cadence === 'once') return 'once';
  if (slot.cadence === 'fortnightly' && current === 'weekly') return 'biweekly';
  return current;
}

/** Never book over something: weekly needs a time free every week, every 2 weeks
 *  needs it free every other week. The same rule the old phone sheet used. */
export function repeatClashes(slot: FreeSlot | undefined, repeat: Repeat): boolean {
  if (!slot) return false;
  return (repeat === 'weekly' && slot.cadence !== 'weekly') || (repeat === 'biweekly' && slot.cadence === 'once');
}

/** Swipe: after a drag of `x` px (negative = left) the row settles open past a third of the actions' width. */
export function settlesOpen(x: number, actionsWidth: number): boolean {
  return x < -actionsWidth / 3;
}
export function clampSwipe(x: number, actionsWidth: number): number {
  return Math.max(-actionsWidth - 20, Math.min(0, x));
}

/** "Cancel Aoife's Tue 2 Dec session? Their other sessions stay." */
export function cancelSentence(client: Pick<ClientRow, 'full_name'>, s: Pick<SessionRow, 'session_date'>): string {
  return `Cancel ${firstName(client.full_name)}’s ${formatShortDay(s.session_date)} session? Their other sessions stay.`;
}

/** The next scheduled session after `from`, for "Next: Fri 4 Dec, 15:00". */
export function nextScheduled(c: ClientRow, from: Date): SessionRow | undefined {
  return dedupeSessions(c.sessions)
    .filter(s => s.status === 'scheduled' && new Date(s.session_date) > from)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[0];
}
