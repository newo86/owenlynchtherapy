import { google } from 'googleapis';
import { getAuthorizedClient, normaliseLocalDateTime, addMinutesLocal } from '@/lib/googleOAuth';
import { localDublinToUtcIso, utcToDublinLocal } from '@/lib/dateUtils';

/**
 * Writing ONE session to Google Calendar.
 *
 * Before Nov 2026 the app acted on a session's stored event id as given. For a
 * session booked as a repeating series that id names the WHOLE series, so
 * moving or removing one session in the app moved or deleted every session in
 * the series in Google. Everything here acts on the single occurrence: a
 * series id is resolved to that slot's instance first, and an instance id is
 * used as it is.
 */

const TZ = 'Europe/Dublin';
const CAL = 'primary';
// `<id>_20261124T190000Z`: a single occurrence. A split-series master is
// `<id>_R20261030T180000` (an `R` after the underscore), so it doesn't match.
const INSTANCE_ID = /_\d{8}T\d{6}Z?$/;

interface EventTime { dateTime?: string | null; date?: string | null }
export interface EventLike {
  id?: string | null;
  status?: string | null;
  recurrence?: string[] | null;
  start?: EventTime | null;
  originalStartTime?: EventTime | null;
}

/** The slice of the Google Calendar client used here, so tests can fake it. */
export interface CalLike {
  events: {
    get(p: { calendarId: string; eventId: string }): Promise<{ data: EventLike }>;
    instances(p: { calendarId: string; eventId: string; timeMin: string; timeMax: string; showDeleted?: boolean; maxResults?: number }):
      Promise<{ data: { items?: EventLike[] | null } }>;
    patch(p: { calendarId: string; eventId: string; requestBody: Record<string, unknown> }): Promise<unknown>;
    delete(p: { calendarId: string; eventId: string }): Promise<unknown>;
    insert(p: { calendarId: string; requestBody: Record<string, unknown> }): Promise<{ data: { id?: string | null } }>;
  };
}

export type GoogleResult =
  | { ok: true; eventId?: string }
  | { ok: false; reason: 'not_connected' | 'not_found' | 'error'; message?: string };

const slotOf = (t?: EventTime | null) => (t?.dateTime ? utcToDublinLocal(new Date(t.dateTime).toISOString()) : null);

function isGone(err: unknown): boolean {
  const e = err as { code?: number | string; status?: number; response?: { status?: number }; message?: string };
  const code = Number(e?.code ?? e?.status ?? e?.response?.status);
  if (code === 404 || code === 410) return true;
  return /\b(404|410)\b|not found|has been deleted/i.test(e?.message ?? '');
}

/**
 * The concrete event to act on for a session: its stored id if that is a
 * single occurrence or a one-off, else (a series id) that slot's occurrence.
 * Null when Google no longer has it.
 */
export async function resolveEventId(cal: CalLike, gid: string, slotLocal: string): Promise<string | null> {
  if (INSTANCE_ID.test(gid)) return gid;
  let master: EventLike;
  try {
    master = (await cal.events.get({ calendarId: CAL, eventId: gid })).data;
  } catch (err) {
    if (isGone(err)) return null;
    throw err;
  }
  if (master.status === 'cancelled') return null;
  if (!master.recurrence?.length) return gid;               // a one-off event
  const centre = new Date(localDublinToUtcIso(slotLocal)).getTime();
  const day = 24 * 3600 * 1000;
  const { data } = await cal.events.instances({
    calendarId: CAL, eventId: gid, showDeleted: false, maxResults: 40,
    timeMin: new Date(centre - 14 * day).toISOString(),
    timeMax: new Date(centre + 14 * day).toISOString(),
  });
  const hit = (data.items ?? []).find(i =>
    i.status !== 'cancelled' && (slotOf(i.originalStartTime) === slotLocal || slotOf(i.start) === slotLocal));
  return hit?.id ?? null;
}

export interface SessionEventFields {
  summary: string;
  description?: string;
  location?: string;
  /** Dublin wall-clock "YYYY-MM-DDTHH:MM". */
  startLocal: string;
  minutes: number;
}

function times(startLocal: string, minutes: number) {
  const start = normaliseLocalDateTime(startLocal);
  return { start: { dateTime: start, timeZone: TZ }, end: { dateTime: addMinutesLocal(start, minutes), timeZone: TZ } };
}

/** Create a one-off event for one session. Returns its id. */
export async function insertSessionEvent(cal: CalLike, f: SessionEventFields): Promise<string> {
  const { data } = await cal.events.insert({
    calendarId: CAL,
    requestBody: { summary: f.summary, description: f.description, location: f.location, ...times(f.startLocal, f.minutes) },
  });
  if (!data.id) throw new Error('Google returned no event id');
  return data.id;
}

/** Move/rename ONE event (an instance for a series). */
export async function patchEvent(cal: CalLike, eventId: string, f: Partial<SessionEventFields> & { startLocal?: string; minutes?: number }): Promise<void> {
  const body: Record<string, unknown> = {};
  if (f.summary !== undefined) body.summary = f.summary;
  if (f.description !== undefined) body.description = f.description;
  if (f.location !== undefined) body.location = f.location;
  if (f.startLocal) Object.assign(body, times(f.startLocal, f.minutes ?? 50));
  await cal.events.patch({ calendarId: CAL, eventId, requestBody: body });
}

/** Delete ONE event. Already gone counts as done. */
export async function deleteEvent(cal: CalLike, eventId: string): Promise<void> {
  try {
    await cal.events.delete({ calendarId: CAL, eventId });
  } catch (err) {
    if (!isGone(err)) throw err;
  }
}

// ── Whole-operation wrappers (connect, resolve, act, never throw) ───────────

async function withCalendar(fn: (cal: CalLike) => Promise<GoogleResult>): Promise<GoogleResult> {
  const auth = await getAuthorizedClient();
  if (!auth) return { ok: false, reason: 'not_connected' };
  try {
    return await fn(google.calendar({ version: 'v3', auth }) as unknown as CalLike);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[googleSessionEvents] error:', message);
    return { ok: false, reason: 'error', message };
  }
}

/** Move or edit one session's event, found by its stored id and OLD time. */
export function moveSessionEvent(
  session: { gcal_event_id: string | null; session_date: string },
  fields: Partial<SessionEventFields>,
): Promise<GoogleResult> {
  if (!session.gcal_event_id) return Promise.resolve({ ok: false, reason: 'not_found' });
  const gid = session.gcal_event_id;
  return withCalendar(async cal => {
    const id = await resolveEventId(cal, gid, utcToDublinLocal(session.session_date));
    if (!id) return { ok: false, reason: 'not_found' };
    await patchEvent(cal, id, fields);
    return { ok: true, eventId: id };
  });
}

/** Remove one session's event (only that occurrence of a series). */
export function removeSessionEvent(
  session: { gcal_event_id: string | null; session_date: string },
): Promise<GoogleResult> {
  if (!session.gcal_event_id) return Promise.resolve({ ok: true });
  const gid = session.gcal_event_id;
  return withCalendar(async cal => {
    const id = await resolveEventId(cal, gid, utcToDublinLocal(session.session_date));
    if (!id) {
      console.warn('[googleSessionEvents] no Google occurrence found to remove (already gone, or outside the lookup window)');
      return { ok: true };
    }
    await deleteEvent(cal, id);
    return { ok: true, eventId: id };
  });
}

/** Create a one-off event for a session that has none. */
export function addSessionEvent(fields: SessionEventFields): Promise<GoogleResult> {
  return withCalendar(async cal => ({ ok: true, eventId: await insertSessionEvent(cal, fields) }));
}

/** Run several Google operations on one connection (used by the fix tools). */
export async function withGoogle<T>(fn: (cal: CalLike) => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; reason: 'not_connected' | 'error'; message?: string }> {
  const auth = await getAuthorizedClient();
  if (!auth) return { ok: false, reason: 'not_connected' };
  try {
    return { ok: true, value: await fn(google.calendar({ version: 'v3', auth }) as unknown as CalLike) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[googleSessionEvents] error:', message);
    return { ok: false, reason: 'error', message };
  }
}
