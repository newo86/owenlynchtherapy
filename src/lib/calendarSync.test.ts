import { describe, it, expect } from 'vitest';
import {
  matchOneActiveClient,
  buildCalendarPresence,
  partitionByCalendarPresence,
  planLinks,
  type MappedEvent,
} from './calendarSync';

// These tests lock in the rule that prevents the 13 Jul 2026 incident, where
// "ghost" scheduled sessions (database rows with no matching calendar event)
// emailed clients about sessions that weren't happening. A session is only
// reminded if it is genuinely present on the calendar that day.

const clients = [
  { id: 'c-nora', full_name: 'Nora Invented' },
  { id: 'c-aoife', full_name: 'Aoife Example' },
  { id: 'c-tom', full_name: 'Tom Fictional' },
  { id: 'c-niamh', full_name: 'Niamh Placeholder' },
  { id: 'c-ghost', full_name: 'Ghostly McGhost' },
];

// Shaped like real Google Calendar output (local "+01:00" offsets, instance ids
// with a recurringEventId for series). Mirrors the info@ calendar for 20 Jul.
const noraSeries = 'c4hv8nrj6ke0xwdq1ztbp3ma7u';
const aoifeSeries = 'e9tg2bxn5qa7ysu3jhw1kvr6dc';
const events: MappedEvent[] = [
  { id: `${noraSeries}_20260720T160000Z`, recurringEventId: noraSeries, start: '2026-07-20T17:00:00+01:00', end: '2026-07-20T17:50:00+01:00', title: 'Session — Nora Invented' },
  { id: `${aoifeSeries}_20260720T170000Z`, recurringEventId: aoifeSeries, start: '2026-07-20T18:00:00+01:00', end: '2026-07-20T18:50:00+01:00', title: 'Session — Aoife Example' },
  { id: 'r2n7ykq4wb8gz1ahc5ev9xdj3t', start: '2026-07-20T19:15:00+01:00', end: '2026-07-20T20:05:00+01:00', title: 'Tom client' },
];

describe('matchOneActiveClient', () => {
  it('matches a single client named in an app-created title', () => {
    expect(matchOneActiveClient('Session — Nora Invented', clients)).toBe('c-nora');
  });
  it('matches a free-text manual event by first name', () => {
    expect(matchOneActiveClient('Tom client', clients)).toBe('c-tom');
  });
  it('is case-insensitive', () => {
    expect(matchOneActiveClient('session — nora DURNIN', clients)).toBe('c-nora');
  });
  it('returns null for a non-client event', () => {
    expect(matchOneActiveClient('Personal Therapy', clients)).toBeNull();
    expect(matchOneActiveClient('Dentist', clients)).toBeNull();
  });
  it('returns null when the match is ambiguous (never guesses)', () => {
    const twoJohns = [
      { id: 'j1', full_name: 'John Smith' },
      { id: 'j2', full_name: 'John Fictional' },
    ];
    expect(matchOneActiveClient('John', twoJohns)).toBeNull();
  });
  it('NEVER treats a personal event naming a client as their session', () => {
    // The wrong-person bug: a bare first name used to be enough, so these
    // became scheduled sessions and the client was emailed a reminder.
    const people = [
      { id: 'c-orla', full_name: 'Orla Fictional' },
      { id: 'c-maeve', full_name: 'Maeve Sample' },
      { id: 'c-ann', full_name: 'Rosa Day' },
    ];
    expect(matchOneActiveClient('Walk Orla', people)).toBeNull();
    expect(matchOneActiveClient('Maeve coffee', people)).toBeNull();
    expect(matchOneActiveClient('Day off', people)).toBeNull();
    expect(matchOneActiveClient('Orla', people)).toBeNull();
  });
  it('still matches first name + "session"/"client"', () => {
    const people = [{ id: 'c-orla', full_name: 'Orla Fictional' }];
    expect(matchOneActiveClient('Orla session', people)).toBe('c-orla');
    expect(matchOneActiveClient('Client - Orla', people)).toBe('c-orla');
  });
  it('prefers a full-name hit when two clients share a first name', () => {
    const twoJohns = [
      { id: 'j1', full_name: 'John Smith' },
      { id: 'j2', full_name: 'John Fictional' },
    ];
    expect(matchOneActiveClient('Session — John Fictional', twoJohns)).toBe('j2');
    expect(matchOneActiveClient('John session', twoJohns)).toBeNull(); // still ambiguous
  });
  it('ignores name fragments of 2 characters or fewer', () => {
    // "Bo Li" has no part longer than 2 chars, so a title can never match it —
    // guarding against spurious matches on tiny tokens.
    expect(matchOneActiveClient('Bo Li session', [{ id: 'x', full_name: 'Bo Li' }])).toBeNull();
  });
});

describe('buildCalendarPresence.has', () => {
  const presence = buildCalendarPresence(events, clients);

  it('confirms a session tracked by its recurring SERIES id', () => {
    // App stamps recurring rows with the series id; Google returns instances.
    expect(presence.has({ gcal_event_id: noraSeries, client_id: 'c-nora', session_date: '2026-07-20T16:00:00Z' })).toBe(true);
  });
  it('confirms a session tracked by an exact INSTANCE id', () => {
    expect(presence.has({ gcal_event_id: `${aoifeSeries}_20260720T170000Z`, client_id: 'c-aoife', session_date: '2026-07-20T17:00:00Z' })).toBe(true);
  });
  it('confirms a session tracked by a single-event exact id', () => {
    expect(presence.has({ gcal_event_id: 'r2n7ykq4wb8gz1ahc5ev9xdj3t', client_id: 'c-tom', session_date: '2026-07-20T18:15:00Z' })).toBe(true);
  });
  it('confirms a calendar-less row by client name + slot (unlinked but real)', () => {
    expect(presence.has({ gcal_event_id: null, client_id: 'c-tom', session_date: '2026-07-20T18:15:00Z' })).toBe(true);
  });

  it('REJECTS a ghost with no gcal id and no matching event', () => {
    expect(presence.has({ gcal_event_id: null, client_id: 'c-ghost', session_date: '2026-07-20T20:00:00Z' })).toBe(false);
  });
  it('REJECTS a row whose gcal id points to a deleted event', () => {
    expect(presence.has({ gcal_event_id: 'deleted_event_123', client_id: 'c-ghost', session_date: '2026-07-20T20:00:00Z' })).toBe(false);
  });
  it('REJECTS a session moved to a time with no event (stale row)', () => {
    expect(presence.has({ gcal_event_id: noraSeries, client_id: 'c-nora', session_date: '2026-07-20T15:00:00Z' })).toBe(false);
  });
  it('REJECTS a single deleted occurrence of a still-running series', () => {
    // The series exists (other days) but this occurrence was removed: no event
    // at this slot, so no reminder.
    expect(presence.has({ gcal_event_id: noraSeries, client_id: 'c-nora', session_date: '2026-07-27T16:00:00Z' })).toBe(false);
  });

  it('matches winter (GMT) slots via name without an off-by-one-hour error', () => {
    // In January Dublin is GMT (UTC+0). A calendar-less row must match by
    // client + slot only when the wall-clock times actually line up.
    const winter = buildCalendarPresence(
      [{ id: 'w1', start: '2026-01-15T17:00:00+00:00', end: '2026-01-15T17:50:00+00:00', title: 'Session — Niamh Placeholder' }],
      clients,
    );
    expect(winter.has({ gcal_event_id: null, client_id: 'c-niamh', session_date: '2026-01-15T17:00:00Z' })).toBe(true);
    expect(winter.has({ gcal_event_id: null, client_id: 'c-niamh', session_date: '2026-01-15T16:00:00Z' })).toBe(false);
  });

  it('never confirms a session from an all-day event', () => {
    const allDay = buildCalendarPresence(
      [{ id: 'ad1', start: '2026-07-20', end: '2026-07-21', title: 'Session — Nora Invented', allDay: true }],
      clients,
    );
    expect(allDay.has({ gcal_event_id: null, client_id: 'c-nora', session_date: '2026-07-19T23:00:00Z' })).toBe(false);
  });

  it('never confirms anything against an empty calendar', () => {
    const empty = buildCalendarPresence([], clients);
    expect(empty.has({ gcal_event_id: noraSeries, client_id: 'c-nora', session_date: '2026-07-20T16:00:00Z' })).toBe(false);
    expect(empty.has({ gcal_event_id: null, client_id: 'c-nora', session_date: '2026-07-20T16:00:00Z' })).toBe(false);
  });
});

describe('partitionByCalendarPresence (the reminder run decision)', () => {
  it('reminds real sessions and holds back ghosts on the same day', () => {
    const presence = buildCalendarPresence(events, clients);
    const candidates = [
      { id: 's-nora', gcal_event_id: noraSeries, client_id: 'c-nora', session_date: '2026-07-20T16:00:00Z' },
      { id: 's-aoife', gcal_event_id: `${aoifeSeries}_20260720T170000Z`, client_id: 'c-aoife', session_date: '2026-07-20T17:00:00Z' },
      { id: 's-tom', gcal_event_id: null, client_id: 'c-tom', session_date: '2026-07-20T18:15:00Z' },
      { id: 's-ghost1', gcal_event_id: null, client_id: 'c-ghost', session_date: '2026-07-20T20:00:00Z' },
      { id: 's-ghost2', gcal_event_id: 'dead_evt', client_id: 'c-ghost', session_date: '2026-07-20T21:00:00Z' },
    ];
    const { onCalendar, ghosts } = partitionByCalendarPresence(candidates, presence);
    expect(onCalendar.map(s => s.id)).toEqual(['s-nora', 's-aoife', 's-tom']);
    expect(ghosts.map(s => s.id)).toEqual(['s-ghost1', 's-ghost2']);
  });

  it('re-creates the 13 Jul incident: empty calendar, ghost rows → zero reminded', () => {
    const presence = buildCalendarPresence([], clients); // no sessions on the calendar that day
    const ghostRows = [
      { id: 'g1', gcal_event_id: null, client_id: 'c-nora', session_date: '2026-07-13T16:00:00Z' },
      { id: 'g2', gcal_event_id: null, client_id: 'c-aoife', session_date: '2026-07-13T17:00:00Z' },
      { id: 'g3', gcal_event_id: 'orphan', client_id: 'c-niamh', session_date: '2026-07-13T18:00:00Z' },
    ];
    const { onCalendar, ghosts } = partitionByCalendarPresence(ghostRows, presence);
    expect(onCalendar).toHaveLength(0);   // nobody gets emailed
    expect(ghosts).toHaveLength(3);
  });
});

describe('buildCalendarPresence: the app is the source of truth', () => {
  it('does not confirm a session whose event Google has at a DIFFERENT time (moved there by hand)', () => {
    const m = 'm3x8pq1ze5d7wtgb92nrhk4ycs';
    const moved: MappedEvent[] = [
      { id: `${m}_20261211T160000Z`, recurringEventId: m, start: '2026-12-11T17:00:00Z', end: '2026-12-11T17:50:00Z', title: 'Session — Nora Invented' },
    ];
    const presence = buildCalendarPresence(moved, clients);
    // The app still says 16:00, Google says 17:00: held back from reminders until resolved.
    expect(presence.has({ gcal_event_id: `${m}_20261211T160000Z`, client_id: 'c-nora', session_date: '2026-12-11T16:00:00Z' })).toBe(false);
  });

  it('still confirms it once the times agree', () => {
    const m = 'm3x8pq1ze5d7wtgb92nrhk4ycs';
    const same: MappedEvent[] = [
      { id: `${m}_20261211T160000Z`, recurringEventId: m, start: '2026-12-11T16:00:00Z', end: '2026-12-11T16:50:00Z', title: 'Session — Nora Invented' },
    ];
    expect(buildCalendarPresence(same, clients).has({ gcal_event_id: `${m}_20261211T160000Z`, client_id: 'c-nora', session_date: '2026-12-11T16:00:00Z' })).toBe(true);
  });

  it('confirms through a split-series master id', () => {
    const base = '7d2q9wzkhs5tnb30rcmyeaf1vj';
    const evs: MappedEvent[] = [
      { id: `${base}_20261127T180000Z`, recurringEventId: `${base}_R20261030T180000`, start: '2026-11-27T18:00:00Z', end: '2026-11-27T19:00:00Z', title: 'Tom (online)' },
    ];
    expect(buildCalendarPresence(evs, clients).has({ gcal_event_id: base, client_id: 'c-tom', session_date: '2026-11-27T18:00:00Z' })).toBe(true);
  });
});

describe('planLinks (tie a session to the Google event it already matches)', () => {
  const nov: MappedEvent[] = [
    { id: 'aoife_20261124T190000Z', recurringEventId: 'aoife', start: '2026-11-24T19:00:00Z', end: '2026-11-24T19:50:00Z', title: 'Session — Aoife Example' },
    { id: 'nora-1', start: '2026-11-24T17:00:00Z', end: '2026-11-24T17:50:00Z', title: 'Session — Nora Invented' },
  ];
  const now = new Date('2026-11-19T00:00:00Z');

  it('links a row with no id to the event at the same client and time', () => {
    const plan = planLinks([{ id: 'tue', client_id: 'c-aoife', session_date: '2026-11-24T19:00:00Z', gcal_event_id: null }], nov, clients, now);
    expect(plan.link).toEqual([{ id: 'tue', gcal_event_id: 'aoife_20261124T190000Z', previous: null }]);
  });

  it('never cancels or links a stale row with no event (Aoife\'s old Monday)', () => {
    const plan = planLinks([{ id: 'mon', client_id: 'c-aoife', session_date: '2026-11-23T18:00:00Z', gcal_event_id: null }], nov, clients, now);
    expect(plan.link).toEqual([]);
  });

  it('relinks a row whose stored event is gone when a replacement sits at the same time', () => {
    const plan = planLinks([{ id: 'tue', client_id: 'c-aoife', session_date: '2026-11-24T19:00:00Z', gcal_event_id: 'deleted_20261124T190000Z' }], nov, clients, now);
    expect(plan.link).toEqual([{ id: 'tue', gcal_event_id: 'aoife_20261124T190000Z', previous: 'deleted_20261124T190000Z' }]);
  });

  it('leaves an already-linked row alone (instance id, or a series with live occurrences)', () => {
    const plan = planLinks([
      { id: 'a', client_id: 'c-aoife', session_date: '2026-11-24T19:00:00Z', gcal_event_id: 'aoife_20261124T190000Z' },
      { id: 'b', client_id: 'c-aoife', session_date: '2026-12-01T19:00:00Z', gcal_event_id: 'aoife' },
    ], nov, clients, now);
    expect(plan.link).toEqual([]);
  });

  it('does not link a twin row onto a slot another row already holds', () => {
    const plan = planLinks([
      { id: 'a', client_id: 'c-aoife', session_date: '2026-11-24T19:00:00Z', gcal_event_id: 'aoife_20261124T190000Z' },
      { id: 'twin', client_id: 'c-aoife', session_date: '2026-11-24T19:00:00Z', gcal_event_id: null },
    ], nov, clients, now);
    expect(plan.link).toEqual([]);
  });

  it('ignores past sessions, all-day items and personal events naming a client', () => {
    const plan = planLinks([
      { id: 'past', client_id: 'c-aoife', session_date: '2026-11-16T19:00:00Z', gcal_event_id: null },
      { id: 'jd', client_id: 'c-nora', session_date: '2026-11-27T17:00:00Z', gcal_event_id: null },
    ], [
      { id: 'a', start: '2026-11-27', end: '2026-11-28', title: 'Nora Invented session', allDay: true },
      { id: 'b', start: '2026-11-27T17:00:00Z', end: '2026-11-27T18:00:00Z', title: 'Coffee Nora' },
    ], clients, now);
    expect(plan.link).toEqual([]);
  });
});
