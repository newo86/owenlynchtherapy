import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { utcToDublinLocal } from '@/lib/dateUtils';
import { inPersonAddressFor } from '@/lib/emailTemplates';
import { planIntervalChange, type IntervalSession } from '@/lib/sessionSeries';
import { withGoogle, resolveEventId, insertSessionEvent, deleteEvent } from '@/lib/googleSessionEvents';
import { sessionEventFields } from '@/lib/calendarFix';
import { readRepeat, startNewRepeat, endOldRepeat, describeIntervalPlan, freqLabel } from '@/lib/seriesInterval';
import { formatShortDay } from '@/lib/dateUtils';

// Change how often an ongoing client comes (client record → "How often").
//
//   POST { series_id, interval_weeks }               → preview: the exact
//        change in words, nothing saved
//   POST { series_id, interval_weeks, confirm: true } → do it
//
// The app is the source here, so Google is updated to match
// (src/lib/seriesInterval.ts): the old repeating event ends the day before,
// and a new one starts on the first date of the new rhythm. Sessions that no
// longer fit are cancelled in the app; getting more frequent adds the new
// in-between weeks. If Google isn't connected or refuses the change, nothing
// is changed in the app either (otherwise the 5-minute job would see Google's
// old rhythm and follow it straight back). Nothing emails the client.
// Admin session required.

export const dynamic = 'force-dynamic';
const noCache = { 'Cache-Control': 'no-store, no-cache' };
const baseOf = (id: string) => id.split('_')[0];

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { series_id?: unknown; interval_weeks?: unknown; confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const seriesId = typeof body.series_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.series_id) ? body.series_id : null;
  const weeks = Number(body.interval_weeks);
  if (!seriesId || !Number.isInteger(weeks) || weeks < 1 || weeks > 4) {
    return NextResponse.json({ error: 'series_id and interval_weeks (1–4) are required' }, { status: 400 });
  }

  const { data: series } = await supabaseAdmin.from('session_series')
    .select('id, client_id, interval_weeks, gcal_event_id, anchor_at, active').eq('id', seriesId).maybeSingle();
  if (!series || !series.active || !series.gcal_event_id) {
    return NextResponse.json({ ok: false, message: 'This client has no ongoing series to change.' }, { status: 409, headers: noCache });
  }
  const now = new Date();
  const base = baseOf(series.gcal_event_id as string);
  const [{ data: mine, error: e1 }, { data: clientRows, error: e2 }, { data: client }] = await Promise.all([
    supabaseAdmin.from('sessions').select('id, session_date, status, gcal_event_id, session_format, location, fee, format_confirmed')
      .eq('client_id', series.client_id).like('gcal_event_id', `${base}%`)
      .eq('status', 'scheduled').gt('session_date', now.toISOString()).order('session_date').limit(500),
    supabaseAdmin.from('sessions').select('id, session_date')
      .eq('client_id', series.client_id).gte('session_date', new Date(now.getTime() - 4 * 86_400_000).toISOString()).limit(1000),
    supabaseAdmin.from('clients').select('full_name').eq('id', series.client_id).maybeSingle(),
  ]);
  if (e1 || e2 || !mine || !clientRows) {
    return NextResponse.json({ ok: false, message: "Couldn't read the sessions just now. Nothing was changed." }, { status: 503, headers: noCache });
  }
  const upcoming = (mine as (IntervalSession & { session_format: string; location: string | null; fee: number; format_confirmed: boolean | null })[])
    .filter(s => s.gcal_event_id && baseOf(s.gcal_event_id) === base);
  const plan = planIntervalChange(series, upcoming, clientRows, weeks, now);
  if ('error' in plan) return NextResponse.json({ ok: false, message: plan.error }, { status: 409, headers: noCache });

  const summary = describeIntervalPlan(plan, weeks);
  if (body.confirm !== true) {
    return NextResponse.json({ ok: true, preview: true, summary, cancels: plan.cancel.length, adds: plan.add.length }, { headers: noCache });
  }

  const fromLocal = utcToDublinLocal(plan.effectiveFrom);
  const clientName = (client?.full_name as string | undefined) ?? 'Client';

  // 1. Google first: start the new repeat (harmless on its own).
  const started = await withGoogle(async cal => {
    const repeat = await readRepeat(cal, series.gcal_event_id as string);
    if ('error' in repeat) return { error: repeat.error } as const;
    const { id, inPlace } = await startNewRepeat(cal, repeat, fromLocal, weeks);
    return { repeat, id, inPlace } as const;
  });
  if (!started.ok) {
    const message = started.reason === 'not_connected'
      ? 'Google Calendar isn’t connected, so nothing was changed. Connect it and try again.'
      : 'Google Calendar didn’t accept the change, so nothing was changed. Try again in a moment.';
    return NextResponse.json({ ok: false, message }, { status: 502, headers: noCache });
  }
  if ('error' in started.value) return NextResponse.json({ ok: false, message: started.value.error }, { status: 409, headers: noCache });
  const { repeat, id: newId, inPlace } = started.value;

  // 2. The app.
  const problems: string[] = [];
  if (plan.cancel.length) {
    const { error } = await supabaseAdmin.from('sessions').update({ status: 'cancelled' })
      .in('id', plan.cancel.map(c => c.id)).eq('status', 'scheduled');
    if (error) problems.push('cancel');
  }
  if (!inPlace && plan.keep.length) {
    const { error } = await supabaseAdmin.from('sessions').update({ gcal_event_id: newId })
      .in('id', plan.keep.map(k => k.id)).eq('status', 'scheduled');
    if (error) problems.push('relink');
  }
  const template = upcoming.find(s => plan.keep.some(k => k.id === s.id)) ?? upcoming[0];
  let added = 0;
  for (const d of plan.add) {
    const { error } = await supabaseAdmin.from('sessions').insert({
      client_id: series.client_id, session_date: d,
      session_format: template.session_format, format_confirmed: template.format_confirmed ?? true,
      location: template.session_format === 'in_person' ? inPersonAddressFor(d) : template.location,
      fee: template.fee, status: 'scheduled', payment_status: 'unpaid', gcal_event_id: newId,
    });
    if (error) console.warn('[series/interval] add skipped:', dbError(error).message); else added++;
  }
  const { error: sErr } = await supabaseAdmin.from('session_series')
    .update({ interval_weeks: weeks, anchor_at: plan.effectiveFrom, gcal_event_id: newId }).eq('id', series.id);
  if (sErr) problems.push('series');

  // 3. Google again: end the old repeat; give sessions moved by hand their
  //    own event first, since their occurrence goes with the old repeat.
  let googleOk = true;
  if (!inPlace) {
    const ended = await withGoogle(async cal => {
      for (const m of plan.moved) {
        if (new Date(m.session_date).getTime() < new Date(plan.effectiveFrom).getTime()) continue;
        const row = upcoming.find(u => u.id === m.id);
        if (!row?.gcal_event_id) continue;
        const old = await resolveEventId(cal, row.gcal_event_id, utcToDublinLocal(row.session_date));
        const one = await insertSessionEvent(cal, sessionEventFields(row, clientName));
        await supabaseAdmin.from('sessions').update({ gcal_event_id: one }).eq('id', row.id).eq('status', 'scheduled');
        if (old) await deleteEvent(cal, old);
      }
      await endOldRepeat(cal, repeat, fromLocal);
    });
    googleOk = ended.ok;
    if (!ended.ok) console.error('[series/interval] old repeat not ended:', ended.reason, ended.message ?? '');
  }

  if (problems.length) console.error('[series/interval] database steps failed:', problems);
  const parts = [`Now ${freqLabel(weeks)} from ${formatShortDay(plan.effectiveFrom)}.`];
  if (plan.cancel.length) parts.push(`Cancelled ${plan.cancel.length} session${plan.cancel.length === 1 ? '' : 's'}.`);
  if (added) parts.push(`Added ${added}.`);
  parts.push(googleOk
    ? 'Google Calendar updated.'
    : `Google Calendar still shows the old repeat from ${formatShortDay(plan.effectiveFrom)}: delete those in Google ("this and following").`);
  if (problems.length) parts.push('Some sessions may not have changed in the app: check the list.');
  return NextResponse.json({ ok: problems.length === 0, message: parts.join(' '), calendar: googleOk ? 'ok' : 'failed' }, { headers: noCache });
}
