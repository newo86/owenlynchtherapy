// A fake Google Calendar for tests only (never imported by the app).
//
// It keeps events the way Google does: one-off events, repeating "masters"
// with an RRULE on Europe/Dublin wall-clock time, and per-occurrence
// exceptions (moved or deleted). It answers the four calls the app makes
// (list with singleEvents, get, instances, patch/delete/insert) with the same
// shapes and quirks that matter here:
//   - instance ids are `<base>_<UTC stamp>Z`, also for a split series
//     (`<base>_R<stamp>` masters), as seen in production
//   - list and instances leave deleted occurrences out unless showDeleted
//   - get on a deleted event returns it with status 'cancelled'; a purged or
//     unknown id is a 404; deleting twice is a 410
//   - list and instances page by maxResults (or a smaller `pageSize`)
// Plus helpers that act like Owen editing in the Google Calendar app.

import type { CalLike, EventLike } from '@/lib/googleSessionEvents';
import type { CalListLike } from '@/lib/calendarSync';
import { localDublinToUtcIso, utcToDublinLocal } from '@/lib/dateUtils';
import { addDaysLocal } from '@/lib/sessionSeries';
import { parseRrule } from '@/lib/followGoogle';

const TZ = 'Europe/Dublin';
type Time = { dateTime?: string; date?: string; timeZone?: string };

interface StoredEvent {
  id: string;
  status: 'confirmed' | 'cancelled';
  summary: string;
  description?: string;
  location?: string;
  start: Time;
  end: Time;
  recurrence?: string[];
  /** Organiser is someone else (an invitation). */
  foreign?: boolean;
  /** Gone for good: get answers 404. */
  purged?: boolean;
}

interface Exception {
  status: 'confirmed' | 'cancelled';
  start?: Time;
  end?: Time;
  summary?: string;
  location?: string;
}

export interface FakeCall { op: string; eventId?: string; body?: Record<string, unknown> }

const err = (code: number, message: string) => Object.assign(new Error(message), { code });
const utcStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').slice(0, 15);
const baseOf = (id: string) => id.split('_')[0];
const isoOf = (local: string) => localDublinToUtcIso(local);
const localOf = (t: { dateTime?: string | null; date?: string | null }) => (t.dateTime ? utcToDublinLocal(new Date(t.dateTime).toISOString()) : `${t.date}T00:00`);
const minutesBetween = (a: Time, b: Time) =>
  a.dateTime && b.dateTime ? Math.round((new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()) / 60_000) : 0;

/** "YYYY-MM-DDTHH:MM" Dublin → the Google dateTime the API returns (UTC). */
function dt(local: string): Time { return { dateTime: isoOf(local), timeZone: TZ }; }

export interface FakeOptions {
  /** Page size for list/instances (default: whatever maxResults asks for). */
  pageSize?: number;
  /** Every call fails like Google being down. */
  down?: boolean;
}

export class FakeGoogleCalendar {
  private events = new Map<string, StoredEvent>();
  private exceptions = new Map<string, Exception>();           // instance id → exception
  private seq = 0;
  readonly calls: FakeCall[] = [];
  opts: FakeOptions;

  constructor(opts: FakeOptions = {}) { this.opts = opts; }

  // ── Scenario helpers (what Owen does in the Google app) ──────────────────

  private newId(): string {
    // base32hex, like Google: digits and a–v only.
    this.seq += 1;
    return `fake${this.seq.toString(32).padStart(4, '0')}evt`.replace(/[w-z]/g, 'a');
  }

  /** A repeating event, e.g. rrule 'RRULE:FREQ=WEEKLY'. Returns its id. */
  addSeries(p: { summary: string; startLocal: string; rrule: string; minutes?: number; id?: string; timeZone?: string }): string {
    const id = p.id ?? this.newId();
    const end = addMinutes(p.startLocal, p.minutes ?? 50);
    this.events.set(id, {
      id, status: 'confirmed', summary: p.summary,
      start: { ...dt(p.startLocal), timeZone: p.timeZone ?? TZ }, end: { ...dt(end), timeZone: p.timeZone ?? TZ },
      recurrence: [p.rrule],
    });
    return id;
  }

  addOneOff(p: { summary: string; startLocal: string; minutes?: number; foreign?: boolean }): string {
    const id = this.newId();
    this.events.set(id, { id, status: 'confirmed', summary: p.summary, start: dt(p.startLocal), end: dt(addMinutes(p.startLocal, p.minutes ?? 50)), foreign: p.foreign });
    return id;
  }

  addAllDay(p: { summary: string; date: string }): string {
    const id = this.newId();
    const [y, m, d] = p.date.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    this.events.set(id, { id, status: 'confirmed', summary: p.summary, start: { date: p.date }, end: { date: next } });
    return id;
  }

  /** The instance id Google gives the occurrence a series put at `originalLocal`. */
  instanceId(seriesId: string, originalLocal: string): string {
    return `${baseOf(seriesId)}_${utcStamp(new Date(isoOf(originalLocal)).getTime())}Z`;
  }

  /** "Delete this event" on one occurrence. */
  deleteOccurrence(seriesId: string, originalLocal: string): void {
    const iid = this.instanceId(seriesId, originalLocal);
    this.exceptions.set(iid, { ...(this.exceptions.get(iid) ?? {}), status: 'cancelled' });
  }

  /** Drag one occurrence to another time. */
  moveOccurrence(seriesId: string, originalLocal: string, newLocal: string): void {
    const m = this.events.get(seriesId)!;
    const iid = this.instanceId(seriesId, originalLocal);
    this.exceptions.set(iid, { status: 'confirmed', start: dt(newLocal), end: dt(addMinutes(newLocal, minutesBetween(m.start, m.end))) });
  }

  /** "Delete all events" on a series (or delete a one-off). */
  deleteEvent(id: string): void { this.events.get(id)!.status = 'cancelled'; }

  /** The event vanishes completely (get → 404). */
  purge(id: string): void { this.events.get(id)!.purged = true; }

  /** Edit the repeat for "all events" (same first date). */
  setRule(id: string, rrule: string): void { this.events.get(id)!.recurrence = [rrule]; }

  /** "This and following events" with a new repeat rule: the old series ends
   *  the day before, a new `<base>_R<stamp>` series starts at `fromLocal`. */
  splitSeries(id: string, fromLocal: string, rrule: string): string {
    const m = this.events.get(id)!;
    this.endBefore(id, fromLocal);
    const newId = `${baseOf(id)}_R${utcStamp(new Date(isoOf(fromLocal)).getTime())}`;
    const minutes = minutesBetween(m.start, m.end);
    this.events.set(newId, { ...m, id: newId, status: 'confirmed', start: dt(fromLocal), end: dt(addMinutes(fromLocal, minutes)), recurrence: [rrule] });
    return newId;
  }

  /** "Delete this and following events": the series now ends before `fromLocal`. */
  endBefore(id: string, fromLocal: string): void {
    const m = this.events.get(id)!;
    const until = utcStamp(new Date(isoOf(fromLocal)).getTime() - 60_000) + 'Z';
    m.recurrence = (m.recurrence ?? []).map(r => r.startsWith('RRULE:')
      ? r.replace(/;?(COUNT|UNTIL)=[^;]*/g, '') + `;UNTIL=${until}` : r);
  }

  /** Snapshot for assertions: live occurrences (Dublin local) of a series. */
  occurrences(seriesId: string, fromLocal: string, toLocal: string): string[] {
    const from = new Date(isoOf(fromLocal)).getTime();
    const to = new Date(isoOf(toLocal)).getTime();
    return this.expandFamily(seriesId, from, to, false).map(e => localOf(e.start!));
  }

  /** Every master id (live or deleted) in a family. */
  familyIds(base: string): string[] { return [...this.events.keys()].filter(k => baseOf(k) === baseOf(base)); }

  rawEvent(id: string): StoredEvent | undefined { return this.events.get(id); }

  // ── Expansion ────────────────────────────────────────────────────────────

  private expand(m: StoredEvent, fromMs: number, toMs: number, showDeleted: boolean): EventLike[] {
    if (m.status === 'cancelled' && !showDeleted) return [];
    if (!m.recurrence?.length) return [];
    const rr = parseRrule(m.recurrence);
    if (!rr) return [];
    const startLocal = localOf(m.start);
    const minutes = minutesBetween(m.start, m.end);
    const step = rr.freq === 'DAILY' ? rr.interval : 7 * rr.interval;
    const out: EventLike[] = [];
    for (let k = 0; k < 2000; k++) {
      if (rr.count !== undefined && k >= rr.count) break;
      const local = addDaysLocal(startLocal, step * k);
      const ms = new Date(isoOf(local)).getTime();
      if (rr.untilMs !== undefined && ms > rr.untilMs) break;
      if (ms > toMs + 7 * 86_400_000 * 5) break;
      const iid = `${baseOf(m.id)}_${utcStamp(ms)}Z`;
      const ex = this.exceptions.get(iid);
      const status = m.status === 'cancelled' ? 'cancelled' : ex?.status ?? 'confirmed';
      const start = ex?.start ?? dt(local);
      const end = ex?.end ?? dt(addMinutes(local, minutes));
      const sMs = new Date(start.dateTime!).getTime();
      const eMs = new Date(end.dateTime!).getTime();
      if (eMs <= fromMs || sMs >= toMs) continue;
      if (status === 'cancelled' && !showDeleted) continue;
      out.push({
        id: iid, status, summary: ex?.summary ?? m.summary, location: ex?.location ?? m.location,
        recurringEventId: m.id, start, end, originalStartTime: dt(local),
      });
    }
    return out;
  }

  private expandFamily(id: string, fromMs: number, toMs: number, showDeleted: boolean): EventLike[] {
    return this.familyIds(id).flatMap(k => this.expand(this.events.get(k)!, fromMs, toMs, showDeleted));
  }

  private findInstance(iid: string): EventLike | null {
    const base = baseOf(iid);
    const stamp = /_(\d{8}T\d{6})Z$/.exec(iid)?.[1];
    if (!stamp) return null;
    const ms = Date.UTC(+stamp.slice(0, 4), +stamp.slice(4, 6) - 1, +stamp.slice(6, 8), +stamp.slice(9, 11), +stamp.slice(11, 13));
    return this.expandFamily(base, ms - 60 * 86_400_000, ms + 60 * 86_400_000, true).find(e => e.id === iid) ?? null;
  }

  private check(op: string, eventId?: string, body?: Record<string, unknown>) {
    this.calls.push({ op, eventId, body });
    if (this.opts.down) throw err(503, 'Backend Error');
  }

  private page<T>(items: T[], maxResults = 250, pageToken?: string) {
    const size = Math.min(maxResults, this.opts.pageSize ?? maxResults);
    const from = pageToken ? Number(pageToken) : 0;
    const slice = items.slice(from, from + size);
    const next = from + size < items.length ? String(from + size) : null;
    return { items: slice, nextPageToken: next };
  }

  private toApi(e: StoredEvent): EventLike & { organizer?: { self: boolean }; transparency?: string } {
    return {
      id: e.id, status: e.status, summary: e.summary, description: e.description, location: e.location,
      start: e.start, end: e.end, recurrence: e.recurrence, organizer: { self: !e.foreign },
    };
  }

  // ── The API surface ─────────────────────────────────────────────────────

  get api(): CalLike & CalListLike {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      events: {
        async list(p) {
          self.check('list');
          const from = new Date(p.timeMin).getTime();
          const to = new Date(p.timeMax).getTime();
          const all: EventLike[] = [];
          for (const e of self.events.values()) {
            if (e.purged) continue;
            if (e.recurrence?.length) { all.push(...self.expand(e, from, to, false)); continue; }
            if (e.status === 'cancelled') continue;
            const s = e.start.dateTime ? new Date(e.start.dateTime).getTime() : new Date(`${e.start.date}T00:00:00Z`).getTime();
            const en = e.end.dateTime ? new Date(e.end.dateTime).getTime() : new Date(`${e.end.date}T00:00:00Z`).getTime();
            if (en > from && s < to) all.push(self.toApi(e));
          }
          const key = (e: EventLike) => e.start?.dateTime ?? `${e.start?.date}T00:00:00Z`;
          all.sort((a, b) => key(a).localeCompare(key(b)));
          return { data: self.page(all, p.maxResults, p.pageToken) as unknown as { items: never[]; nextPageToken: string | null } };
        },
        async get({ eventId }) {
          self.check('get', eventId);
          const e = self.events.get(eventId);
          if (e && !e.purged) return { data: self.toApi(e) };
          if (!e) {
            const inst = self.findInstance(eventId);
            if (inst) return { data: inst };
          }
          throw err(404, 'Not Found');
        },
        async instances({ eventId, timeMin, timeMax, showDeleted, maxResults, pageToken }) {
          self.check('instances', eventId);
          const e = self.events.get(eventId);
          if (!e || e.purged) throw err(404, 'Not Found');
          const items = self.expand(e, new Date(timeMin).getTime(), new Date(timeMax).getTime(), !!showDeleted);
          return { data: self.page(items, maxResults, pageToken) };
        },
        async patch({ eventId, requestBody }) {
          self.check('patch', eventId, requestBody);
          const e = self.events.get(eventId);
          const b = requestBody as Partial<StoredEvent>;
          if (e) {
            if (e.purged) throw err(404, 'Not Found');
            const { start, end, ...rest } = b;
            Object.assign(e, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
            if (start) e.start = toUtc(start as Time);
            if (end) e.end = toUtc(end as Time);
            return {};
          }
          const inst = self.findInstance(eventId);
          if (!inst) throw err(404, 'Not Found');
          const prev = self.exceptions.get(eventId);
          self.exceptions.set(eventId, {
            status: prev?.status ?? 'confirmed',
            start: b.start ? toUtc(b.start as Time) : prev?.start,
            end: b.end ? toUtc(b.end as Time) : prev?.end,
            summary: (b.summary as string | undefined) ?? prev?.summary,
            location: (b.location as string | undefined) ?? prev?.location,
          });
          return {};
        },
        async delete({ eventId }) {
          self.check('delete', eventId);
          const e = self.events.get(eventId);
          if (e) {
            if (e.purged) throw err(404, 'Not Found');
            if (e.status === 'cancelled') throw err(410, 'Resource has been deleted');
            e.status = 'cancelled';
            return {};
          }
          const inst = self.findInstance(eventId);
          if (!inst) throw err(404, 'Not Found');
          if (inst.status === 'cancelled') throw err(410, 'Resource has been deleted');
          self.exceptions.set(eventId, { ...(self.exceptions.get(eventId) ?? {}), status: 'cancelled' });
          return {};
        },
        async insert({ requestBody }) {
          self.check('insert', undefined, requestBody);
          const b = requestBody as { summary?: string; description?: string; location?: string; start: Time; end: Time; recurrence?: string[] };
          const id = self.newId();
          self.events.set(id, {
            id, status: 'confirmed', summary: b.summary ?? '', description: b.description, location: b.location,
            start: toUtc(b.start), end: toUtc(b.end), recurrence: b.recurrence,
          });
          return { data: { id } };
        },
      },
    };
  }
}

/** The app sends Dublin wall-clock dateTimes; store them as UTC like Google returns. */
function toUtc(t: Time): Time {
  if (!t.dateTime) return t;
  const zoned = /(Z|[+-]\d{2}:?\d{2})$/.test(t.dateTime);
  return { dateTime: zoned ? new Date(t.dateTime).toISOString() : isoOf(t.dateTime), timeZone: t.timeZone ?? TZ };
}

function addMinutes(local: string, minutes: number): string {
  const [d, t] = local.split('T');
  const [y, m, dd] = d.split('-').map(Number);
  const [h, mi] = t.split(':').map(Number);
  const x = new Date(Date.UTC(y, m - 1, dd, h, mi + minutes));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getUTCFullYear()}-${p(x.getUTCMonth() + 1)}-${p(x.getUTCDate())}T${p(x.getUTCHours())}:${p(x.getUTCMinutes())}`;
}
