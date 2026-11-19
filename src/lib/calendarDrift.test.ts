import { describe, it, expect } from 'vitest';
import { findCalendarDrift, IN_FLIGHT_MS, RETRY_WINDOW_MS, type DriftSession } from './calendarDrift';
import type { MappedEvent } from './calendarSync';

// Winter (GMT): Dublin wall-clock equals UTC, so times read plainly.
const clients = [
  { id: 'c-paul', full_name: 'Paul Cashman' },
  { id: 'c-maddie', full_name: 'Maddie Imiolek' },
  { id: 'c-tommy', full_name: 'Tommy Foster' },
  { id: 'c-philip', full_name: 'Philip Mc Cartney' },
];
const now = new Date('2026-11-19T12:00:00Z');
const timeMax = new Date('2027-01-25T00:00:00Z');
const old = '2026-05-29T09:15:29Z';

const sess = (id: string, client_id: string, session_date: string, over: Partial<DriftSession> = {}): DriftSession => ({
  id, client_id, session_date, status: 'scheduled', gcal_event_id: null, created_at: old, ...over,
});
const ev = (id: string, title: string, start: string, over: Partial<MappedEvent> = {}): MappedEvent => ({
  id, title, start, end: start, ...over,
});
const run = (sessions: DriftSession[], events: MappedEvent[]) =>
  findCalendarDrift({ sessions, events, clients, now, timeMax });

const paulSeries = 'oljoe5384oq6s2bi2lb8rmbmct';

describe('findCalendarDrift', () => {
  it('reports nothing when the app and Google agree (instance ids)', () => {
    const items = run(
      [sess('s1', 'c-paul', '2026-11-24T19:00:00Z', { gcal_event_id: `${paulSeries}_20261124T190000Z` })],
      [ev(`${paulSeries}_20261124T190000Z`, 'Session — Paul Cashman', '2026-11-24T19:00:00Z', { recurringEventId: paulSeries })],
    );
    expect(items).toEqual([]);
  });

  it('pairs a row stored with the SERIES id to that slot\'s occurrence', () => {
    const items = run(
      [
        sess('s0', 'c-paul', '2026-11-24T19:00:00Z', { gcal_event_id: paulSeries }),
        sess('s1', 'c-paul', '2026-12-01T19:00:00Z', { gcal_event_id: paulSeries }),
      ],
      [
        ev(`${paulSeries}_20261124T190000Z`, 'Session — Paul Cashman', '2026-11-24T19:00:00Z', { recurringEventId: paulSeries }),
        ev(`${paulSeries}_20261201T190000Z`, 'Session — Paul Cashman', '2026-12-01T19:00:00Z', { recurringEventId: paulSeries }),
      ],
    );
    expect(items).toEqual([]);
  });

  it('pairs through a split series (`_R…` master id)', () => {
    const base = '544e3vhvjfannb14noukkeubqg';
    const items = run(
      [sess('s1', 'c-philip', '2026-11-27T18:00:00Z', { gcal_event_id: base })],
      [ev(`${base}_20261127T180000Z`, 'Philip (online)', '2026-11-27T18:00:00Z', { recurringEventId: `${base}_R20261030T180000` })],
    );
    expect(items).toEqual([]);
  });

  it('flags a stale row with no Google event (Paul\'s old Monday series)', () => {
    const items = run(
      [sess('mon', 'c-paul', '2026-11-23T18:00:00Z')],
      [ev(`${paulSeries}_20261124T190000Z`, 'Session — Paul Cashman', '2026-11-24T19:00:00Z', { recurringEventId: paulSeries })],
    );
    const mon = items.find(i => i.sessionId === 'mon');
    expect(mon?.kind).toBe('not_in_google');
    expect(mon?.retry).toBe(false);                       // old row: ask, don't auto-push
    // and the real Tuesday event, with no app row, is reported the other way round
    expect(items.find(i => i.kind === 'only_in_google')?.eventId).toBe(`${paulSeries}_20261124T190000Z`);
  });

  it('flags a session moved in Google, naming both times', () => {
    const m = 'k58ks7ij3d3rvgvt47r2ch6fu0';
    const items = run(
      [sess('s1', 'c-maddie', '2026-12-11T16:00:00Z', { gcal_event_id: `${m}_20261211T160000Z` })],
      [ev(`${m}_20261211T160000Z`, 'Session — Maddie Imiolek', '2026-12-11T17:00:00Z',
        { recurringEventId: m, originalStart: '2026-12-11T16:00:00Z' })],
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'moved_in_google', sessionId: 's1', appStart: '2026-12-11T16:00:00.000Z', googleStart: '2026-12-11T17:00:00.000Z' });
  });

  it('finds a moved occurrence of a series by where the series put it', () => {
    const m = 'k58ks7ij3d3rvgvt47r2ch6fu0';
    const items = run(
      [sess('s1', 'c-maddie', '2026-12-11T16:00:00Z', { gcal_event_id: m })],
      [ev(`${m}_20261211T160000Z`, 'Session — Maddie Imiolek', '2026-12-11T17:00:00Z',
        { recurringEventId: m, originalStart: '2026-12-11T16:00:00Z' })],
    );
    expect(items.map(i => i.kind)).toEqual(['moved_in_google']);
  });

  it('flags one occurrence deleted in Google while the series carries on', () => {
    const m = 'k58ks7ij3d3rvgvt47r2ch6fu0';
    const items = run(
      [
        sess('s0', 'c-maddie', '2026-11-27T16:00:00Z', { gcal_event_id: `${m}_20261127T160000Z` }),
        sess('s1', 'c-maddie', '2026-12-11T16:00:00Z', { gcal_event_id: `${m}_20261211T160000Z` }),
      ],
      [ev(`${m}_20261127T160000Z`, 'Session — Maddie Imiolek', '2026-11-27T16:00:00Z', { recurringEventId: m })],
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'not_in_google', sessionId: 's1', retry: false });
  });

  it('flags a cancelled session whose event is still in Google', () => {
    const items = run(
      [sess('s1', 'c-paul', '2026-11-24T19:00:00Z', { status: 'cancelled', gcal_event_id: `${paulSeries}_20261124T190000Z` })],
      [ev(`${paulSeries}_20261124T190000Z`, 'Session — Paul Cashman', '2026-11-24T19:00:00Z', { recurringEventId: paulSeries })],
    );
    expect(items.map(i => i.kind)).toEqual(['cancelled_still_in_google']);
  });

  it('does not report a cancelled twin when a live session owns the slot', () => {
    const items = run(
      [
        sess('dead', 'c-maddie', '2026-11-20T16:00:00Z', { status: 'cancelled' }),
        sess('live', 'c-maddie', '2026-11-20T16:00:00Z', { gcal_event_id: 'k58_20261120T160000Z' }),
      ],
      [ev('k58_20261120T160000Z', 'Session — Maddie Imiolek', '2026-11-20T16:00:00Z', { recurringEventId: 'k58' })],
    );
    expect(items).toEqual([]);
  });

  it('does not double-report twin rows of one missing session', () => {
    const items = run(
      [sess('a', 'c-paul', '2026-11-24T19:00:00Z'), sess('b', 'c-paul', '2026-11-24T19:00:00Z')],
      [],
    );
    expect(items.filter(i => i.kind === 'not_in_google')).toHaveLength(1);
  });

  it('reports a Google event for a client that the app has no session for', () => {
    const items = run([], [ev('x1', 'Tommy session', '2026-12-02T15:00:00Z')]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: 'only_in_google', clientId: 'c-tommy', eventId: 'x1' });
  });

  it('ignores events that name no client, and all-day items', () => {
    const items = run([], [
      ev('h', 'Haircut 💇‍♀️', '2026-11-25T16:00:00Z'),
      ev('e', 'Evan session', '2026-11-27T19:00:00Z'),                 // not a client yet
      ev('b', 'Paul Cashman birthday', '2026-12-03', { allDay: true }),
      ev('w', 'Walk Paul', '2026-12-03T10:00:00Z'),                    // bare first name never matches
    ]);
    expect(items).toEqual([]);
  });

  it('ignores past sessions and events, and anything beyond the window', () => {
    const items = run(
      [sess('past', 'c-paul', '2026-11-16T18:00:00Z'), sess('far', 'c-paul', '2027-03-01T19:00:00Z')],
      [ev('p', 'Session — Paul Cashman', '2026-11-16T19:00:00Z'), ev('f', 'Session — Paul Cashman', '2027-03-02T19:00:00Z')],
    );
    expect(items).toEqual([]);
  });

  it('does not flag a brand-new session whose Google write is still in flight', () => {
    const justNow = new Date(now.getTime() - (IN_FLIGHT_MS - 10_000)).toISOString();
    expect(run([sess('s', 'c-paul', '2026-11-24T19:00:00Z', { created_at: justNow })], [])).toEqual([]);
  });

  it('marks a week-old session with no Google id for automatic retry, an older one not', () => {
    const recent = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString();
    const stale = new Date(now.getTime() - RETRY_WINDOW_MS - 1000).toISOString();
    const items = run([
      sess('r', 'c-paul', '2026-11-24T19:00:00Z', { created_at: recent }),
      sess('o', 'c-tommy', '2026-11-24T15:00:00Z', { created_at: stale }),
    ], []);
    expect(items.find(i => i.sessionId === 'r')?.retry).toBe(true);
    expect(items.find(i => i.sessionId === 'o')?.retry).toBe(false);
  });

  it('never auto-retries a session whose Google event was deleted (it had an id)', () => {
    const recent = new Date(now.getTime() - 3600_000).toISOString();
    const items = run([sess('s', 'c-paul', '2026-11-24T19:00:00Z', { gcal_event_id: 'gone_20261124T190000Z', created_at: recent })], []);
    expect(items[0]).toMatchObject({ kind: 'not_in_google', retry: false });
  });

  it('matches by client and time when the event title has no usable name', () => {
    // Linked by slot, not by a stored id: "Paul Cashman session" names him.
    const items = run(
      [sess('s', 'c-paul', '2026-11-24T19:00:00Z')],
      [ev('z', 'Paul Cashman session', '2026-11-24T19:00:00Z')],
    );
    expect(items).toEqual([]);
  });

  it('gives each item a stable key naming the session and event', () => {
    const items = run([sess('s9', 'c-paul', '2026-11-24T19:00:00Z')], []);
    expect(items[0].key).toBe('not_in_google:s9:');
  });

  it('judges summer-time sessions on the Dublin wall clock (BST)', () => {
    const summerNow = new Date('2027-07-01T09:00:00Z');
    const items = findCalendarDrift({
      sessions: [sess('s', 'c-paul', '2027-07-06T18:00:00Z')],                  // 19:00 BST
      events: [ev('e', 'Session — Paul Cashman', '2027-07-06T19:00:00+01:00')],  // same moment
      clients, now: summerNow, timeMax: new Date('2027-09-01T00:00:00Z'),
    });
    expect(items).toEqual([]);
  });
});

describe('invitations from other people', () => {
  it('never become "only in Google" differences', () => {
    const items = findCalendarDrift({
      sessions: [],
      events: [{ id: 'inv', title: 'Jane Durnin session', start: '2026-12-02T15:00:00Z', end: '2026-12-02T15:50:00Z', foreign: true }],
      clients: [{ id: 'c-jane', full_name: 'Jane Durnin' }], now: new Date('2026-11-19T12:00:00Z'), timeMax: new Date('2027-01-25T00:00:00Z'),
    });
    expect(items).toEqual([]);
  });
});
