import { describe, it, expect } from 'vitest';
import {
  matchOneActiveClient,
  buildCalendarPresence,
  partitionByCalendarPresence,
  type MappedEvent,
} from './calendarSync';

// These tests lock in the rule that prevents the 13 Jul 2026 incident, where
// "ghost" scheduled sessions (database rows with no matching calendar event)
// emailed clients about sessions that weren't happening. A session is only
// reminded if it is genuinely present on the calendar that day.

const clients = [
  { id: 'c-jane', full_name: 'Jane Durnin' },
  { id: 'c-paul', full_name: 'Paul Cashman' },
  { id: 'c-philip', full_name: 'Philip Brady' },
  { id: 'c-kieran', full_name: 'Kieran Cook' },
  { id: 'c-ghost', full_name: 'Ghostly McGhost' },
];

// Shaped like real Google Calendar output (local "+01:00" offsets, instance ids
// with a recurringEventId for series). Mirrors the info@ calendar for 20 Jul.
const janeSeries = 'plsdnslul03jfm6f7t2kqfj4m9';
const paulSeries = 'pq8bokcl69eoq8v21e7ffiegft';
const events: MappedEvent[] = [
  { id: `${janeSeries}_20260720T160000Z`, recurringEventId: janeSeries, start: '2026-07-20T17:00:00+01:00', end: '2026-07-20T17:50:00+01:00', title: 'Session — Jane Durnin' },
  { id: `${paulSeries}_20260720T170000Z`, recurringEventId: paulSeries, start: '2026-07-20T18:00:00+01:00', end: '2026-07-20T18:50:00+01:00', title: 'Session — Paul Cashman' },
  { id: 'gu6o96j1u0qi2k6efhmlsvcu50', start: '2026-07-20T19:15:00+01:00', end: '2026-07-20T20:05:00+01:00', title: 'Philip client' },
];

describe('matchOneActiveClient', () => {
  it('matches a single client named in an app-created title', () => {
    expect(matchOneActiveClient('Session — Jane Durnin', clients)).toBe('c-jane');
  });
  it('matches a free-text manual event by first name', () => {
    expect(matchOneActiveClient('Philip client', clients)).toBe('c-philip');
  });
  it('is case-insensitive', () => {
    expect(matchOneActiveClient('session — jane DURNIN', clients)).toBe('c-jane');
  });
  it('returns null for a non-client event', () => {
    expect(matchOneActiveClient('Personal Therapy', clients)).toBeNull();
    expect(matchOneActiveClient('Dentist', clients)).toBeNull();
  });
  it('returns null when the match is ambiguous (never guesses)', () => {
    const twoJohns = [
      { id: 'j1', full_name: 'John Smith' },
      { id: 'j2', full_name: 'John Murphy' },
    ];
    expect(matchOneActiveClient('John', twoJohns)).toBeNull();
  });
  it('ignores name fragments of 2 characters or fewer', () => {
    // "Ed Li" has no part longer than 2 chars, so a title can never match it —
    // guarding against spurious matches on tiny tokens.
    expect(matchOneActiveClient('Ed Li session', [{ id: 'x', full_name: 'Ed Li' }])).toBeNull();
  });
});

describe('buildCalendarPresence.has', () => {
  const presence = buildCalendarPresence(events, clients);

  it('confirms a session tracked by its recurring SERIES id', () => {
    // App stamps recurring rows with the series id; Google returns instances.
    expect(presence.has({ gcal_event_id: janeSeries, client_id: 'c-jane', session_date: '2026-07-20T16:00:00Z' })).toBe(true);
  });
  it('confirms a session tracked by an exact INSTANCE id', () => {
    expect(presence.has({ gcal_event_id: `${paulSeries}_20260720T170000Z`, client_id: 'c-paul', session_date: '2026-07-20T17:00:00Z' })).toBe(true);
  });
  it('confirms a session tracked by a single-event exact id', () => {
    expect(presence.has({ gcal_event_id: 'gu6o96j1u0qi2k6efhmlsvcu50', client_id: 'c-philip', session_date: '2026-07-20T18:15:00Z' })).toBe(true);
  });
  it('confirms a calendar-less row by client name + slot (unlinked but real)', () => {
    expect(presence.has({ gcal_event_id: null, client_id: 'c-philip', session_date: '2026-07-20T18:15:00Z' })).toBe(true);
  });

  it('REJECTS a ghost with no gcal id and no matching event', () => {
    expect(presence.has({ gcal_event_id: null, client_id: 'c-ghost', session_date: '2026-07-20T20:00:00Z' })).toBe(false);
  });
  it('REJECTS a row whose gcal id points to a deleted event', () => {
    expect(presence.has({ gcal_event_id: 'deleted_event_123', client_id: 'c-ghost', session_date: '2026-07-20T20:00:00Z' })).toBe(false);
  });
  it('REJECTS a session moved to a time with no event (stale row)', () => {
    expect(presence.has({ gcal_event_id: janeSeries, client_id: 'c-jane', session_date: '2026-07-20T15:00:00Z' })).toBe(false);
  });
  it('REJECTS a single deleted occurrence of a still-running series', () => {
    // The series exists (other days) but this occurrence was removed: no event
    // at this slot, so no reminder.
    expect(presence.has({ gcal_event_id: janeSeries, client_id: 'c-jane', session_date: '2026-07-27T16:00:00Z' })).toBe(false);
  });

  it('matches winter (GMT) slots via name without an off-by-one-hour error', () => {
    // In January Dublin is GMT (UTC+0). A calendar-less row must match by
    // client + slot only when the wall-clock times actually line up.
    const winter = buildCalendarPresence(
      [{ id: 'w1', start: '2026-01-15T17:00:00+00:00', end: '2026-01-15T17:50:00+00:00', title: 'Session — Kieran Cook' }],
      clients,
    );
    expect(winter.has({ gcal_event_id: null, client_id: 'c-kieran', session_date: '2026-01-15T17:00:00Z' })).toBe(true);
    expect(winter.has({ gcal_event_id: null, client_id: 'c-kieran', session_date: '2026-01-15T16:00:00Z' })).toBe(false);
  });

  it('never confirms anything against an empty calendar', () => {
    const empty = buildCalendarPresence([], clients);
    expect(empty.has({ gcal_event_id: janeSeries, client_id: 'c-jane', session_date: '2026-07-20T16:00:00Z' })).toBe(false);
    expect(empty.has({ gcal_event_id: null, client_id: 'c-jane', session_date: '2026-07-20T16:00:00Z' })).toBe(false);
  });
});

describe('partitionByCalendarPresence (the reminder run decision)', () => {
  it('reminds real sessions and holds back ghosts on the same day', () => {
    const presence = buildCalendarPresence(events, clients);
    const candidates = [
      { id: 's-jane', gcal_event_id: janeSeries, client_id: 'c-jane', session_date: '2026-07-20T16:00:00Z' },
      { id: 's-paul', gcal_event_id: `${paulSeries}_20260720T170000Z`, client_id: 'c-paul', session_date: '2026-07-20T17:00:00Z' },
      { id: 's-philip', gcal_event_id: null, client_id: 'c-philip', session_date: '2026-07-20T18:15:00Z' },
      { id: 's-ghost1', gcal_event_id: null, client_id: 'c-ghost', session_date: '2026-07-20T20:00:00Z' },
      { id: 's-ghost2', gcal_event_id: 'dead_evt', client_id: 'c-ghost', session_date: '2026-07-20T21:00:00Z' },
    ];
    const { onCalendar, ghosts } = partitionByCalendarPresence(candidates, presence);
    expect(onCalendar.map(s => s.id)).toEqual(['s-jane', 's-paul', 's-philip']);
    expect(ghosts.map(s => s.id)).toEqual(['s-ghost1', 's-ghost2']);
  });

  it('re-creates the 13 Jul incident: empty calendar, ghost rows → zero reminded', () => {
    const presence = buildCalendarPresence([], clients); // no sessions on the calendar that day
    const ghostRows = [
      { id: 'g1', gcal_event_id: null, client_id: 'c-jane', session_date: '2026-07-13T16:00:00Z' },
      { id: 'g2', gcal_event_id: null, client_id: 'c-paul', session_date: '2026-07-13T17:00:00Z' },
      { id: 'g3', gcal_event_id: 'orphan', client_id: 'c-kieran', session_date: '2026-07-13T18:00:00Z' },
    ];
    const { onCalendar, ghosts } = partitionByCalendarPresence(ghostRows, presence);
    expect(onCalendar).toHaveLength(0);   // nobody gets emailed
    expect(ghosts).toHaveLength(3);
  });
});
