import { google, calendar_v3 } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';
import { utcToDublinLocal } from '@/lib/dateUtils';

// The OAuth2 client instance returned by getAuthorizedClient().
type AuthClient = InstanceType<typeof google.auth.OAuth2>;

const INSIGHT_MATTERS = 'Insight Matters, 106 Capel Street, Dublin, D01 WY40';

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
}

export interface ReconcileOutcome {
  events: MappedEvent[];
  imported: number;
  cancelled: number;
  conflictsFixed: number;
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
    if (conflictFixes.length > 0) { await Promise.all(conflictFixes); outcome.conflictsFixed = conflictFixes.length; }

    // 2. Auto-import name-matched events we don't track yet.
    const { data: activeClients } = await supabaseAdmin
      .from('clients')
      .select('id, full_name, session_fee')
      .eq('status', 'active');

    const matchClients = (title: string) => {
      const words = new Set((title ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
      return (activeClients ?? []).filter(c => {
        const parts = c.full_name.trim().split(/\s+/).filter((p: string) => p.length > 2);
        return parts.some((p: string) => words.has(p.toLowerCase()));
      });
    };

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

      const matches = matchClients(event.title ?? '');
      if (matches.length !== 1) continue;
      const mc = matches[0];
      const key = `${mc.id}@${utcToDublinLocal(new Date(event.start).toISOString())}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      const ev = event;
      imports.push((async () => {
        const { data: newSession } = await supabaseAdmin
          .from('sessions')
          .insert({
            client_id: mc.id,
            session_date: new Date(ev.start).toISOString(),
            session_format: 'in_person',
            location: INSIGHT_MATTERS,
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
  //    Slot-aware so a single deleted occurrence of a recurring series cancels
  //    only that session, and a series-id-tracked session isn't wrongly nuked.
  const presentIds = new Set(events.map(e => e.id));
  const presentSeriesSlots = new Set<string>();   // `${seriesId}@${wallclock}`
  const presentClientSlots = new Set<string>();   // `${clientId}@${wallclock}` (name-matched)

  const { data: activeClientsForCancel } = await supabaseAdmin
    .from('clients')
    .select('id, full_name')
    .eq('status', 'active');
  const matchOne = (title: string): string | null => {
    const words = new Set((title ?? '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    const hits = (activeClientsForCancel ?? []).filter(c => {
      const parts = c.full_name.trim().split(/\s+/).filter((p: string) => p.length > 2);
      return parts.some((p: string) => words.has(p.toLowerCase()));
    });
    return hits.length === 1 ? hits[0].id : null;
  };

  for (const e of events) {
    const slot = utcToDublinLocal(new Date(e.start).toISOString());
    const seriesId = e.recurringEventId ?? e.id;
    presentSeriesSlots.add(`${seriesId}@${slot}`);
    presentSeriesSlots.add(`${e.id}@${slot}`);
    const cid = matchOne(e.title ?? '');
    if (cid) presentClientSlots.add(`${cid}@${slot}`);
  }

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
    .filter(s => {
      const gid = s.gcal_event_id as string;
      const slot = utcToDublinLocal(s.session_date as string);
      if (presentIds.has(gid)) return false;                       // exact instance still there
      if (presentSeriesSlots.has(`${gid}@${slot}`)) return false;  // series occurrence still there
      if (presentClientSlots.has(`${s.client_id}@${slot}`)) return false; // same client+time still there
      return true;                                                 // genuinely gone from Google
    })
    .map(s => s.id);

  if (orphaned.length > 0) {
    await supabaseAdmin.from('sessions').update({ status: 'cancelled' }).in('id', orphaned);
    outcome.cancelled = orphaned.length;
    console.log('[calendarSync] auto-cancelled', orphaned.length, 'session(s) removed from Google Calendar');
  }

  return outcome;
}
