import { createHash } from 'node:crypto';
import { matchOneActiveClient, type MappedEvent } from '@/lib/calendarSync';

/** Resend idempotency keys must be 1-256 characters, so ids are hashed. */
export function paymentPromptIdempotencyKey(sessionIds: string[], hourBucket: number): string {
  const digest = createHash('sha256').update([...sessionIds].sort().join(',')).digest('hex');
  return `payprompt:${digest}:${hourBucket}`;
}

const SAFE_LABEL = /^[\p{L}][\p{L}\p{M}'’ -]*(?: \p{L}\.)?$/u;

/** The snapshot's client label. Anything that isn't plain name-shaped (letters,
 *  accents, apostrophe, hyphen, an initial's dot; max 20 chars) becomes
 *  'A client', so a hostile or odd name can't carry text out. */
export function snapshotLabel(label: string): string {
  return label.length <= 20 && SAFE_LABEL.test(label) ? label : 'A client';
}

/** Events that block time and aren't already one of the listed sessions. An
 *  event is dropped only if it IS a live session's event (by id or series id)
 *  or, when unlinked, its title matches a client. Sharing a start time is not
 *  enough: a dentist at 4pm over a 4pm session still shows as busy. */
export function busyBlocks(
  events: MappedEvent[],
  live: Array<{ gcal_event_id: string | null }>,
  clients: Array<{ id: string; full_name: string }>,
): Array<{ start: string; end: string }> {
  const ids = new Set(live.map(s => s.gcal_event_id).filter((x): x is string => Boolean(x)));
  return events
    .filter(e => !e.allDay && !e.free)
    .filter(e => !ids.has(e.id) && !(e.recurringEventId && ids.has(e.recurringEventId)))
    .filter(e => !matchOneActiveClient(e.title ?? '', clients))
    .map(e => ({ start: new Date(e.start).toISOString(), end: new Date(e.end).toISOString() }));
}
