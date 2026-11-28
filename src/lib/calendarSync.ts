import { google, calendar_v3 } from 'googleapis';
import { supabaseAdmin } from '@/lib/supabase';
import { utcToDublinLocal } from '@/lib/dateUtils';

// The OAuth2 client instance returned by getAuthorizedClient().
type AuthClient = InstanceType<typeof google.auth.OAuth2>;


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
  /** Marked "free" (show as available) in Google: doesn't block time. */
  free?: boolean;
  /** An invitation from someone else (the owner is not the organiser). */
  foreign?: boolean;
}

export interface ReconcileOutcome {
  events: MappedEvent[];
  /** The Google fetch hit its page cap: events may be missing, so nothing may
   *  be concluded from an event's absence. */
  truncated: boolean;
  /** Sessions newly tied to the Google event they match (metadata only). */
  linked: number;
}

type ActiveClient = { id: string; full_name: string };

// Words that mark a calendar event as a client session. A bare first name is
// NOT enough: "Walk Orla", "Maeve coffee" or "Day off" must never be read as
// a session for a client called Orla / Maeve / Rosa Day — that is how a
// personal event became a scheduled session and emailed a client a reminder.
const SESSION_WORDS = new Set(['session', 'sessions', 'client']);

/**
 * The single active client a calendar event title refers to, or null when
 * zero or more than one match (ambiguous — never guess). This is the one
 * name-matcher used everywhere a free-text calendar event has to be tied back
 * to a client record (auto-import, auto-cancel, reminder confirmation).
 *
 * A title counts as a client's session when it contains EITHER
 *   - the client's full name ("Session — Nora Invented", what the app writes), or
 *   - any part of their name plus "session"/"client" ("Tom client").
 * Full-name hits win over part+keyword hits, so two clients sharing a first
 * name don't make an app-created title ambiguous.
 */
/**
 * Work out an imported session's format from what the calendar event actually
 * says. Never guesses silently: if the event gives no sign either way, the
 * client's last format is used only as a placeholder and `confirmed` is false,
 * so no reminder goes out until the practitioner sets it (18 Nov 2026: a
 * guessed "online" sent an in-person client the wrong reminder).
 */
export function inferSessionFormat(
  event: { title?: string; location?: string; hasVideo?: boolean },
  lastFormat: string | null,
): { format: 'online' | 'in_person'; confirmed: boolean } {
  if (event.hasVideo) return { format: 'online', confirmed: true };
  const text = `${event.title ?? ''} ${event.location ?? ''}`.toLowerCase();
  if (/\bin[ -]?person\b|capel|insight matters/.test(text)) return { format: 'in_person', confirmed: true };
  if (/\bonline\b|\bvideo\b|google meet|\bzoom\b/.test(text)) return { format: 'online', confirmed: true };
  return { format: lastFormat === 'online' ? 'online' : 'in_person', confirmed: false };
}

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
  const presentSeriesSlots = new Set<string>();   // `${seriesOrEventId}@${wallclock}`
  const presentClientSlots = new Set<string>();   // `${clientId}@${wallclock}` (name-matched)
  for (const e of events) {
    if (e.allDay) continue; // an all-day item is never a client's session
    const slot = utcToDublinLocal(new Date(e.start).toISOString());
    presentSeriesSlots.add(`${(e.recurringEventId ?? e.id).split('_')[0]}@${slot}`);
    presentSeriesSlots.add(`${e.id}@${slot}`);
    const cid = matchOneActiveClient(e.title ?? '', clients);
    if (cid) presentClientSlots.add(`${cid}@${slot}`);
  }
  return {
    has(session) {
      const gid = session.gcal_event_id ?? null;
      const slot = utcToDublinLocal(session.session_date);
      // Slot-strict: the app is the source of truth, so an event Google has at
      // a DIFFERENT time (moved there by hand) must not confirm the app's
      // time. That session is held back from reminders until it is resolved
      // (it shows in the dashboard's "doesn't match Google" list).
      if (gid && presentSeriesSlots.has(`${gid}@${slot}`)) return true;               // exact event / instance
      if (gid && presentSeriesSlots.has(`${gid.split('_')[0]}@${slot}`)) return true; // series occurrence
      if (presentClientSlots.has(`${session.client_id}@${slot}`)) return true;         // same client + time
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

/** A scheduled session row, for deciding whether to tie it to a Google event. */
export interface LinkableSession {
  id: string;
  client_id: string;
  session_date: string;
  gcal_event_id: string | null;
}

export interface LinkPlan {
  link: { id: string; gcal_event_id: string; previous: string | null }[];
}

const INSTANCE_ID = /_\d{8}T\d{6}Z?$/;

/**
 * Which sessions to tie to the Google event they already match.
 *
 * This is bookkeeping, not a schedule change: it stores the event's id on a
 * session whose client and time match an event, so later moves and removals
 * from the app act on the right event. A row counts as already linked when
 * its stored id is an event Google has (or a series with live occurrences). A
 * row with no id, or an id whose event is gone, is linked to a name-matched
 * event at the same client + wall-clock time, if exactly that event is free.
 * Pure so the rule is unit-tested.
 */
export function planLinks(
  sessions: LinkableSession[],
  events: MappedEvent[],
  clients: ActiveClient[],
  now: Date,
): LinkPlan {
  const timed = events.filter(e => !e.allDay);
  const eventIds = new Set(timed.map(e => e.id));
  const seriesBases = new Set(timed.map(e => (e.recurringEventId ?? e.id).split('_')[0]));
  const isLinked = (gid: string | null) =>
    !!gid && (eventIds.has(gid) || (!INSTANCE_ID.test(gid) && seriesBases.has(gid.split('_')[0])));

  const bySlot = new Map<string, string>();            // `${clientId}@${wallclock}` → event id
  for (const e of timed) {
    const cid = matchOneActiveClient(e.title ?? '', clients);
    if (!cid) continue;
    const key = `${cid}@${utcToDublinLocal(new Date(e.start).toISOString())}`;
    if (!bySlot.has(key)) bySlot.set(key, e.id);
  }

  const future = sessions.filter(s => new Date(s.session_date).getTime() >= now.getTime());
  const claimed = new Set<string>();                   // slots already held by a properly linked row
  for (const s of future) if (isLinked(s.gcal_event_id)) claimed.add(`${s.client_id}@${utcToDublinLocal(s.session_date)}`);

  const plan: LinkPlan = { link: [] };
  for (const s of future) {
    if (isLinked(s.gcal_event_id)) continue;
    const key = `${s.client_id}@${utcToDublinLocal(s.session_date)}`;
    const eventId = bySlot.get(key);
    if (!eventId || claimed.has(key)) continue;        // no event, or a twin row already owns the slot
    claimed.add(key);
    plan.link.push({ id: s.id, gcal_event_id: eventId, previous: s.gcal_event_id });
  }
  return plan;
}

/** The one list call the window read needs, so tests can drive it through a
 *  fake calendar (src/lib/testing/fakeGoogleCalendar.ts). */
export interface CalListLike {
  events: {
    list(p: {
      calendarId: string; timeMin: string; timeMax: string; singleEvents: boolean;
      orderBy: string; maxResults: number; pageToken?: string;
    }): Promise<{ data: { items?: calendar_v3.Schema$Event[] | null; nextPageToken?: string | null } }>;
  };
}

/** Read the calendar window. `truncated` means a page cap was hit: events may
 *  be missing, so the caller must not conclude anything from an absence. */
export async function fetchCalendarEvents(
  auth: AuthClient,
  timeMin: string,
  timeMax: string,
): Promise<{ events: MappedEvent[]; truncated: boolean }> {
  return listCalendarEvents(google.calendar({ version: 'v3', auth }) as unknown as CalListLike, timeMin, timeMax);
}

/** fetchCalendarEvents against any calendar client (the real one or a fake). */
export async function listCalendarEvents(
  calendar: CalListLike,
  timeMin: string,
  timeMax: string,
): Promise<{ events: MappedEvent[]; truncated: boolean }> {
  const raw: calendar_v3.Schema$Event[] = [];
  let pageToken: string | undefined;
  let truncated = false;
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
    if (page === 5) truncated = true;
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
      free: e.transparency === 'transparent',
      foreign: e.organizer ? e.organizer.self !== true : false,
    }));
  return { events, truncated };
}

/**
 * Read the practice's Google Calendar over [timeMin, timeMax].
 *
 * The APP is the source of truth for the schedule (Nov 2026); Google mirrors
 * it. This used to make Google the master: every few minutes it imported,
 * cancelled and moved sessions to match whatever Google showed, guessing from
 * event titles, which is why edits in Google "sometimes" appeared. It now
 * never changes a session's date, status or existence. All it does is
 *   - read the events (the week view, free-time finder and reminder check
 *     need them), and
 *   - tie sessions to the events they already match (see planLinks).
 * Differences between the app and Google are reported by calendarDrift.ts for
 * the practitioner to resolve. The one exception (27 Nov 2026) lives outside
 * this function: the 5-minute job then runs src/lib/followGoogle.ts, which
 * follows deletions and repeat changes made in Google to sessions linked BY
 * ID (never by name), with a cap, a record and an undo.
 *
 * Read-only toward Google: nothing here creates, edits or deletes an event.
 */
export async function reconcileCalendar(
  auth: AuthClient,
  timeMin: string,
  timeMax: string,
): Promise<ReconcileOutcome> {
  const { events, truncated } = await fetchCalendarEvents(auth, timeMin, timeMax);
  const outcome: ReconcileOutcome = { events, truncated, linked: 0 };
  if (truncated || events.length === 0) return outcome;

  const now = new Date();
  const from = new Date(timeMin).getTime() > now.getTime() ? timeMin : now.toISOString();
  const [{ data: rows }, { data: clients }] = await Promise.all([
    supabaseAdmin
      .from('sessions')
      .select('id, client_id, session_date, gcal_event_id')
      .gte('session_date', from)
      .lte('session_date', timeMax)
      .eq('status', 'scheduled'),
    supabaseAdmin.from('clients').select('id, full_name').eq('status', 'active'),
  ]);
  if (!rows || !clients) return outcome;

  const plan = planLinks(rows as LinkableSession[], events, clients, now);
  const results = await Promise.all(plan.link.map(async l => {
    let q = supabaseAdmin.from('sessions').update({ gcal_event_id: l.gcal_event_id }).eq('id', l.id).eq('status', 'scheduled');
    q = l.previous ? q.eq('gcal_event_id', l.previous) : q.is('gcal_event_id', null);
    const { data } = await q.select('id');
    return data?.length ?? 0;
  }));
  outcome.linked = results.reduce((a, b) => a + b, 0);
  if (outcome.linked > 0) console.log('[calendarSync] linked', outcome.linked, 'session(s) to their Google event');
  return outcome;
}
