import { google, calendar_v3 } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';
import { utcToDublinLocal } from '@/lib/dateUtils';
import { INSIGHT_MATTERS_ADDRESS } from '@/lib/emailTemplates';

// The OAuth2 client instance returned by getAuthorizedClient().
type AuthClient = InstanceType<typeof google.auth.OAuth2>;

const INSIGHT_MATTERS = INSIGHT_MATTERS_ADDRESS;

export interface MappedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  /** Series id when this is an instance of a recurring event. */
  recurringEventId?: string;
  /** For a recurring instance: where the recurrence rule originally placed it.
   *  Differs from `start` when that one occurrence was moved in Google. */
  originalStart?: string;
  /** All-day event (birthdays, reminders, days off) — never a session. */
  allDay?: boolean;
  /** Has a Google Meet / video conference attached. */
  hasVideo?: boolean;
}

export interface ReconcileOutcome {
  events: MappedEvent[];
  imported: number;
  cancelled: number;
  conflictsFixed: number;
}

type ActiveClient = { id: string; full_name: string };

// Words that mark a calendar event as a client session. A bare first name is
// NOT enough: "Walk Kate", "Claire coffee" or "Day off" must never be read as
// a session for a client called Kate / Claire / Ann Day — that is how a
// personal event became a scheduled session and emailed a client a reminder.
const SESSION_WORDS = new Set(['session', 'sessions', 'client']);

/**
 * The single active client a calendar event title refers to, or null when
 * zero or more than one match (ambiguous — never guess). This is the one
 * name-matcher used everywhere a free-text calendar event has to be tied back
 * to a client record (auto-import, auto-cancel, reminder confirmation).
 *
 * A title counts as a client's session when it contains EITHER
 *   - the client's full name ("Session — Jane Durnin", what the app writes), or
 *   - any part of their name plus "session"/"client" ("Philip client").
 * Full-name hits win over part+keyword hits, so two clients sharing a first
 * name don't make an app-created title ambiguous.
 */
export function matchOneActiveClient(title: string, clients: ActiveClient[]): string | null {
  const words = new Set((title ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const hasSessionWord = [...SESSION_WORDS].some(w => words.has(w));
  const fullHits: string[] = [];
  const partHits: string[] = [];
  for (const c of clients) {
    const parts = c.full_name.trim().toLowerCase().split(/\s+/).filter(p => p.length > 2);
    if (parts.length === 0) continue;
    if (parts.length >= 2 && parts.every(p => words.has(p))) fullHits.push(c.id);
    else if (hasSessionWord && parts.some(p => words.has(p))) partHits.push(c.id);
  }
  if (fullHits.length === 1) return fullHits[0];
  if (fullHits.length > 1) return null;
  return partHits.length === 1 ? partHits[0] : null;
}

export interface CalendarPresence {
  /** True when the session corresponds to an event on the calendar in this
   *  window — by exact/series Google id at the same slot, or (for events not
   *  linked by id yet) by matched client name at the same wall-clock slot. */
  has(session: { gcal_event_id?: string | null; client_id: string; session_date: string }): boolean;
}

/**
 * Index a window of calendar events so any session can be checked for "is this
 * actually on the calendar", slot-aware for recurring series. Shared by the
 * sync (to auto-cancel orphaned rows) and the reminder run (to never email a
 * client about a session that has no calendar event) so the two can't disagree.
 */
export function buildCalendarPresence(events: MappedEvent[], clients: ActiveClient[]): CalendarPresence {
  const presentIds = new Set(events.map(e => e.id));
  const presentSeriesSlots = new Set<string>();   // `${seriesId}@${wallclock}`
  const presentClientSlots = new Set<string>();   // `${clientId}@${wallclock}` (name-matched)
  for (const e of events) {
    const slot = utcToDublinLocal(new Date(e.start).toISOString());
    const seriesId = e.recurringEventId ?? e.id;
    presentSeriesSlots.add(`${seriesId}@${slot}`);
    presentSeriesSlots.add(`${e.id}@${slot}`);
    if (e.allDay) continue; // an all-day item is never a client's session
    const cid = matchOneActiveClient(e.title ?? '', clients);
    if (cid) presentClientSlots.add(`${cid}@${slot}`);
  }
  return {
    has(session) {
      const gid = session.gcal_event_id ?? null;
      const slot = utcToDublinLocal(session.session_date);
      if (gid && presentIds.has(gid)) return true;                  // exact instance
      if (gid && presentSeriesSlots.has(`${gid}@${slot}`)) return true; // series occurrence
      if (presentClientSlots.has(`${session.client_id}@${slot}`)) return true; // same client+time
      return false;
    },
  };
}

/**
 * Split sessions into those confirmed on the calendar and "ghosts" (scheduled
 * rows with no matching calendar event). The reminder run emails only the
 * former, so a ghost can never reach a client. Pure and exported so this exact
 * decision is unit-tested.
 */
export function partitionByCalendarPresence<
  T extends { gcal_event_id?: string | null; client_id: string; session_date: string },
>(sessions: T[], presence: CalendarPresence): { onCalendar: T[]; ghosts: T[] } {
  const onCalendar: T[] = [];
  const ghosts: T[] = [];
  for (const s of sessions) (presence.has(s) ? onCalendar : ghosts).push(s);
  return { onCalendar, ghosts };
}

/**
 * Two-way reconciliation between the practice's Google Calendar and the
 * Supabase `sessions` table, over an arbitrary [timeMin, timeMax] window.
 *
 * Google is the source of truth for the schedule. We:
 *   1. conflict-resolve — move a scheduled session to match its GCal time;
 *   2. auto-import — create a session for a name-matched GCal event we don't
 *      track yet (skipping slots that already exist, including cancelled
 *      tombstones, so a deliberately-removed session is never resurrected);
 *   3. auto-cancel — mark a calendar-linked session 'cancelled' once its
 *      Google event no longer exists.
 *
 * The matching is slot-aware so it is correct for recurring series: Google
 * returns recurring events as individual instances (id `<series>_<stamp>`,
 * with `recurringEventId` = the series id), while sessions created in-app are
 * stamped with the SERIES id. A session is considered "still on the calendar"
 * if its stored id matches an instance id, OR its stored (series) id matches a
 * returned instance of that series at the same time, OR — as a fallback — any
 * returned event maps to the same client at the same wall-clock time. Only
 * sessions that carry a gcal_event_id are ever auto-cancelled, so manually
 * added (calendar-free) sessions are left untouched.
 *
 * Read-only toward Google: this never creates, edits or deletes calendar
 * events — it only reads them and updates Supabase.
 */
export async function reconcileCalendar(
  auth: AuthClient,
  timeMin: string,
  timeMax: string,
): Promise<ReconcileOutcome> {
  const calendar = google.calendar({ version: 'v3', auth });

  // Paginate so a busy window is never silently truncated (a missed event
  // would otherwise look like a deletion and wrongly cancel a session).
  const raw: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 6; page++) {
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
      pageToken,
    });
    raw.push(...(data.items ?? []));
    pageToken = data.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  const events: MappedEvent[] = raw
    .filter(e => (e.start?.dateTime || e.start?.date) && (e.end?.dateTime || e.end?.date))
    .map(e => ({
      id: e.id ?? Math.random().toString(36),
      title: e.summary ?? '(untitled)',
      start: (e.start?.dateTime ?? e.start?.date)!,
      end: (e.end?.dateTime ?? e.end?.date)!,
      description: e.description ?? undefined,
      location: e.location ?? undefined,
      htmlLink: e.htmlLink ?? undefined,
      recurringEventId: e.recurringEventId ?? undefined,
      originalStart: e.originalStartTime?.dateTime ?? undefined,
      allDay: !e.start?.dateTime,
      hasVideo: Boolean(e.hangoutLink || e.conferenceData?.entryPoints?.length),
    }));

  const outcome: ReconcileOutcome = { events, imported: 0, cancelled: 0, conflictsFixed: 0 };

  if (events.length > 0) {
    const eventIds = events.map(e => e.id);

    // Sessions already tracked by their exact (instance) gcal_event_id.
    const { data: trackedByIdRows } = await supabaseAdmin
      .from('sessions')
      .select('id, gcal_event_id, session_date, status')
      .in('gcal_event_id', eventIds);
    const trackedByGcalId = new Map<string, { id: string; session_date: string; status: string }>();
    for (const s of (trackedByIdRows ?? [])) {
      if (s.gcal_event_id) trackedByGcalId.set(s.gcal_event_id, s);
    }

    // 1. Conflict resolution (only for instance-tracked scheduled sessions).
    const conflictFixes: Promise<void>[] = [];
    for (const event of events) {
      const tracked = trackedByGcalId.get(event.id);
      if (!tracked || tracked.status !== 'scheduled') continue;
      const gcalUtcIso = new Date(event.start).toISOString();
      if (utcToDublinLocal(gcalUtcIso) !== utcToDublinLocal(tracked.session_date)) {
        conflictFixes.push((async () => {
          await supabaseAdmin.from('sessions').update({ session_date: gcalUtcIso }).eq('id', tracked.id);
          console.log('[calendarSync] conflict-resolved session:', tracked.id, '→', event.start);
        })());
      }
    }
    // 1b. Moved occurrences of a recurring series. Sessions created in-app are
    //     stamped with the SERIES id, so the instance-id pass above never sees
    //     them. When one occurrence is dragged to a new time in Google, the
    //     instance keeps `originalStartTime` = where the series put it. Match on
    //     that and MOVE the session (keeping its format, fee, payment and notes)
    //     instead of letting step 3 cancel it and step 2 re-import a blank,
    //     in-person, unpaid copy.
    const movedInstances = events.filter(e =>
      e.recurringEventId && e.originalStart
      && utcToDublinLocal(new Date(e.originalStart).toISOString()) !== utcToDublinLocal(new Date(e.start).toISOString()),
    );
    if (movedInstances.length > 0) {
      const seriesIds = [...new Set(movedInstances.map(e => e.recurringEventId as string))];
      const { data: seriesRows } = await supabaseAdmin
        .from('sessions')
        .select('id, gcal_event_id, session_date')
        .in('gcal_event_id', seriesIds)
        .eq('status', 'scheduled');
      const moves: Promise<void>[] = [];
      for (const e of movedInstances) {
        const originalSlot = utcToDublinLocal(new Date(e.originalStart as string).toISOString());
        const row = (seriesRows ?? []).find(r =>
          r.gcal_event_id === e.recurringEventId && utcToDublinLocal(r.session_date as string) === originalSlot);
        if (!row) continue;
        const newIso = new Date(e.start).toISOString();
        moves.push((async () => {
          await supabaseAdmin.from('sessions').update({ session_date: newIso }).eq('id', row.id);
          console.log('[calendarSync] moved recurring occurrence:', row.id, '→', e.start);
        })());
      }
      if (moves.length > 0) { await Promise.all(moves); outcome.conflictsFixed += moves.length; }
    }

    // 2. Auto-import name-matched events we don't track yet.
    const { data: activeClients } = await supabaseAdmin
      .from('clients')
      .select('id, full_name, session_fee')
      .eq('status', 'active');
    const clientById = new Map((activeClients ?? []).map(c => [c.id as string, c]));

    // Existing slots (incl. cancelled tombstones, on purpose) so we never
    // double-import or resurrect a deliberately-removed session.
    const { data: windowSessions } = await supabaseAdmin
      .from('sessions')
      .select('client_id, session_date, status, gcal_event_id')
      .gte('session_date', timeMin)
      .lte('session_date', timeMax);
    const existingKeys = new Set(
      (windowSessions ?? []).map(s => `${s.client_id}@${utcToDublinLocal(s.session_date as string)}`),
    );
    const cancelledGcalIds = new Set(
      (windowSessions ?? [])
        .filter(s => s.status === 'cancelled' && s.gcal_event_id)
        .map(s => s.gcal_event_id as string),
    );

    const imports: Promise<void>[] = [];
    for (const event of events) {
      if (trackedByGcalId.has(event.id)) continue;
      if (cancelledGcalIds.has(event.id)) continue;
      if (event.recurringEventId && cancelledGcalIds.has(event.recurringEventId)) continue;
      if (event.allDay) continue; // birthdays, days off, payment reminders — never sessions

      const matchedId = matchOneActiveClient(event.title ?? '', (activeClients ?? []) as ActiveClient[]);
      const mc = matchedId ? clientById.get(matchedId) : undefined;
      if (!mc) continue;
      const key = `${mc.id}@${utcToDublinLocal(new Date(event.start).toISOString())}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      const ev = event;
      imports.push((async () => {
        // Format: a video link on the event means online; otherwise follow the
        // client's most recent session; default in person. (Always defaulting
        // to in-person sent online clients the in-person address.)
        let format: 'online' | 'in_person' = 'in_person';
        if (ev.hasVideo) {
          format = 'online';
        } else {
          const { data: last } = await supabaseAdmin
            .from('sessions')
            .select('session_format')
            .eq('client_id', mc.id)
            .neq('status', 'cancelled')
            .order('session_date', { ascending: false })
            .limit(1);
          if (last?.[0]?.session_format === 'online') format = 'online';
        }
        const { data: newSession } = await supabaseAdmin
          .from('sessions')
          .insert({
            client_id: mc.id,
            session_date: new Date(ev.start).toISOString(),
            session_format: format,
            location: format === 'online' ? null : INSIGHT_MATTERS,
            fee: mc.session_fee ?? 0,
            status: 'scheduled',
            payment_status: 'unpaid',
            notes: `Imported from Google Calendar: "${ev.title}"`,
            gcal_event_id: ev.id,
          })
          .select('id')
          .single();
        if (newSession) console.log('[calendarSync] auto-linked GCal event:', ev.id, '→ session:', newSession.id);
      })());
    }
    if (imports.length > 0) { await Promise.all(imports); outcome.imported = imports.length; }
  }

  // 3. Auto-cancel calendar-linked sessions whose Google event is gone.
  //    Slot-aware (via buildCalendarPresence) so a single deleted occurrence of
  //    a recurring series cancels only that session, and a series-id-tracked
  //    session isn't wrongly nuked.
  const { data: activeClientsForCancel } = await supabaseAdmin
    .from('clients')
    .select('id, full_name')
    .eq('status', 'active');
  const presence = buildCalendarPresence(events, activeClientsForCancel ?? []);

  // Only ever auto-cancel still-SCHEDULED sessions. Attended / no-show rows are
  // historical records — deleting their old Google event must never retro-flip
  // them to cancelled and drop them out of revenue.
  const { data: trackedSessions } = await supabaseAdmin
    .from('sessions')
    .select('id, client_id, gcal_event_id, session_date')
    .gte('session_date', timeMin)
    .lte('session_date', timeMax)
    .not('gcal_event_id', 'is', null)
    .eq('status', 'scheduled');

  const orphaned = (trackedSessions ?? [])
    .filter(s => !presence.has({
      gcal_event_id: s.gcal_event_id as string,
      client_id: s.client_id as string,
      session_date: s.session_date as string,
    }))
    .map(s => s.id);

  if (orphaned.length > 0) {
    await supabaseAdmin.from('sessions').update({ status: 'cancelled' }).in('id', orphaned);
    outcome.cancelled = orphaned.length;
    console.log('[calendarSync] auto-cancelled', orphaned.length, 'session(s) removed from Google Calendar');
  }

  return outcome;
}
