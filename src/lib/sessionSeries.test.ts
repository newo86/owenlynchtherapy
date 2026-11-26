import { describe, it, expect } from 'vitest';
import { planExtension, addDaysLocal, HORIZON_WEEKS, type SeriesRow, type SeriesSession } from './sessionSeries';

// Chris: weekly, Tuesdays 18:00 Dublin, anchored on his first session.
const chris: SeriesRow = { id: 'ser1', client_id: 'c-chris', interval_weeks: 1, gcal_event_id: '9q9vg', anchor_at: '2026-11-03T18:00:00.000Z', active: true };
const now = new Date('2026-11-26T12:00:00Z');
const sess = (session_date: string, over: Partial<SeriesSession> = {}): SeriesSession => ({
  client_id: 'c-chris', session_date, status: 'scheduled',
  gcal_event_id: `9q9vg_${session_date.replace(/[-:]/g, '').slice(0, 15)}Z`,
  session_format: 'in_person', location: 'Insight Matters', fee: 8000, ...over,
});
const ms = (iso: string) => new Date(iso).getTime();
const plan = (s: SeriesRow, rows: SeriesSession[], taken: string[] = [], at = now, active = true) =>
  planExtension(s, rows, new Set(taken.map(ms)), at, active);

describe('planExtension', () => {
  it('continues weekly after the latest session, up to the horizon', () => {
    const out = plan(chris, [sess('2027-01-26T18:00:00.000Z')]);
    expect(out[0]).toBe('2027-02-02T18:00:00.000Z');
    expect(ms(out[out.length - 1])).toBeLessThanOrEqual(now.getTime() + HORIZON_WEEKS * 7 * 86_400_000);
    expect(out.length).toBe(7);                                  // 2 Feb … 16 Mar
  });

  it('keeps the Dublin wall-clock time across the clock change (BST)', () => {
    const out = plan(chris, [sess('2027-03-23T18:00:00.000Z')], [], new Date('2027-03-20T12:00:00Z'));
    expect(out[0]).toBe('2027-03-30T17:00:00.000Z');             // 18:00 Irish summer time
  });

  it('follows the anchor\'s rhythm for a fortnightly series', () => {
    const fort = { ...chris, interval_weeks: 2 };                 // 3 Nov, 17 Nov, 1 Dec … 26 Jan, 9 Feb
    const out = plan(fort, [sess('2027-01-26T18:00:00.000Z')]);
    expect(out.slice(0, 2)).toEqual(['2027-02-09T18:00:00.000Z', '2027-02-23T18:00:00.000Z']);
  });

  it('a session moved to another day does not shift the rest', () => {
    const moved = sess('2027-01-27T19:00:00.000Z');              // Wednesday, by agreement
    const out = plan(chris, [sess('2027-01-19T18:00:00.000Z'), moved]);
    expect(out[0]).toBe('2027-02-02T18:00:00.000Z');             // back on Tuesday 18:00
  });

  it('a cancelled last session (a holiday) does not end the series', () => {
    const out = plan(chris, [sess('2027-01-26T18:00:00.000Z', { status: 'cancelled' })]);
    expect(out[0]).toBe('2027-02-02T18:00:00.000Z');
  });

  it('stops for a client marked Completed or a switched-off series', () => {
    const s = [sess('2027-01-26T18:00:00.000Z')];
    expect(plan(chris, s, [], now, false)).toEqual([]);
    expect(plan({ ...chris, active: false }, s)).toEqual([]);
  });

  it('adds nothing when already booked far enough ahead', () => {
    expect(plan(chris, [sess('2027-04-27T17:00:00.000Z')])).toEqual([]);
  });

  it('never doubles a slot the client already has', () => {
    const out = plan(chris, [sess('2027-01-26T18:00:00.000Z')], ['2027-02-02T18:00:00.000Z']);
    expect(out).not.toContain('2027-02-02T18:00:00.000Z');
    expect(out[0]).toBe('2027-02-09T18:00:00.000Z');
  });

  it('starts from today, not the past, when the series lapsed', () => {
    const out = plan(chris, [sess('2026-10-06T17:00:00.000Z')]);
    expect(out[0]).toBe('2026-12-01T18:00:00.000Z');
  });

  it('does nothing for a series without a Google event or sessions', () => {
    expect(plan({ ...chris, gcal_event_id: null }, [sess('2027-01-26T18:00:00.000Z')])).toEqual([]);
    expect(plan(chris, [])).toEqual([]);
  });
});

describe('addDaysLocal', () => {
  it('rolls over months and years', () => {
    expect(addDaysLocal('2026-12-29T18:00', 7)).toBe('2027-01-05T18:00');
  });
});
