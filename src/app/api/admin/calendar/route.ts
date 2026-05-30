import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { google } from 'googleapis';
import { getAuthorizedClient } from '@/lib/googleOAuth';
import { startOfWeek, utcToDublinLocal } from '@/lib/dateUtils';
import { supabaseAdmin } from '@/lib/supabase';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const client = await getAuthorizedClient();
  if (!client) {
    return NextResponse.json({ connected: false, events: [] }, { headers: noCache });
  }

  // Window: 4 weeks of events centred on (current week + weekOffset). The
  // dashboard can navigate back/forward through weeks; this fetch covers
  // the current view + 3 weeks beyond it in either direction.
  const weekOffset = parseInt(req.nextUrl.searchParams.get('weekOffset') ?? '0', 10) || 0;
  const weeks = Math.max(1, Math.min(12, parseInt(req.nextUrl.searchParams.get('weeks') ?? '4', 10) || 4));

  const viewStart = startOfWeek(new Date());
  viewStart.setDate(viewStart.getDate() + weekOffset * 7);
  const timeMin = viewStart.toISOString();
  const end = new Date(viewStart);
  end.setDate(end.getDate() + weeks * 7);
  const timeMax = end.toISOString();

  try {
    const calendar = google.calendar({ version: 'v3', auth: client });
    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const events = (data.items ?? [])
      .filter(e => (e.start?.dateTime || e.start?.date) && (e.end?.dateTime || e.end?.date))
      .map(e => ({
        id: e.id ?? Math.random().toString(36),
        title: e.summary ?? '(untitled)',
        start: (e.start?.dateTime ?? e.start?.date)!,
        end: (e.end?.dateTime ?? e.end?.date)!,
        description: e.description ?? undefined,
        location: e.location ?? undefined,
        htmlLink: e.htmlLink ?? undefined,
      }));

    // ── Two-way sync: conflict resolution + auto-import ─────────────────────
    if (events.length > 0) {
      const eventIds = events.map(e => e.id);

      // Find sessions already tracked by gcal_event_id (any status).
      const { data: trackedByIdRows } = await supabaseAdmin
        .from('sessions')
        .select('id, gcal_event_id, session_date, status')
        .in('gcal_event_id', eventIds);

      const trackedByGcalId = new Map<string, { id: string; session_date: string; status: string }>();
      for (const s of (trackedByIdRows ?? [])) {
        if (s.gcal_event_id) trackedByGcalId.set(s.gcal_event_id, s);
      }

      // Conflict resolution: GCal time is the source of truth for scheduled sessions.
      // We compare Dublin wall-clock strings (not raw UTC ms) to avoid a class of
      // intermittent bugs: GCal can return an event with a "Z" (UTC) suffix for events
      // created directly in Google Calendar that lack an explicit timezone, making the
      // UTC timestamp differ by exactly one BST hour (3600 s) from the correct stored
      // value even though both represent the same Dublin wall-clock time.  Comparing
      // Dublin local strings sidesteps that.  If the Dublin times genuinely differ we
      // still update — this correctly handles real reschedules.
      const conflictFixes: Promise<void>[] = [];
      for (const event of events) {
        const tracked = trackedByGcalId.get(event.id);
        if (!tracked || tracked.status !== 'scheduled') continue;
        // Normalise both sides to UTC ISO then convert to Dublin wall-clock
        const gcalUtcIso = new Date(event.start).toISOString();
        const gcalDublin = utcToDublinLocal(gcalUtcIso);
        const supaDublin = utcToDublinLocal(tracked.session_date);
        if (gcalDublin !== supaDublin) {
          conflictFixes.push((async () => {
            await supabaseAdmin
              .from('sessions')
              .update({ session_date: gcalUtcIso })
              .eq('id', tracked.id);
            console.log('[admin/calendar] conflict-resolved session:', tracked.id, '→', event.start);
          })());
        }
      }
      if (conflictFixes.length > 0) await Promise.all(conflictFixes);

      // Auto-import: GCal events not yet in Supabase, matched by client name.
      // We only auto-link when EXACTLY ONE active client matches, on a
      // whole-word basis (so "Sarah" matches "Session — Sarah" but not
      // "Sarahs birthday", and two clients named Sarah are left for manual
      // linking instead of being guessed wrong).
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

      // Guard against duplicates: build a set of "clientId@dublinWallClock" for
      // every existing non-cancelled session in the window. Recurring events are
      // returned by Google as individual instances (each with its own instance
      // id), but the session rows are stamped with the SERIES id — so matching
      // on gcal_event_id alone misses them and we'd insert a second row per
      // occurrence. Keying on client + wall-clock time catches that.
      const { data: windowSessions } = await supabaseAdmin
        .from('sessions')
        .select('client_id, session_date')
        .gte('session_date', timeMin)
        .lte('session_date', timeMax)
        .neq('status', 'cancelled');
      const existingKeys = new Set(
        (windowSessions ?? []).map(s => `${s.client_id}@${utcToDublinLocal(s.session_date as string)}`),
      );

      const imports: Promise<void>[] = [];
      for (const event of events) {
        if (trackedByGcalId.has(event.id)) continue;

        const matches = matchClients(event.title ?? '');
        if (matches.length !== 1) continue; // 0 = personal/unknown, >1 = ambiguous → leave for manual linking
        const mc = matches[0];
        // Skip if this client already has a session at this time (e.g. a
        // recurring series tracked under its base id, or a manually-added row).
        const key = `${mc.id}@${utcToDublinLocal(new Date(event.start).toISOString())}`;
        if (existingKeys.has(key)) continue;
        existingKeys.add(key); // prevent two events in the same sync colliding too
        const ev = event;
        imports.push((async () => {
          const { data: newSession } = await supabaseAdmin
            .from('sessions')
            .insert({
              client_id: mc.id,
              // GCal dateTime is RFC 3339 with offset; new Date() parses it to UTC
              session_date: new Date(ev.start).toISOString(),
              session_format: 'in_person',
              location: 'Insight Matters, 106 Capel Street, Dublin, D01 WY40',
              fee: mc.session_fee ?? 0,
              status: 'scheduled',
              payment_status: 'unpaid',
              notes: `Imported from Google Calendar: "${ev.title}"`,
              gcal_event_id: ev.id,
            })
            .select('id')
            .single();
          if (newSession) {
            console.log('[admin/calendar] auto-linked GCal event:', ev.id, '→ session:', newSession.id);
          }
        })());
      }
      if (imports.length > 0) await Promise.all(imports);
    }

    // Auto-cancel Supabase sessions whose GCal event was deleted.
    // Only affects sessions that have a gcal_event_id recorded.
    const gcalIds = new Set(events.map(e => e.id));
    const { data: trackedSessions } = await supabaseAdmin
      .from('sessions')
      .select('id, gcal_event_id')
      .gte('session_date', timeMin)
      .lte('session_date', timeMax)
      .not('gcal_event_id', 'is', null)
      .neq('status', 'cancelled');

    if (trackedSessions && trackedSessions.length > 0) {
      const orphaned = trackedSessions
        .filter((s: { id: string; gcal_event_id: string }) => !gcalIds.has(s.gcal_event_id))
        .map((s: { id: string }) => s.id);
      if (orphaned.length > 0) {
        await supabaseAdmin
          .from('sessions')
          .update({ status: 'cancelled' })
          .in('id', orphaned);
        console.log('[admin/calendar] auto-cancelled', orphaned.length, 'session(s) removed from GCal');
      }
    }

    return NextResponse.json({ connected: true, events }, { headers: noCache });
  } catch (err: unknown) {
    console.error('[admin/calendar] error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ connected: true, events: [], error: msg }, { status: 500, headers: noCache });
  }
}
