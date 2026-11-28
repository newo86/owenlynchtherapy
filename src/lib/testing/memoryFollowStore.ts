// In-memory stand-in for the sessions / session_series /
// calendar_followed_changes tables, for tests only. Behaves like the
// Supabase store: conditional updates, and one live session per client + time.

import type {
  FollowStore, FollowSession, FollowSeries, FollowedChangeRow, NewFollowedChange, NewSessionRow, SeriesPatch, SessionRef,
} from '@/lib/followGoogle';
import { undoneMarks, cancelledInWindow, UNDO_DAYS } from '@/lib/followGoogle';

export class MemoryFollowStore implements FollowStore {
  sessions: FollowSession[] = [];
  series: FollowSeries[] = [];
  changes: FollowedChangeRow[] = [];
  tableExists = true;
  failRecord = false;
  /** The clock the lock check uses (tests pin it). */
  nowMs = () => Date.now();
  private seq = 0;

  constructor(init: { sessions?: FollowSession[]; series?: FollowSeries[] } = {}) {
    this.sessions = (init.sessions ?? []).map(s => ({ ...s }));
    this.series = (init.series ?? []).map(s => ({ ...s }));
  }

  session(id: string) { return this.sessions.find(s => s.id === id); }
  statusOf(id: string) { return this.session(id)?.status; }

  async ready() { return this.tableExists; }

  async loadInput(now: Date) {
    const nowMs = now.getTime();
    const series = this.series.filter(s => s.active);
    const clientIds = new Set(series.map(s => s.client_id));
    return {
      sessions: this.sessions.filter(s => s.status === 'scheduled' && s.gcal_event_id && new Date(s.session_date).getTime() > nowMs).map(s => ({ ...s })),
      clientSessions: this.sessions.filter(s => clientIds.has(s.client_id) && new Date(s.session_date).getTime() >= nowMs - 4 * 86_400_000).map(s => ({ ...s })),
      series: series.map(s => ({ ...s })),
      undone: undoneMarks(this.changes),
    };
  }

  async cancelledLast24h(now: Date) {
    return cancelledInWindow(this.changes.filter(c => new Date(c.applied_at).getTime() >= now.getTime() - 86_400_000));
  }

  async relinkSessions(moves: { id: string; from: string; to: string }[]) {
    const out: string[] = [];
    for (const mv of moves) {
      const s = this.session(mv.id);
      if (s && s.status === 'scheduled' && s.gcal_event_id === mv.from) { s.gcal_event_id = mv.to; out.push(s.id); }
    }
    return out;
  }

  async cancelSessions(ids: string[]) {
    const out: string[] = [];
    for (const s of this.sessions) if (ids.includes(s.id) && s.status === 'scheduled') { s.status = 'cancelled'; out.push(s.id); }
    return out;
  }

  async restoreSessions(ids: string[]) {
    const out: string[] = [];
    for (const s of this.sessions) {
      if (!ids.includes(s.id) || s.status !== 'cancelled') continue;
      const clash = this.sessions.some(o => o.id !== s.id && o.status !== 'cancelled' && o.client_id === s.client_id
        && new Date(o.session_date).getTime() === new Date(s.session_date).getTime());
      if (clash) continue;
      s.status = 'scheduled';
      out.push(s.id);
    }
    return out;
  }

  async insertSessions(rows: NewSessionRow[]): Promise<SessionRef[]> {
    const out: SessionRef[] = [];
    for (const r of rows) {
      const clash = this.sessions.some(o => o.status !== 'cancelled' && o.client_id === r.client_id
        && new Date(o.session_date).getTime() === new Date(r.session_date).getTime());
      if (clash) continue;
      const id = `added-${++this.seq}`;
      this.sessions.push({ id, status: 'scheduled', ...r });
      out.push({ id, session_date: r.session_date });
    }
    return out;
  }

  async updateSeries(id: string, patch: SeriesPatch, expect: SeriesPatch) {
    const s = this.series.find(x => x.id === id) as (FollowSeries & Record<string, unknown>) | undefined;
    if (!s) return false;
    if (s.change_lock_until && new Date(s.change_lock_until).getTime() > this.nowMs()) return false;
    for (const [k, v] of Object.entries(expect)) if (s[k] !== v) return false;
    Object.assign(s, patch);
    return true;
  }

  async clearIntervalMarks(seriesIds: string[], now: Date) {
    for (const c of this.changes) {
      if (c.kind === 'interval_changed' && c.undone_at && c.series_id && seriesIds.includes(c.series_id)) {
        c.after = { ...c.after, mark_cleared_at: now.toISOString() };
      }
    }
  }

  async recordChange(c: NewFollowedChange, now: Date) {
    if (this.failRecord) return false;
    this.changes.push({ ...c, id: `chg-${++this.seq}`, applied_at: now.toISOString(), undone_at: null });
    return true;
  }

  async listChanges(since: Date) {
    return this.changes.filter(c => new Date(c.applied_at).getTime() >= since.getTime());
  }

  async claimUndo(id: string, now: Date) {
    const c = this.changes.find(x => x.id === id);
    if (!c || c.undone_at) return null;
    if (new Date(c.applied_at).getTime() < now.getTime() - UNDO_DAYS * 86_400_000) return null;
    c.undone_at = now.toISOString();
    return { ...c };
  }

  async releaseUndo(id: string) {
    const c = this.changes.find(x => x.id === id);
    if (c) c.undone_at = null;
  }
}
