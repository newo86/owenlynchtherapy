import { describe, it, expect } from 'vitest';
import { cancelSentence, clampSwipe, nextScheduled, repeatClashes, repeatFor, settlesOpen, usualRepeat } from './phoneHelpers';
import type { FreeSlot } from '../freeSlots';
import type { ClientRow, SessionRow } from '../types';

const s = (id: string, iso: string, o: Partial<SessionRow> = {}): SessionRow => ({
  id, client_id: 'c1', session_date: iso, session_format: 'in_person', location: null, fee: 8000, status: 'scheduled',
  payment_status: 'unpaid', stripe_payment_link_url: null, receipt_sent_at: null, notes: null, ...o,
});
const client = (sessions: SessionRow[]): ClientRow => ({
  id: 'c1', full_name: 'Aoife Example', email: 'aoife@example.com', phone: null, date_of_birth: null,
  emergency_contact_name: null, emergency_contact_phone: null, gp_name: null, gp_phone: null,
  session_fee: 8000, status: 'active', created_at: '2026-01-01T00:00:00Z', sessions,
});
const slot = (cadence: FreeSlot['cadence']): FreeSlot => ({ local: '2026-12-08T18:00', startMs: 0, cadence });

describe('cancelSentence', () => {
  it('names the client by first name and the day, and says the others stay', () => {
    expect(cancelSentence({ full_name: 'Aoife Example' }, { session_date: '2026-12-01T16:00:00Z' }))
      .toBe('Cancel Aoife’s Tue 1 Dec session? Their other sessions stay.');
  });
});

describe('swipe', () => {
  it('settles open past a third of the actions, otherwise closed', () => {
    expect(settlesOpen(-120, 304)).toBe(true);
    expect(settlesOpen(-60, 304)).toBe(false);
    expect(settlesOpen(10, 304)).toBe(false);
  });
  it('never drags right of closed, and only a little past fully open', () => {
    expect(clampSwipe(40, 304)).toBe(0);
    expect(clampSwipe(-900, 304)).toBe(-324);
  });
});

describe('booking rules', () => {
  it('usualRepeat reads weekly or fortnightly from the last two sessions', () => {
    expect(usualRepeat(client([s('a', '2026-12-01T16:00:00Z'), s('b', '2026-12-08T16:00:00Z')]))).toBe('weekly');
    expect(usualRepeat(client([s('a', '2026-12-01T16:00:00Z'), s('b', '2026-12-15T16:00:00Z')]))).toBe('biweekly');
    expect(usualRepeat(client([]))).toBe('weekly');
  });
  it('a time free only once books once; free every 2 weeks books fortnightly', () => {
    expect(repeatFor(slot('once'), 'weekly')).toBe('once');
    expect(repeatFor(slot('fortnightly'), 'weekly')).toBe('biweekly');
    expect(repeatFor(slot('weekly'), 'biweekly')).toBe('biweekly');
  });
  it('warns when the repeat would clash', () => {
    expect(repeatClashes(slot('fortnightly'), 'weekly')).toBe(true);
    expect(repeatClashes(slot('once'), 'biweekly')).toBe(true);
    expect(repeatClashes(slot('weekly'), 'weekly')).toBe(false);
    expect(repeatClashes(undefined, 'weekly')).toBe(false);
  });
  it('nextScheduled skips cancelled and past sessions', () => {
    const c = client([
      s('past', '2026-11-20T16:00:00Z', { status: 'attended' }),
      s('cx', '2026-12-01T16:00:00Z', { status: 'cancelled' }),
      s('next', '2026-12-04T15:00:00Z'),
    ]);
    expect(nextScheduled(c, new Date('2026-11-28T10:00:00Z'))?.id).toBe('next');
  });
});
