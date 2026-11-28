import { describe, it, expect } from 'vitest';
import { resolveEventId, patchEvent, deleteEvent, insertSessionEvent, type CalLike, type EventLike } from './googleSessionEvents';

// A fake Google Calendar that records every call, so the tests can assert
// that one session's change touches exactly one event.
function fake(opts: { events?: Record<string, EventLike>; instances?: EventLike[]; deleteError?: unknown } = {}) {
  const calls: Array<{ op: string; eventId?: string; body?: Record<string, unknown> }> = [];
  const cal: CalLike = {
    events: {
      async get({ eventId }) {
        calls.push({ op: 'get', eventId });
        const e = opts.events?.[eventId];
        if (!e) throw Object.assign(new Error('Not Found'), { code: 404 });
        return { data: e };
      },
      async instances({ eventId }) { calls.push({ op: 'instances', eventId }); return { data: { items: opts.instances ?? [] } }; },
      async patch({ eventId, requestBody }) { calls.push({ op: 'patch', eventId, body: requestBody }); return {}; },
      async delete({ eventId }) { calls.push({ op: 'delete', eventId }); if (opts.deleteError) throw opts.deleteError; return {}; },
      async insert({ requestBody }) { calls.push({ op: 'insert', body: requestBody }); return { data: { id: 'new-event-id' } }; },
    },
  };
  return { cal, calls };
}

const niamhSeries = '3hq7zwe4ycb91nd6xk0trs5vfa';   // an example series id
const inst = (id: string, start: string, original = start): EventLike =>
  ({ id, status: 'confirmed', start: { dateTime: start }, originalStartTime: { dateTime: original } });

describe('resolveEventId', () => {
  it('uses an instance id as it is, with no Google call', async () => {
    const { cal, calls } = fake();
    expect(await resolveEventId(cal, 'abc_20261124T190000Z', '2026-11-24T19:00')).toBe('abc_20261124T190000Z');
    expect(calls).toEqual([]);
  });

  it('uses a one-off event id as it is', async () => {
    const { cal } = fake({ events: { 'v5kz0hd8mq2ewc7pxy1nbr4jgt': { status: 'confirmed' } } });
    expect(await resolveEventId(cal, 'v5kz0hd8mq2ewc7pxy1nbr4jgt', '2026-11-24T20:00')).toBe('v5kz0hd8mq2ewc7pxy1nbr4jgt');
  });

  it('turns a SERIES id into the one occurrence at that session\'s time', async () => {
    const { cal } = fake({
      events: { [niamhSeries]: { status: 'confirmed', recurrence: ['RRULE:FREQ=WEEKLY'] } },
      instances: [
        inst(`${niamhSeries}_20270126T180000Z`, '2027-01-26T18:00:00Z'),
        inst(`${niamhSeries}_20270202T180000Z`, '2027-02-02T18:00:00Z'),
      ],
    });
    expect(await resolveEventId(cal, niamhSeries, '2027-02-02T18:00')).toBe(`${niamhSeries}_20270202T180000Z`);
  });

  it('finds an occurrence that was moved, by where the series put it', async () => {
    const { cal } = fake({
      events: { [niamhSeries]: { status: 'confirmed', recurrence: ['RRULE:FREQ=WEEKLY'] } },
      instances: [inst(`${niamhSeries}_20270202T180000Z`, '2027-02-03T19:00:00Z', '2027-02-02T18:00:00Z')],
    });
    expect(await resolveEventId(cal, niamhSeries, '2027-02-02T18:00')).toBe(`${niamhSeries}_20270202T180000Z`);
  });

  it('returns null for an occurrence that has been deleted, never the series', async () => {
    const { cal } = fake({
      events: { [niamhSeries]: { status: 'confirmed', recurrence: ['RRULE:FREQ=WEEKLY'] } },
      instances: [inst(`${niamhSeries}_20270126T180000Z`, '2027-01-26T18:00:00Z')],
    });
    expect(await resolveEventId(cal, niamhSeries, '2027-02-02T18:00')).toBeNull();
  });

  it('returns null when the event no longer exists', async () => {
    const { cal } = fake();
    expect(await resolveEventId(cal, 'gone', '2026-11-24T19:00')).toBeNull();
  });

  it('treats a split-series master (`_R…`) as a series, not an instance', async () => {
    const master = '7d2q9wzkhs5tnb30rcmyeaf1vj_R20261030T180000';
    const { cal } = fake({
      events: { [master]: { status: 'confirmed', recurrence: ['RRULE:FREQ=WEEKLY'] } },
      instances: [inst('7d2q9wzkhs5tnb30rcmyeaf1vj_20261127T180000Z', '2026-11-27T18:00:00Z')],
    });
    expect(await resolveEventId(cal, master, '2026-11-27T18:00')).toBe('7d2q9wzkhs5tnb30rcmyeaf1vj_20261127T180000Z');
  });
});

describe('patchEvent / deleteEvent / insertSessionEvent', () => {
  it('moves only the event it is given, as Dublin wall-clock time', async () => {
    const { cal, calls } = fake();
    await patchEvent(cal, 'abc_20261124T190000Z', { startLocal: '2026-11-24T20:00', minutes: 50 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ op: 'patch', eventId: 'abc_20261124T190000Z' });
    expect(calls[0].body).toMatchObject({
      start: { dateTime: '2026-11-24T20:00:00', timeZone: 'Europe/Dublin' },
      end: { dateTime: '2026-11-24T20:50:00', timeZone: 'Europe/Dublin' },
    });
  });

  it('does not touch the time when only the title or place changes', async () => {
    const { cal, calls } = fake();
    await patchEvent(cal, 'abc', { location: 'Online' });
    expect(calls[0].body).toEqual({ location: 'Online' });
  });

  it('deletes only the event it is given', async () => {
    const { cal, calls } = fake();
    await deleteEvent(cal, 'abc_20261124T190000Z');
    expect(calls).toEqual([{ op: 'delete', eventId: 'abc_20261124T190000Z' }]);
  });

  it('treats "already deleted" as done', async () => {
    const { cal } = fake({ deleteError: Object.assign(new Error('Resource has been deleted'), { code: 410 }) });
    await expect(deleteEvent(cal, 'x')).resolves.toBeUndefined();
  });

  it('still raises real failures', async () => {
    const { cal } = fake({ deleteError: Object.assign(new Error('Rate limit'), { code: 429 }) });
    await expect(deleteEvent(cal, 'x')).rejects.toThrow('Rate limit');
  });

  it('creates a one-off event and returns its id (no repeat rule)', async () => {
    const { cal, calls } = fake();
    const id = await insertSessionEvent(cal, { summary: 'Session — Aoife Example', startLocal: '2026-12-01T19:00', minutes: 50, location: 'Insight Matters' });
    expect(id).toBe('new-event-id');
    expect(calls[0].body).not.toHaveProperty('recurrence');
    expect(calls[0].body).toMatchObject({ summary: 'Session — Aoife Example', start: { dateTime: '2026-12-01T19:00:00' } });
  });
});
