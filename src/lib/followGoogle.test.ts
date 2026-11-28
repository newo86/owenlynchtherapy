import { describe, it, expect } from 'vitest';
import { FakeGoogleCalendar } from './testing/fakeGoogleCalendar';
import { MemoryFollowStore } from './testing/memoryFollowStore';
import {
  followGoogle, undoFollowedChange, parseRrule, hideFollowedDrift, followedLine, toFollowedItems,
  MAX_CANCEL_PER_RUN, type FollowSession, type FollowSeries,
} from './followGoogle';
import { listCalendarEvents } from './calendarSync';
import { findCalendarDrift } from './calendarDrift';
import { resolveEventId, patchEvent, deleteEvent } from './googleSessionEvents';
import { localDublinToUtcIso, utcToDublinLocal } from './dateUtils';
import { addDaysLocal, planExtension, planIntervalChange, type SeriesSession } from './sessionSeries';
import { readRepeat, startNewRepeat, endOldRepeat, describeIntervalPlan, withUntil } from './seriesInterval';

// The calendar test bench: a fake Google Calendar (with Google's id formats,
// deleted-occurrence behaviour and paging) plus an in-memory database, driven
// through the real read → decide → apply code. Made-up clients only.

const NOW = new Date('2026-11-28T12:00:00Z');           // Saturday
const DAY = 86_400_000;
const AOIFE = { id: 'c-aoife', full_name: 'Aoife Example' };
const TEST = { id: 'c-test', full_name: 'Test Client' };
const ORLA = { id: 'c-orla', full_name: 'Orla Sample' };
const CLIENTS = [AOIFE, TEST, ORLA];

let sid = 0;
function session(client_id: string, local: string, gcal_event_id: string | null, over: Partial<FollowSession> = {}): FollowSession {
  return {
    id: `s${++sid}`, client_id, session_date: localDublinToUtcIso(local), status: 'scheduled', gcal_event_id,
    session_format: 'in_person', location: 'Test Rooms', fee: 8000, format_confirmed: true, ...over,
  };
}

/** Book an ongoing series the way the app does: one repeating Google event
 *  (stored as the series id on every row) plus N session rows. */
function book(cal: FakeGoogleCalendar, client: { id: string; full_name: string }, firstLocal: string, weeks: number, count: number, opts: { series?: boolean } = {}) {
  const gid = cal.addSeries({ summary: `Session — ${client.full_name}`, startLocal: firstLocal, rrule: weeks === 1 ? 'RRULE:FREQ=WEEKLY' : `RRULE:FREQ=WEEKLY;INTERVAL=${weeks}` });
  const sessions = Array.from({ length: count }, (_, k) => session(client.id, addDaysLocal(firstLocal, 7 * weeks * k), gid));
  const series: FollowSeries[] = opts.series === false ? [] : [{
    id: `ser-${client.id}-${gid}`, client_id: client.id, interval_weeks: weeks, gcal_event_id: gid,
    anchor_at: sessions[0].session_date, active: true,
  }];
  return { gid, sessions, series };
}

async function run(cal: FakeGoogleCalendar, store: MemoryFollowStore, now = NOW) {
  const windowEnd = new Date(now.getTime() + 70 * DAY);
  const alerts: number[] = [];
  const { events, truncated } = await listCalendarEvents(cal.api, new Date(now.getTime() - 7 * DAY).toISOString(), windowEnd.toISOString());
  const outcome = await followGoogle({
    cal: cal.api, events, truncated, now, windowEnd, store,
    alert: async p => { alerts.push(p.wouldCancel); },
  });
  return { outcome, alerts, events, windowEnd };
}

const writes = (cal: FakeGoogleCalendar) => cal.calls.filter(c => ['patch', 'delete', 'insert'].includes(c.op));
const scheduled = (store: MemoryFollowStore) => store.sessions.filter(s => s.status === 'scheduled');

describe('follow Google: one occurrence deleted', () => {
  it('cancels exactly that session, records it, and writes nothing to Google', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 8);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteOccurrence(b.gid, '2026-12-08T16:00');

    const { outcome } = await run(cal, store);
    expect(outcome.status).toBe('applied');
    expect(store.statusOf(b.sessions[1].id)).toBe('cancelled');
    expect(scheduled(store)).toHaveLength(7);
    expect(store.changes).toHaveLength(1);
    expect(store.changes[0]).toMatchObject({ kind: 'cancelled_occurrence', session_id: b.sessions[1].id, client_id: AOIFE.id });
    expect(writes(cal)).toEqual([]);
    expect(store.series[0]).toMatchObject({ interval_weeks: 1, active: true });
  });

  it('a deleted one-off event cancels its session', async () => {
    const cal = new FakeGoogleCalendar();
    const gid = cal.addOneOff({ summary: 'Session — Test Client', startLocal: '2026-12-04T15:00' });
    const s = session(TEST.id, '2026-12-04T15:00', gid);
    const store = new MemoryFollowStore({ sessions: [s] });
    cal.deleteEvent(gid);
    await run(cal, store);
    expect(store.statusOf(s.id)).toBe('cancelled');
  });

  it('a session stored with an INSTANCE id is followed too', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 4);
    const iid = cal.instanceId(b.gid, '2026-12-15T16:00');
    b.sessions[2].gcal_event_id = iid;
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteOccurrence(b.gid, '2026-12-15T16:00');
    await run(cal, store);
    expect(store.statusOf(b.sessions[2].id)).toBe('cancelled');
    expect(scheduled(store)).toHaveLength(3);
  });

  it('a 404 (event unknown to Google) is never read as a deletion', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 4);
    cal.purge(b.gid);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    const { outcome } = await run(cal, store);
    expect(outcome.status).toBe('nothing');
    expect(scheduled(store)).toHaveLength(4);
  });
});

describe('follow Google: whole series deleted', () => {
  it('cancels every future session of the series and ends it', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 20);       // 10 inside the window, 10 beyond
    const past = session(AOIFE.id, '2026-11-24T16:00', b.gid, { status: 'attended' });
    const store = new MemoryFollowStore({ sessions: [past, ...b.sessions], series: b.series });
    cal.deleteEvent(b.gid);

    const { outcome } = await run(cal, store);
    expect(outcome.status).toBe('applied');
    expect(scheduled(store)).toHaveLength(0);
    expect(store.statusOf(past.id)).toBe('attended');            // past never touched
    expect(store.series[0].active).toBe(false);
    expect(store.changes).toHaveLength(1);
    expect(store.changes[0].kind).toBe('series_ended');
    expect(followedLine(store.changes[0], 'Aoife E.')).toBe('Cancelled Aoife E.’s 20 sessions from Tue 1 Dec, 4:00pm — the series was deleted in Google');
  });

  it('"delete this and following" in Google ends the series from that date', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 12);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.endBefore(b.gid, '2026-12-22T16:00');
    await run(cal, store);
    expect(scheduled(store).map(s => utcToDublinLocal(s.session_date))).toEqual(['2026-12-01T16:00', '2026-12-08T16:00', '2026-12-15T16:00']);
    expect(store.series[0].active).toBe(false);
    expect(store.changes[0]).toMatchObject({ kind: 'series_ended', after: { how: 'ended' } });
  });
});

describe('follow Google: repeat changed', () => {
  it('weekly → every 2 weeks (edited for all events): interval follows, off weeks cancelled', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 8);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.setRule(b.gid, 'RRULE:FREQ=WEEKLY;INTERVAL=2');

    const { outcome } = await run(cal, store);
    expect(outcome.status).toBe('applied');
    expect(store.series[0].interval_weeks).toBe(2);
    expect(scheduled(store).map(s => utcToDublinLocal(s.session_date))).toEqual([
      '2026-12-01T16:00', '2026-12-15T16:00', '2026-12-29T16:00', '2027-01-12T16:00',
    ]);
    expect(store.changes[0]).toMatchObject({ kind: 'interval_changed', before: { interval_weeks: 1 }, after: { interval_weeks: 2 } });
    expect(writes(cal)).toEqual([]);
  });

  it('weekly → every 2 weeks from a date ("this and following"): earlier weeks stay', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 8);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    const split = cal.splitSeries(b.gid, '2026-12-15T16:00', 'RRULE:FREQ=WEEKLY;INTERVAL=2');
    await run(cal, store);
    expect(store.series[0]).toMatchObject({ interval_weeks: 2, gcal_event_id: split, anchor_at: localDublinToUtcIso('2026-12-15T16:00') });
    expect(scheduled(store).map(s => utcToDublinLocal(s.session_date))).toEqual([
      '2026-12-01T16:00', '2026-12-08T16:00', '2026-12-15T16:00', '2026-12-29T16:00', '2027-01-12T16:00',
    ]);

    // The daily top-up then carries on every 2 weeks from the new anchor.
    const series = store.series[0];
    const rows = store.sessions.filter(s => s.client_id === AOIFE.id) as unknown as SeriesSession[];
    const next = planExtension({ ...series }, rows, new Set(rows.map(r => new Date(r.session_date).getTime())), NOW, true);
    expect(next.slice(0, 2).map(utcToDublinLocal)).toEqual(['2027-01-26T16:00', '2027-02-09T16:00']);
  });

  it('every 2 weeks → weekly: interval follows and the in-between weeks are added', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, TEST, '2026-12-04T15:00', 2, 4);         // Fri 4, 18 Dec, 1, 15 Jan
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.setRule(b.gid, 'RRULE:FREQ=WEEKLY');
    await run(cal, store);
    expect(store.series[0].interval_weeks).toBe(1);
    expect(scheduled(store).map(s => utcToDublinLocal(s.session_date)).sort()).toEqual([
      '2026-12-04T15:00', '2026-12-11T15:00', '2026-12-18T15:00', '2026-12-25T15:00',
      '2027-01-01T15:00', '2027-01-08T15:00', '2027-01-15T15:00',
    ]);
    const added = store.sessions.filter(s => s.id.startsWith('added-'));
    expect(added.every(s => s.gcal_event_id === b.gid && s.session_format === 'in_person' && s.fee === 8000)).toBe(true);
  });

  it('a repeat moved to another weekday is not followed (it stays a difference)', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 6);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.splitSeries(b.gid, '2026-12-16T16:00', 'RRULE:FREQ=WEEKLY;INTERVAL=2');   // Wednesdays now
    const { outcome } = await run(cal, store);
    expect(outcome.status).toBe('nothing');
    expect(scheduled(store)).toHaveLength(6);
  });

  it('a monthly or 5-weekly rule is left for the difference card', async () => {
    for (const rule of ['RRULE:FREQ=MONTHLY', 'RRULE:FREQ=WEEKLY;INTERVAL=5', 'RRULE:FREQ=WEEKLY;BYDAY=TU,TH']) {
      const cal = new FakeGoogleCalendar();
      const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 6);
      const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
      cal.setRule(b.gid, rule);
      await run(cal, store);
      expect(scheduled(store)).toHaveLength(6);
      expect(store.series[0].interval_weeks).toBe(1);
    }
  });
});

describe('follow Google: what is never followed', () => {
  it('one occurrence moved in Google stays a drift item, not applied', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 11);       // covers the whole window
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.moveOccurrence(b.gid, '2026-12-08T16:00', '2026-12-09T17:00');
    const { outcome, events, windowEnd } = await run(cal, store);
    expect(outcome.status).toBe('nothing');
    expect(scheduled(store)).toHaveLength(11);
    const drift = findCalendarDrift({
      sessions: store.sessions.map(s => ({ ...s, created_at: '2026-06-01T00:00:00Z' })), events, clients: CLIENTS, now: NOW, timeMax: windowEnd,
    });
    expect(drift.map(d => d.kind)).toEqual(['moved_in_google']);
  });

  it('a personal event "Walk Orla" is never touched, whatever happens to it', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, ORLA, '2026-12-01T16:00', 1, 4);
    const walk = cal.addOneOff({ summary: 'Walk Orla', startLocal: '2026-12-02T09:00' });
    const unlinked = session(ORLA.id, '2026-12-02T09:00', null);
    const store = new MemoryFollowStore({ sessions: [...b.sessions, unlinked], series: b.series });
    cal.deleteEvent(walk);
    const { outcome } = await run(cal, store);
    expect(outcome.status).toBe('nothing');
    expect(scheduled(store)).toHaveLength(5);
    expect(cal.calls.some(c => c.eventId === walk)).toBe(false);
  });

  it('all-day events are ignored', async () => {
    const cal = new FakeGoogleCalendar();
    const allDay = cal.addAllDay({ summary: 'Aoife Example session day', date: '2026-12-03' });
    const s = session(AOIFE.id, '2026-12-03T00:00', allDay);
    const store = new MemoryFollowStore({ sessions: [s] });
    cal.deleteEvent(allDay);
    await run(cal, store);
    expect(store.statusOf(s.id)).toBe('scheduled');
  });

  it('a session moved in the app (off the rhythm, not in Google) is not cancelled', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 4);
    b.sessions[1].session_date = localDublinToUtcIso('2026-12-10T18:00');   // the write to Google failed
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    const { outcome } = await run(cal, store);
    expect(outcome.status).toBe('nothing');
  });

  it('past sessions are never changed', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-11-17T16:00', 1, 4);         // 17, 24 Nov past; 1, 8 Dec ahead
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteEvent(b.gid);
    await run(cal, store);
    expect(store.statusOf(b.sessions[0].id)).toBe('scheduled');
    expect(store.statusOf(b.sessions[1].id)).toBe('scheduled');
    expect(store.statusOf(b.sessions[2].id)).toBe('cancelled');
  });
});

describe('follow Google: safety rails', () => {
  it('a truncated calendar read → no actions', async () => {
    const cal = new FakeGoogleCalendar({ pageSize: 1 });
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 8);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteOccurrence(b.gid, '2026-12-08T16:00');
    const { outcome } = await run(cal, store);
    expect(outcome).toEqual({ status: 'skipped', reason: 'truncated' });
    expect(scheduled(store)).toHaveLength(8);
  });

  it('Google down → no actions', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 8);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteOccurrence(b.gid, '2026-12-08T16:00');
    const { events } = await listCalendarEvents(cal.api, NOW.toISOString(), new Date(NOW.getTime() + 70 * DAY).toISOString());
    cal.opts.down = true;
    const outcome = await followGoogle({
      cal: cal.api, events, truncated: false, now: NOW, windowEnd: new Date(NOW.getTime() + 70 * DAY), store, alert: async () => {},
    });
    expect(outcome).toEqual({ status: 'skipped', reason: 'google' });
    expect(scheduled(store)).toHaveLength(8);
  });

  it('before the migration is applied → no actions', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 4);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    store.tableExists = false;
    cal.deleteEvent(b.gid);
    expect((await run(cal, store)).outcome).toEqual({ status: 'skipped', reason: 'not_ready' });
    expect(scheduled(store)).toHaveLength(4);
  });

  it(`more than ${MAX_CANCEL_PER_RUN} cancellations → none applied, one alert, still listed as differences`, async () => {
    const cal = new FakeGoogleCalendar();
    const a = book(cal, AOIFE, '2026-12-01T16:00', 1, 8);
    const t = book(cal, TEST, '2026-12-04T15:00', 1, 8);
    const store = new MemoryFollowStore({ sessions: [...a.sessions, ...t.sessions], series: [...a.series, ...t.series] });
    cal.deleteEvent(a.gid);
    cal.deleteEvent(t.gid);
    const { outcome, alerts, events, windowEnd } = await run(cal, store);
    expect(outcome).toMatchObject({ status: 'held', wouldCancel: 16 });
    expect(alerts).toEqual([16]);
    expect(scheduled(store)).toHaveLength(16);
    expect(store.changes).toEqual([]);
    const drift = findCalendarDrift({ sessions: store.sessions.map(s => ({ ...s, created_at: '2026-06-01T00:00:00Z' })), events, clients: CLIENTS, now: NOW, timeMax: windowEnd });
    expect(drift.filter(d => d.kind === 'not_in_google')).toHaveLength(16);
  });

  it('re-running changes nothing further', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 8);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteOccurrence(b.gid, '2026-12-08T16:00');
    cal.setRule(b.gid, 'RRULE:FREQ=WEEKLY;INTERVAL=2');
    await run(cal, store);
    const snapshot = JSON.stringify([store.sessions, store.series, store.changes]);
    const again = await run(cal, store);
    expect(again.outcome.status).toBe('nothing');
    expect(JSON.stringify([store.sessions, store.series, store.changes])).toBe(snapshot);
  });

  it('a change that cannot be recorded is put back', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 4);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    store.failRecord = true;
    cal.deleteOccurrence(b.gid, '2026-12-08T16:00');
    await run(cal, store);
    expect(scheduled(store)).toHaveLength(4);
  });
});

describe('follow Google: undo', () => {
  it('restores a cancelled occurrence, and the next run does not cancel it again', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 4);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteOccurrence(b.gid, '2026-12-08T16:00');
    await run(cal, store);
    const res = await undoFollowedChange(store, store.changes[0].id, new Date(NOW.getTime() + DAY));
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Google still shows it as deleted');
    expect(store.statusOf(b.sessions[1].id)).toBe('scheduled');
    await run(cal, store, new Date(NOW.getTime() + DAY));
    expect(store.statusOf(b.sessions[1].id)).toBe('scheduled');
    expect(writes(cal)).toEqual([]);
    // Twice is refused.
    expect((await undoFollowedChange(store, store.changes[0].id, new Date(NOW.getTime() + DAY))).ok).toBe(false);
  });

  it('restores an interval change: interval, anchor and the cancelled sessions', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 6);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.setRule(b.gid, 'RRULE:FREQ=WEEKLY;INTERVAL=2');
    await run(cal, store);
    expect(scheduled(store)).toHaveLength(3);
    await undoFollowedChange(store, store.changes[0].id, NOW);
    expect(scheduled(store)).toHaveLength(6);
    expect(store.series[0]).toMatchObject({ interval_weeks: 1, gcal_event_id: b.gid, anchor_at: b.series[0].anchor_at });
    await run(cal, store);                                       // not re-applied
    expect(store.series[0].interval_weeks).toBe(1);
  });

  it('restores an ended series', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 4);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteEvent(b.gid);
    await run(cal, store);
    await undoFollowedChange(store, store.changes[0].id, NOW);
    expect(scheduled(store)).toHaveLength(4);
    expect(store.series[0].active).toBe(true);
  });

  it('refuses after 7 days', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-12-01T16:00', 1, 4);
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    cal.deleteOccurrence(b.gid, '2026-12-08T16:00');
    await run(cal, store);
    expect((await undoFollowedChange(store, store.changes[0].id, new Date(NOW.getTime() + 8 * DAY))).ok).toBe(false);
  });
});

describe('clock changes (last Sunday of October and March), weekly Tue 4pm', () => {
  it('October: no false deletions across the change, and one real one is caught', async () => {
    const now = new Date('2026-10-10T12:00:00Z');
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-10-13T16:00', 1, 6);         // 13 Oct … 17 Nov; clocks go back 25 Oct
    expect(b.sessions[1].session_date).toBe('2026-10-20T15:00:00.000Z');
    expect(b.sessions[2].session_date).toBe('2026-10-27T16:00:00.000Z');
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    expect((await run(cal, store, now)).outcome.status).toBe('nothing');
    cal.deleteOccurrence(b.gid, '2026-10-27T16:00');
    await run(cal, store, now);
    expect(store.sessions.filter(s => s.status === 'cancelled').map(s => s.id)).toEqual([b.sessions[2].id]);
  });

  it('March: no false deletions across the change, and an interval change keeps 4pm', async () => {
    const now = new Date('2027-03-10T12:00:00Z');
    const cal = new FakeGoogleCalendar();
    const b = book(cal, TEST, '2027-03-16T16:00', 1, 6);          // clocks go forward 28 Mar
    const store = new MemoryFollowStore({ sessions: b.sessions, series: b.series });
    expect((await run(cal, store, now)).outcome.status).toBe('nothing');
    cal.setRule(b.gid, 'RRULE:FREQ=WEEKLY;INTERVAL=2');
    await run(cal, store, now);
    expect(store.sessions.filter(s => s.status === 'scheduled').map(s => utcToDublinLocal(s.session_date))).toEqual([
      '2027-03-16T16:00', '2027-03-30T16:00', '2027-04-13T16:00',
    ]);
  });
});

describe('app → Google writes only that occurrence', () => {
  it('move, edit and cancel each touch one instance and leave the rest of the series alone', async () => {
    const cal = new FakeGoogleCalendar();
    const gid = cal.addSeries({ summary: 'Session — Aoife Example', startLocal: '2026-12-01T16:00', rrule: 'RRULE:FREQ=WEEKLY' });
    const before = cal.occurrences(gid, '2026-12-01T00:00', '2027-01-01T00:00');

    const moveId = await resolveEventId(cal.api, gid, '2026-12-08T16:00');
    expect(moveId).toBe(cal.instanceId(gid, '2026-12-08T16:00'));
    await patchEvent(cal.api, moveId!, { startLocal: '2026-12-08T18:00', minutes: 50 });
    const editId = await resolveEventId(cal.api, gid, '2026-12-15T16:00');
    await patchEvent(cal.api, editId!, { location: 'Online' });
    const cancelId = await resolveEventId(cal.api, gid, '2026-12-22T16:00');
    await deleteEvent(cal.api, cancelId!);

    const after = cal.occurrences(gid, '2026-12-01T00:00', '2027-01-01T00:00');
    expect(after).toEqual(before.filter(o => o !== '2026-12-22T16:00').map(o => (o === '2026-12-08T16:00' ? '2026-12-08T18:00' : o)));
    expect(writes(cal).map(c => c.eventId)).toEqual([moveId, editId, cancelId]);
    expect(writes(cal).every(c => c.eventId !== gid)).toBe(true);
    expect(cal.rawEvent(gid)!.status).toBe('confirmed');
  });
});

describe('change how often in the app (Google side)', () => {
  it('weekly → every 2 weeks: plan, split the repeat in Google, past untouched', async () => {
    const cal = new FakeGoogleCalendar();
    const b = book(cal, AOIFE, '2026-11-17T16:00', 1, 10);        // 17, 24 Nov past; 1 Dec … 19 Jan ahead
    const upcoming = b.sessions.filter(s => new Date(s.session_date) > NOW);
    const plan = planIntervalChange(b.series[0], upcoming, b.sessions, 2, NOW);
    if ('error' in plan) throw new Error(plan.error);
    expect(utcToDublinLocal(plan.effectiveFrom)).toBe('2026-12-01T16:00');
    expect(plan.cancel.map(s => utcToDublinLocal(s.session_date))).toEqual(['2026-12-08T16:00', '2026-12-22T16:00', '2027-01-05T16:00', '2027-01-19T16:00']);
    expect(describeIntervalPlan(plan, 2)).toBe(
      'From Tue 1 Dec, every 2 weeks. Cancels 4 sessions: Tue 8 Dec, Tue 22 Dec, Tue 5 Jan and Tue 19 Jan. Google Calendar will be updated. Your client isn’t emailed.',
    );

    const repeat = await readRepeat(cal.api, b.gid);
    if ('error' in repeat) throw new Error(repeat.error);
    const { id, inPlace } = await startNewRepeat(cal.api, repeat, '2026-12-01T16:00', 2);
    expect(inPlace).toBe(false);
    await endOldRepeat(cal.api, repeat, '2026-12-01T16:00');
    expect(cal.occurrences(b.gid, '2026-11-01T00:00', '2027-02-01T00:00')).toEqual(['2026-11-17T16:00', '2026-11-24T16:00']);
    expect(cal.occurrences(id, '2026-11-01T00:00', '2027-02-01T00:00')).toEqual([
      '2026-12-01T16:00', '2026-12-15T16:00', '2026-12-29T16:00', '2027-01-12T16:00', '2027-01-26T16:00',
    ]);
  });

  it('every 2 weeks → weekly adds the in-between weeks, skipping a week the client already has', () => {
    const series = { interval_weeks: 2, anchor_at: localDublinToUtcIso('2026-12-04T15:00') };
    const rows = [0, 2, 4, 6].map(k => session(TEST.id, addDaysLocal('2026-12-04T15:00', 7 * k), 'g'));
    const holiday = session(TEST.id, '2026-12-24T15:00', null, { status: 'cancelled' });   // covers the 25th
    const plan = planIntervalChange(series, rows, [...rows, holiday], 1, NOW);
    if ('error' in plan) throw new Error(plan.error);
    expect(plan.cancel).toEqual([]);
    expect(plan.add.map(utcToDublinLocal)).toEqual(['2026-12-11T15:00', '2027-01-08T15:00']);
  });

  it('refuses a repeat that already has an end', async () => {
    const cal = new FakeGoogleCalendar();
    const gid = cal.addSeries({ summary: 'Session — Test Client', startLocal: '2026-12-01T16:00', rrule: 'RRULE:FREQ=WEEKLY;COUNT=6' });
    expect(await readRepeat(cal.api, gid)).toHaveProperty('error');
  });

  it('UNTIL is written in UTC just before the change', () => {
    expect(withUntil(['RRULE:FREQ=WEEKLY', 'EXDATE:20261208T160000Z'], Date.UTC(2026, 11, 15, 15, 59)))
      .toEqual(['RRULE:FREQ=WEEKLY;UNTIL=20261215T155900Z', 'EXDATE:20261208T160000Z']);
  });
});

describe('pieces', () => {
  it('parseRrule reads interval, count, until and byday', () => {
    expect(parseRrule(['RRULE:FREQ=WEEKLY;INTERVAL=2'])).toMatchObject({ freq: 'WEEKLY', interval: 2 });
    expect(parseRrule(['RRULE:FREQ=WEEKLY;UNTIL=20261215T155900Z'])?.untilMs).toBe(Date.UTC(2026, 11, 15, 15, 59));
    expect(parseRrule(['RRULE:FREQ=WEEKLY;COUNT=6'])?.count).toBe(6);
    expect(parseRrule(['RRULE:FREQ=MONTHLY;BYMONTHDAY=3'])?.extra).toBe(true);
    expect(parseRrule(['RRULE:FREQ=WEEKLY', 'RRULE:FREQ=DAILY'])).toBeNull();
    expect(parseRrule(null)).toBeNull();
  });

  it('hides differences a followed change already covers, but not undone ones', () => {
    const items = [
      { key: 'a', kind: 'not_in_google' as const, clientId: 'c', clientName: 'x', sessionId: 's1' },
      { key: 'b', kind: 'only_in_google' as const, clientId: 'c', clientName: 'x', eventId: 'base1_20261211T150000Z' },
      { key: 'c', kind: 'not_in_google' as const, clientId: 'c', clientName: 'x', sessionId: 's9' },
    ];
    const changes = [
      { kind: 'cancelled_occurrence' as const, session_id: 's1', before: {}, after: {}, undone_at: null },
      { kind: 'interval_changed' as const, session_id: null, before: { base: 'base1' }, after: {}, undone_at: null },
      { kind: 'cancelled_occurrence' as const, session_id: 's9', before: {}, after: {}, undone_at: '2026-11-28T00:00:00Z' },
    ];
    expect(hideFollowedDrift(items, changes).map(i => i.key)).toEqual(['c']);
  });

  it('lists the last 7 days with first name + initial and no amounts', () => {
    const rows = [
      { id: '1', kind: 'cancelled_occurrence' as const, client_id: AOIFE.id, session_id: 's', series_id: null, before: { session_date: '2026-12-01T16:00:00.000Z' }, after: {}, applied_at: '2026-11-28T10:00:00Z', undone_at: null },
      { id: '2', kind: 'interval_changed' as const, client_id: TEST.id, session_id: null, series_id: 'x', before: { interval_weeks: 1, cancelled: [{ id: 'a', session_date: 'x' }] }, after: { interval_weeks: 2, added: [] }, applied_at: '2026-11-27T10:00:00Z', undone_at: null },
      { id: '3', kind: 'cancelled_occurrence' as const, client_id: AOIFE.id, session_id: 's', series_id: null, before: {}, after: {}, applied_at: '2026-11-10T10:00:00Z', undone_at: null },
    ];
    const items = toFollowedItems(rows, id => (id === AOIFE.id ? 'Aoife E.' : 'Test C.'), NOW);
    expect(items.map(i => i.line)).toEqual([
      'Cancelled Aoife E.’s Tue 1 Dec, 4:00pm session — deleted in Google',
      'Test C. now every 2 weeks (was weekly) — changed in Google; cancelled 1 session that no longer fit',
    ]);
    expect(items.every(i => !i.line.includes('€'))).toBe(true);
  });
});
