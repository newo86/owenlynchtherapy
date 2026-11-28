import { supabaseAdmin } from '@/lib/supabase';
import { utcToDublinLocal } from '@/lib/dateUtils';
import { matchOneActiveClient, type MappedEvent } from '@/lib/calendarSync';
import { hideFollowedDrift } from '@/lib/followGoogle';
import { recentFollowedChanges } from '@/lib/followGoogleStore';

/**
 * Where the app and Google Calendar disagree.
 *
 * The app is the source of truth for the schedule (Nov 2026); Google is a
 * mirror of it. This module only FINDS differences; the practitioner picks
 * what to do with each one (see calendarFix.ts), apart from two automatic
 * paths: a session booked in the app in the last week whose Google write
 * failed is retried, and deletions / repeat changes made in Google to
 * sessions linked by id are followed by src/lib/followGoogle.ts (27 Nov 2026).
 *
 * Pure (no network) so every rule is unit-tested; loadDrift() is the thin
 * database wrapper.
 */

export type DriftKind =
  /** In the app, no matching event in Google. */
  | 'not_in_google'
  /** The event exists but Google has it at a different time. */
  | 'moved_in_google'
  /** Cancelled in the app, but the event is still in Google. */
  | 'cancelled_still_in_google'
  /** Google has an event for a client that the app has no session for. */
  | 'only_in_google';

export interface DriftSession {
  id: string;
  client_id: string;
  session_date: string;           // UTC ISO
  status: string;
  gcal_event_id: string | null;
  created_at: string;
}

export interface DriftClient { id: string; full_name: string }

export interface DriftItem {
  /** Stable id: the fix endpoint recomputes drift and finds the item by this,
   *  so the browser can never name an arbitrary event to change. */
  key: string;
  kind: DriftKind;
  clientId: string;
  clientName: string;
  sessionId?: string;
  /** The concrete Google event (for a repeating series, that one occurrence). */
  eventId?: string;
  eventTitle?: string;
  appStart?: string;              // UTC ISO
  googleStart?: string;           // UTC ISO
  /** not_in_google only: booked in the app in the last week with no Google id,
   *  i.e. a write that failed. The 5-minute job re-pushes these itself. */
  retry?: boolean;
}

/** A session younger than this may still be mid-write to Google: don't flag it.
 *  Longer than any booking request can run (Vercel's function limit), so the
 *  retry job can't race a booking that is still writing its own event. */
export const IN_FLIGHT_MS = 3 * 60_000;
/** A session with no Google id younger than this is a failed push to retry. */
export const RETRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Google ids are base32hex; instance ids add `_<UTC stamp>`, split series
 *  `_R<stamp>`. Everything before the first underscore names the series. */
const baseId = (id: string) => id.split('_')[0];
const slotOf = (iso: string) => utcToDublinLocal(new Date(iso).toISOString());

export function findCalendarDrift(input: {
  sessions: DriftSession[];
  events: MappedEvent[];
  clients: DriftClient[];
  now: Date;
  timeMax: Date;
}): DriftItem[] {
  const { sessions, events, clients, now, timeMax } = input;
  const nowMs = now.getTime();
  const maxMs = timeMax.getTime();
  const nameOf = new Map(clients.map(c => [c.id, c.full_name]));

  // All-day items (birthdays, days off, payment reminders) are never sessions.
  const timed = events.filter(e => !e.allDay);
  const byId = new Map(timed.map(e => [e.id, e]));
  const bySeries = new Map<string, MappedEvent[]>();
  const byClientSlot = new Map<string, MappedEvent[]>();
  const clientOf = new Map<string, string | null>();
  for (const e of timed) {
    const k = baseId(e.recurringEventId ?? e.id);
    bySeries.set(k, [...(bySeries.get(k) ?? []), e]);
    const cid = matchOneActiveClient(e.title ?? '', clients);
    clientOf.set(e.id, cid);
    if (cid) {
      const ck = `${cid}@${slotOf(e.start)}`;
      byClientSlot.set(ck, [...(byClientSlot.get(ck) ?? []), e]);
    }
  }

  const used = new Set<string>();
  const findEvent = (s: DriftSession): MappedEvent | undefined => {
    const slot = slotOf(s.session_date);
    const gid = s.gcal_event_id;
    if (gid) {
      const exact = byId.get(gid);
      if (exact && !used.has(exact.id)) return exact;
      // A series id (or an instance that was deleted): look for this slot's
      // occurrence — by where the series put it, or where it is now.
      const hit = (bySeries.get(baseId(gid)) ?? []).find(e =>
        !used.has(e.id)
        && ((e.originalStart ? slotOf(e.originalStart) : slotOf(e.start)) === slot || slotOf(e.start) === slot));
      if (hit) return hit;
    }
    return (byClientSlot.get(`${s.client_id}@${slot}`) ?? []).find(e => !used.has(e.id));
  };

  const rows = sessions
    .filter(s => {
      const t = new Date(s.session_date).getTime();
      return t >= nowMs && t <= maxMs && nameOf.has(s.client_id);
    })
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

  const items: DriftItem[] = [];
  const push = (it: Omit<DriftItem, 'key' | 'clientName'>) =>
    items.push({ ...it, key: `${it.kind}:${it.sessionId ?? ''}:${it.eventId ?? ''}`, clientName: nameOf.get(it.clientId) ?? '' });

  // 1. Live sessions (anything not cancelled) claim their Google event first.
  const claimedSlots = new Set<string>();
  for (const s of rows.filter(r => r.status !== 'cancelled')) {
    const slot = slotOf(s.session_date);
    const slotKey = `${s.client_id}@${slot}`;
    if (claimedSlots.has(slotKey)) continue;           // twin row of the same session
    claimedSlots.add(slotKey);
    const ev = findEvent(s);
    if (ev) {
      used.add(ev.id);
      if (slotOf(ev.start) !== slot) {
        push({ kind: 'moved_in_google', clientId: s.client_id, sessionId: s.id, eventId: ev.id, eventTitle: ev.title,
          appStart: new Date(s.session_date).toISOString(), googleStart: new Date(ev.start).toISOString() });
      }
      continue;
    }
    if (s.status !== 'scheduled') continue;
    const age = nowMs - new Date(s.created_at).getTime();
    if (!s.gcal_event_id && age < IN_FLIGHT_MS) continue; // write still in flight
    push({ kind: 'not_in_google', clientId: s.client_id, sessionId: s.id, appStart: new Date(s.session_date).toISOString(),
      retry: !s.gcal_event_id && age < RETRY_WINDOW_MS });
  }

  // 2. Cancelled sessions whose event is still on the calendar.
  for (const s of rows.filter(r => r.status === 'cancelled')) {
    if (claimedSlots.has(`${s.client_id}@${slotOf(s.session_date)}`)) continue; // a live twin owns that slot
    const ev = findEvent(s);
    if (!ev) continue;
    used.add(ev.id);
    push({ kind: 'cancelled_still_in_google', clientId: s.client_id, sessionId: s.id, eventId: ev.id, eventTitle: ev.title,
      appStart: new Date(s.session_date).toISOString(), googleStart: new Date(ev.start).toISOString() });
  }

  // 3. Events that name a client but belong to no session. (An invitation from
  //    someone else is never the owner's own session.) Events that name
  //    nobody (a haircut, "Evan session" for someone not yet a client) are not
  //    drift: the dashboard already queues those for linking by hand.
  for (const e of timed) {
    if (used.has(e.id) || e.foreign) continue;
    const t = new Date(e.start).getTime();
    if (t < nowMs || t > maxMs) continue;
    const cid = clientOf.get(e.id);
    if (!cid) continue;
    push({ kind: 'only_in_google', clientId: cid, eventId: e.id, eventTitle: e.title, googleStart: new Date(e.start).toISOString() });
  }

  return items.sort((a, b) =>
    new Date(a.appStart ?? a.googleStart ?? 0).getTime() - new Date(b.appStart ?? b.googleStart ?? 0).getTime());
}

/** Drift for the live database. Null when it can't be judged: a truncated
 *  Google fetch (a missing event must never read as a deletion) or a query
 *  error. Differences already covered by a change the app followed from
 *  Google (src/lib/followGoogle.ts) are left out: the "Followed from Google"
 *  card shows those, with Undo. */
export async function loadDrift(
  events: MappedEvent[],
  truncated: boolean,
  timeMax: Date,
  now: Date = new Date(),
): Promise<DriftItem[] | null> {
  if (truncated) return null;
  const [{ data: sessions, error: sErr }, { data: clients, error: cErr }] = await Promise.all([
    supabaseAdmin
      .from('sessions')
      .select('id, client_id, session_date, status, gcal_event_id, created_at')
      .gte('session_date', now.toISOString())
      .lte('session_date', timeMax.toISOString())
      .in('status', ['scheduled', 'attended', 'no_show', 'cancelled']),
    supabaseAdmin.from('clients').select('id, full_name').eq('status', 'active'),
  ]);
  if (sErr || cErr || !sessions || !clients) return null;
  const items = findCalendarDrift({ sessions: sessions as DriftSession[], events, clients, now, timeMax });
  return hideFollowedDrift(items, await recentFollowedChanges(now));
}
