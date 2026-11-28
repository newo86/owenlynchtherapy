import { supabaseAdmin, dbError } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL } from '@/lib/emailTemplates';
import { SITE_URL } from '@/practice.config';
import {
  undoneMarks, cancelledInWindow, UNDO_DAYS, MAX_CANCEL_PER_RUN, MAX_CANCEL_PER_DAY,
  type FollowStore, type FollowSession, type FollowSeries, type FollowedChangeRow, type NewFollowedChange,
  type NewSessionRow, type SeriesPatch, type SessionRef,
} from '@/lib/followGoogle';

// The production FollowStore (src/lib/followGoogle.ts) on Supabase, plus the
// "held back" alert. Every session write is conditional on the status it
// expects, so a change made in the app meanwhile always wins.

const TABLE = 'calendar_followed_changes';
const COLS = 'id, client_id, session_date, status, gcal_event_id, session_format, location, fee, format_confirmed';
const LIMIT = 2000;
const DAY = 86_400_000;

export const supabaseFollowStore: FollowStore = {
  async ready() {
    const { error } = await supabaseAdmin.from(TABLE).select('id').limit(1);
    if (error) console.warn('[followGoogle] calendar_followed_changes not readable (migration not applied?):', dbError(error).message);
    return !error;
  },

  async loadInput(now) {
    const [{ data: sessions, error: e1 }, { data: series, error: e2 }, { data: changes, error: e3 }] = await Promise.all([
      supabaseAdmin.from('sessions').select(COLS)
        .eq('status', 'scheduled').gt('session_date', now.toISOString()).not('gcal_event_id', 'is', null)
        .order('session_date').limit(LIMIT),
      // '*' so change_lock_until is read once its migration is applied, and
      // nothing breaks before.
      supabaseAdmin.from('session_series').select('*').eq('active', true),
      supabaseAdmin.from(TABLE).select('kind, session_id, series_id, before, after, undone_at')
        .not('undone_at', 'is', null).gte('applied_at', new Date(now.getTime() - 180 * DAY).toISOString()),
    ]);
    // Any read failing → no action (a missing series row would make a series
    // look like a plain repeat).
    if (e1 || e2 || e3 || !sessions || !series || !changes) return null;
    if (sessions.length >= LIMIT) return null;                 // too many to judge safely
    const activeSeries = series as FollowSeries[];
    const clientIds = [...new Set(activeSeries.map(s => s.client_id))];
    let clientSessions: FollowSession[] = [];
    if (clientIds.length) {
      const { data, error } = await supabaseAdmin.from('sessions').select(COLS)
        .in('client_id', clientIds).gte('session_date', new Date(now.getTime() - 4 * DAY).toISOString()).limit(LIMIT * 2);
      if (error || !data || data.length >= LIMIT * 2) return null;
      clientSessions = data as FollowSession[];
    }
    return {
      sessions: sessions as FollowSession[],
      clientSessions,
      series: activeSeries,
      undone: undoneMarks(changes as FollowedChangeRow[]),
    };
  },

  async cancelledLast24h(now) {
    const { data, error } = await supabaseAdmin.from(TABLE).select('kind, before, after, undone_at')
      .gte('applied_at', new Date(now.getTime() - DAY).toISOString()).is('undone_at', null);
    if (error || !data) return null;
    return cancelledInWindow(data as FollowedChangeRow[]);
  },

  async relinkSessions(moves) {
    const out: string[] = [];
    for (const mv of moves) {
      const { data, error } = await supabaseAdmin.from('sessions').update({ gcal_event_id: mv.to })
        .eq('id', mv.id).eq('status', 'scheduled').eq('gcal_event_id', mv.from).select('id');
      if (!error && data?.length) out.push(mv.id);
    }
    return out;
  },

  async cancelSessions(ids) {
    if (!ids.length) return [];
    const { data, error } = await supabaseAdmin.from('sessions').update({ status: 'cancelled' })
      .in('id', ids).eq('status', 'scheduled').select('id');
    if (error) { console.error('[followGoogle] cancel failed:', dbError(error)); return []; }
    return (data ?? []).map(r => r.id as string);
  },

  async restoreSessions(ids) {
    const out: string[] = [];
    // One at a time: a slot that now has another live session (unique index)
    // fails on its own without blocking the rest.
    for (const id of ids) {
      const { data, error } = await supabaseAdmin.from('sessions').update({ status: 'scheduled' })
        .eq('id', id).eq('status', 'cancelled').select('id');
      if (!error && data?.length) out.push(id);
    }
    return out;
  },

  async insertSessions(rows: NewSessionRow[]) {
    const out: SessionRef[] = [];
    for (const r of rows) {
      const { data, error } = await supabaseAdmin.from('sessions')
        .insert({ ...r, status: 'scheduled', payment_status: 'unpaid' }).select('id, session_date');
      if (error || !data?.length) { if (error) console.warn('[followGoogle] add skipped:', dbError(error).message); continue; }
      out.push({ id: data[0].id as string, session_date: new Date(data[0].session_date as string).toISOString() });
    }
    return out;
  },

  async updateSeries(id, patch: SeriesPatch, expect: SeriesPatch) {
    let q = supabaseAdmin.from('session_series').update(patch).eq('id', id);
    for (const [k, v] of Object.entries(expect)) q = v === null ? q.is(k, null) : q.eq(k, v as string | number | boolean);
    const { data, error } = await q.select('id');
    if (error) { console.error('[followGoogle] series update failed:', dbError(error)); return false; }
    return !!data?.length;
  },

  async recordChange(c: NewFollowedChange, now) {
    const { error } = await supabaseAdmin.from(TABLE).insert({ ...c, applied_at: now.toISOString() });
    if (error) console.error('[followGoogle] could not record a change:', dbError(error));
    return !error;
  },

  async listChanges(since) {
    const { data, error } = await supabaseAdmin.from(TABLE).select('*')
      .gte('applied_at', since.toISOString()).order('applied_at', { ascending: false }).limit(100);
    return error ? null : (data as FollowedChangeRow[]);
  },

  async claimUndo(id, now) {
    const { data, error } = await supabaseAdmin.from(TABLE).update({ undone_at: now.toISOString() })
      .eq('id', id).is('undone_at', null).gte('applied_at', new Date(now.getTime() - UNDO_DAYS * DAY).toISOString())
      .select('*');
    if (error || !data?.length) return null;
    return data[0] as FollowedChangeRow;
  },

  async releaseUndo(id) {
    await supabaseAdmin.from(TABLE).update({ undone_at: null }).eq('id', id);
  },
};

/** Recent changes for the drift filter; [] when unreadable (never blocks drift). */
export async function recentFollowedChanges(now: Date): Promise<FollowedChangeRow[]> {
  return (await supabaseFollowStore.listChanges(new Date(now.getTime() - UNDO_DAYS * DAY))) ?? [];
}

/**
 * "Held back" alert to the practice address only (never a client). Through
 * getResend(), so the kill switch applies; at most one per Dublin day via the
 * idempotency key, however many 5-minute runs hit the cap. No names in it.
 */
export async function sendFollowHeldAlert(p: { wouldCancel: number; touched: number; last24h: number; now: Date }): Promise<void> {
  const day = p.now.toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' });
  try {
    const result = await getResend().emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: 'Heads-up: Google Calendar changes held back',
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:560px;">
        <p>Following your latest Google Calendar changes would have cancelled ${p.wouldCancel} session${p.wouldCancel === 1 ? '' : 's'} in the next ten weeks${p.touched > p.wouldCancel ? ` (${p.touched} in all)` : ''}${p.last24h ? `, on top of ${p.last24h} already cancelled this way in the last 24 hours` : ''}. That is more than the safety limit (${MAX_CANCEL_PER_RUN} at once, ${MAX_CANCEL_PER_DAY} a day), so the app changed nothing.</p>
        <p>They are listed on the dashboard under "Google Calendar doesn't match the app", where you can choose for each one: <a href="${SITE_URL}/admin/intake">${SITE_URL.replace('https://', '')}/admin/intake</a></p>
        <p>No client has been emailed.</p>
      </div>`,
    }, { idempotencyKey: `follow-google-held:${day}` });
    const err = result.error as { statusCode?: number | null } | null;
    if (err && err.statusCode !== 409) console.error('[followGoogle] held-back alert was rejected:', JSON.stringify(result.error));
  } catch (err) {
    console.error('[followGoogle] failed to send held-back alert:', err instanceof Error ? err.message : String(err));
  }
}
