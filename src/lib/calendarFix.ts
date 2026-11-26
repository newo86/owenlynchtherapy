import { supabaseAdmin } from '@/lib/supabase';
import { utcToDublinLocal } from '@/lib/dateUtils';
import { ONLINE_LOCATION, ONLINE_JOIN_LINE, inPersonAddressFor } from '@/lib/emailTemplates';
import { inferSessionFormat, type MappedEvent } from '@/lib/calendarSync';
import type { DriftItem, DriftKind } from '@/lib/calendarDrift';
import { insertSessionEvent, patchEvent, deleteEvent, type CalLike } from '@/lib/googleSessionEvents';

/**
 * What the practitioner can do with each kind of difference between the app
 * and Google Calendar. The app is the diary: "Use Google's…" choices are the
 * only way Google's version ever reaches the schedule, and only on a tap.
 */
export type FixChoice =
  | 'add_to_google' | 'cancel_in_app'          // not_in_google
  | 'keep_google' | 'reset_google'             // moved_in_google
  | 'remove_from_google' | 'restore_in_app'    // cancelled_still_in_google
  | 'add_to_app';                              // only_in_google (+ remove_from_google)

export const CHOICES: Record<DriftKind, FixChoice[]> = {
  not_in_google: ['add_to_google', 'cancel_in_app'],
  moved_in_google: ['keep_google', 'reset_google'],
  cancelled_still_in_google: ['remove_from_google', 'restore_in_app'],
  only_in_google: ['add_to_app', 'remove_from_google'],
};

export interface FixResult { ok: boolean; message: string }

const SESSION_MINUTES = 50;

interface SessionRow {
  id: string;
  client_id: string;
  session_date: string;
  session_format: string;
  location: string | null;
  fee: number;
  status: string;
  gcal_event_id: string | null;
}

/** Title, notes and place of the Google event for a session. Same shape the
 *  booking routes write (name only: no email in a calendar description). */
export function sessionEventFields(s: Pick<SessionRow, 'session_date' | 'session_format' | 'location' | 'fee'>, clientName: string) {
  const inPerson = s.session_format !== 'online';
  return {
    summary: `Session — ${clientName}`,
    description: [
      `Client: ${clientName}`,
      `Format: ${inPerson ? 'In Person' : 'Online'}`,
      inPerson ? '' : ONLINE_JOIN_LINE,
      `Fee: €${Math.round((s.fee ?? 0) / 100)}`,
    ].filter(Boolean).join('\n'),
    location: s.location ?? (inPerson ? inPersonAddressFor(s.session_date) : ONLINE_LOCATION),
    startLocal: utcToDublinLocal(s.session_date),
    minutes: SESSION_MINUTES,
  };
}

async function loadSession(id?: string): Promise<{ s: SessionRow; name: string } | null> {
  if (!id) return null;
  const { data: s } = await supabaseAdmin
    .from('sessions')
    .select('id, client_id, session_date, session_format, location, fee, status, gcal_event_id')
    .eq('id', id)
    .maybeSingle();
  if (!s) return null;
  const { data: c } = await supabaseAdmin.from('clients').select('full_name').eq('id', s.client_id).maybeSingle();
  return { s: s as SessionRow, name: (c?.full_name as string | undefined) ?? 'Client' };
}

/**
 * Create the Google event for a session that has none and store its id, but
 * only if nothing else linked the session meanwhile (two refreshes at once
 * must not leave two events).
 */
export async function pushSessionToGoogle(cal: CalLike, sessionId: string): Promise<FixResult> {
  const row = await loadSession(sessionId);
  if (!row || row.s.status !== 'scheduled') return { ok: false, message: 'That session has changed, so nothing was added.' };
  const eventId = await insertSessionEvent(cal, sessionEventFields(row.s, row.name));
  let q = supabaseAdmin.from('sessions').update({ gcal_event_id: eventId }).eq('id', row.s.id).eq('status', 'scheduled');
  q = row.s.gcal_event_id ? q.eq('gcal_event_id', row.s.gcal_event_id) : q.is('gcal_event_id', null);
  const { data } = await q.select('id');
  if (!data?.length) {
    await deleteEvent(cal, eventId);                    // lost the race: undo our event
    return { ok: false, message: 'That session changed while adding it, so nothing was added.' };
  }
  return { ok: true, message: 'Added to Google Calendar.' };
}

/** Apply one choice to one difference. `item` comes from a fresh server-side
 *  recomputation (never from the browser), so every id here is trusted. */
export async function applyDriftChoice(cal: CalLike, item: DriftItem, choice: FixChoice): Promise<FixResult> {
  if (!CHOICES[item.kind].includes(choice)) return { ok: false, message: 'That choice does not apply here.' };

  switch (choice) {
    case 'add_to_google':
      return item.sessionId ? pushSessionToGoogle(cal, item.sessionId) : { ok: false, message: 'Session not found.' };

    case 'cancel_in_app': {
      const { data } = await supabaseAdmin.from('sessions').update({ status: 'cancelled' })
        .eq('id', item.sessionId ?? '').eq('status', 'scheduled').select('id');
      return data?.length ? { ok: true, message: 'Cancelled in the app.' } : { ok: false, message: 'That session has changed.' };
    }

    case 'keep_google': {
      if (!item.sessionId || !item.googleStart || !item.eventId) return { ok: false, message: 'Missing details.' };
      const { data } = await supabaseAdmin.from('sessions')
        .update({ session_date: item.googleStart, gcal_event_id: item.eventId })
        .eq('id', item.sessionId).eq('status', 'scheduled').select('id');
      return data?.length ? { ok: true, message: "The app now uses Google's time. Your client hasn't been told about it." } : { ok: false, message: 'That session has changed.' };
    }

    case 'reset_google': {
      const row = await loadSession(item.sessionId);
      if (!row || !item.eventId) return { ok: false, message: 'Session not found.' };
      await patchEvent(cal, item.eventId, { startLocal: utcToDublinLocal(row.s.session_date), minutes: SESSION_MINUTES });
      return { ok: true, message: 'Google Calendar now matches the app.' };
    }

    case 'remove_from_google': {
      if (!item.eventId) return { ok: false, message: 'Missing details.' };
      await deleteEvent(cal, item.eventId);
      return { ok: true, message: 'Removed from Google Calendar.' };
    }

    case 'restore_in_app': {
      if (!item.sessionId || !item.eventId) return { ok: false, message: 'Missing details.' };
      const { data } = await supabaseAdmin.from('sessions')
        .update({ status: 'scheduled', gcal_event_id: item.eventId })
        .eq('id', item.sessionId).eq('status', 'cancelled').select('id');
      return data?.length ? { ok: true, message: 'Brought back in the app.' } : { ok: false, message: 'That session has changed.' };
    }

    case 'add_to_app': {
      if (!item.eventId || !item.googleStart) return { ok: false, message: 'Missing details.' };
      // Never create a second row for a slot the client already has.
      const { data: existing } = await supabaseAdmin.from('sessions').select('id')
        .eq('client_id', item.clientId).eq('session_date', item.googleStart).limit(1);
      if (existing?.length) return { ok: false, message: 'The app already has a session at that time.' };
      const { data: client } = await supabaseAdmin.from('clients').select('session_fee').eq('id', item.clientId).maybeSingle();
      const { data: last } = await supabaseAdmin.from('sessions').select('session_format')
        .eq('client_id', item.clientId).neq('status', 'cancelled').order('session_date', { ascending: false }).limit(1);
      const ev = await cal.events.get({ calendarId: 'primary', eventId: item.eventId });
      const mapped: Pick<MappedEvent, 'title' | 'location'> & { hasVideo: boolean } = {
        title: (ev.data as { summary?: string }).summary ?? item.eventTitle ?? '',
        location: (ev.data as { location?: string }).location,
        hasVideo: Boolean((ev.data as { hangoutLink?: string }).hangoutLink),
      };
      const { format, confirmed } = inferSessionFormat(mapped, (last?.[0]?.session_format as string | undefined) ?? null);
      const { error } = await supabaseAdmin.from('sessions').insert({
        client_id: item.clientId,
        session_date: item.googleStart,
        session_format: format,
        format_confirmed: confirmed,
        location: format === 'online' ? ONLINE_LOCATION : inPersonAddressFor(item.googleStart),
        fee: (client?.session_fee as number | undefined) ?? 0,
        status: 'scheduled',
        payment_status: 'unpaid',
        notes: `Added from Google Calendar: "${mapped.title}"`,
        gcal_event_id: item.eventId,
      });
      if (error) return { ok: false, message: 'Could not add it to the app.' };
      return {
        ok: true,
        message: confirmed ? 'Added to the app.' : 'Added to the app. Check in person / online on it: no reminder goes out until you do.',
      };
    }
  }
}
