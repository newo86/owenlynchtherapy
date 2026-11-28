import { describe, it, expect } from 'vitest';
import { findFreeSlots, checkTime } from './freeSlots';

// Owen's real working hours (Settings, Nov 2026) and a winter (GMT) week, so
// Dublin wall-clock = UTC and the expectations read plainly.
const hours = [
  { dayOfWeek: 'Monday', opens: '17:00', closes: '20:00' },
  { dayOfWeek: 'Tuesday', opens: '17:00', closes: '20:00' },
  { dayOfWeek: 'Friday', opens: '15:00', closes: '20:00' },
];
const now = new Date('2026-11-19T00:10:00Z'); // Thu
const knownUntil = new Date('2027-01-11T00:00:00Z');
const base = { hours, sessionMinutes: 50, now, knownUntil, days: 14 };

const weekly = (local: string, n = 8) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${local}:00Z`); d.setUTCDate(d.getUTCDate() + 7 * i);
    return { session_date: d.toISOString(), status: 'scheduled' };
  });
const fortnightly = (local: string, n = 5) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(`${local}:00Z`); d.setUTCDate(d.getUTCDate() + 14 * i);
    return { session_date: d.toISOString(), status: 'scheduled' };
  });

describe('findFreeSlots', () => {
  it('lists every hour of an empty calendar as free every week', () => {
    const slots = findFreeSlots({ ...base, sessions: [], events: [] });
    // Fri 20 (5) + Mon 23 (3) + Tue 24 (3) + Fri 27 (5) + Mon 30 (3) + Tue 1 (3)
    expect(slots).toHaveLength(22);
    expect(slots[0]).toMatchObject({ local: '2026-11-20T15:00', cadence: 'weekly' });
    // last start must finish by closing: 19:00 + 50 min ≤ 20:00, never 20:00
    expect(slots.some(s => s.local.endsWith('T20:00'))).toBe(false);
  });

  it('never offers a slot taken by a session', () => {
    const slots = findFreeSlots({ ...base, sessions: weekly('2026-11-20T17:00'), events: [] });
    expect(slots.find(s => s.local === '2026-11-20T17:00')).toBeUndefined();
  });

  it('ignores cancelled sessions', () => {
    const slots = findFreeSlots({ ...base, sessions: [{ session_date: '2026-11-20T17:00:00Z', status: 'cancelled' }], events: [] });
    expect(slots.find(s => s.local === '2026-11-20T17:00')).toBeDefined();
  });

  it('a personal event blocks every slot it overlaps (Personal therapy Mon 17:30–18:30)', () => {
    const slots = findFreeSlots({
      ...base, sessions: [],
      events: [{ start: '2026-11-23T17:30:00Z', end: '2026-11-23T18:30:00Z' }],
    });
    const mon = slots.filter(s => s.local.startsWith('2026-11-23')).map(s => s.local.slice(11));
    expect(mon).toEqual(['19:00']);
  });

  it('all-day items and "free" events never block time', () => {
    const slots = findFreeSlots({
      ...base, sessions: [],
      events: [
        { start: '2026-11-23', end: '2026-11-24', allDay: true },
        { start: '2026-11-23T17:00:00Z', end: '2026-11-23T20:00:00Z', free: true },
      ],
    });
    expect(slots.filter(s => s.local.startsWith('2026-11-23'))).toHaveLength(3);
  });

  it('spots the alternate week of a fortnightly client as "every 2 weeks"', () => {
    // Sam-style: fortnightly Fri 15:00 from 4 Dec; 20 Nov, 4 Dec... taken on
    // the even weeks, so 27 Nov 15:00 is free every 2 weeks.
    const slots = findFreeSlots({ ...base, sessions: fortnightly('2026-12-04T15:00'), events: [] });
    expect(slots.find(s => s.local === '2026-11-27T15:00')?.cadence).toBe('fortnightly');
    // 20 Nov is free, but its fortnight (4 Dec) is taken: a one-off only.
    expect(slots.find(s => s.local === '2026-11-20T15:00')?.cadence).toBe('once');
  });

  it('calls a one-off gap "this date only"', () => {
    const slots = findFreeSlots({
      ...base,
      sessions: [...weekly('2026-11-30T17:00')], // taken every week from 30 Nov
      events: [],
    });
    expect(slots.find(s => s.local === '2026-11-23T17:00')?.cadence).toBe('once');
  });

  it('never assumes weeks beyond the known calendar are free', () => {
    const slots = findFreeSlots({ ...base, knownUntil: new Date('2026-12-05T00:00:00Z'), sessions: [], events: [] });
    // Fri 20 Nov: +3 weeks (11 Dec) is past knownUntil, so not "weekly"
    expect(slots.find(s => s.local === '2026-11-20T15:00')?.cadence).toBe('once');
  });

  it('skips slots already started today', () => {
    const slots = findFreeSlots({ ...base, now: new Date('2026-11-20T16:30:00Z'), sessions: [], events: [] });
    expect(slots[0].local).toBe('2026-11-20T17:00');
  });

  it('handles summer time: 17:00 Dublin in July is 16:00 UTC', () => {
    const slots = findFreeSlots({
      ...base, now: new Date('2027-07-05T08:00:00Z'), knownUntil: new Date('2027-09-01T00:00:00Z'),
      sessions: [{ session_date: '2027-07-05T16:00:00Z', status: 'scheduled' }], events: [],
    });
    const mon = slots.filter(s => s.local.startsWith('2027-07-05')).map(s => s.local.slice(11));
    expect(mon).toEqual(['18:00', '19:00']);
  });
});

describe('checkTime (Other time, e.g. a lunchtime one-off)', () => {
  const input = { sessionMinutes: 50, now, knownUntil, events: [], sessions: weekly('2026-11-24T16:00') };
  it('accepts a free time outside working hours', () => {
    expect(checkTime('2026-11-25T13:00', input)).toBe('weekly');
  });
  it('rejects a time that clashes with a session', () => {
    expect(checkTime('2026-11-24T16:30', input)).toBeNull();
  });
  it('rejects a time in the past', () => {
    expect(checkTime('2026-11-18T13:00', input)).toBeNull();
  });
});
