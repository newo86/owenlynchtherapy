import { describe, it, expect } from 'vitest';
import { clinicDays, clinicDaysLabel, slotsNextWeek, cadenceLabel } from './desktopToday';
import type { ClientRow, SessionRow } from './types';
import type { FreeSlot } from './freeSlots';

const hours = [
  { dayOfWeek: 'Tuesday', opens: '16:00', closes: '20:00' },
  { dayOfWeek: 'Friday', opens: '15:00', closes: '19:00' },
];
const slot = (local: string): FreeSlot => ({ local, startMs: 0, cadence: 'weekly' });
const sess = (id: string, iso: string, status = 'scheduled'): SessionRow => ({
  id, client_id: 'c', session_date: iso, session_format: 'in_person', location: null, fee: 8000,
  status, payment_status: 'unpaid', stripe_payment_link_url: null, receipt_sent_at: null, notes: null,
});
const client = (sessions: SessionRow[]): ClientRow => ({
  id: 'c', full_name: 'Test Client', email: 'test@example.com', phone: null, date_of_birth: null,
  emergency_contact_name: null, emergency_contact_phone: null, gp_name: null, gp_phone: null,
  session_fee: 8000, status: 'active', created_at: '2026-01-01T00:00:00Z', sessions,
});

describe('clinic days', () => {
  it('labels the working days in week order', () => {
    expect(clinicDaysLabel(hours)).toBe('Tue and Fri');
    expect(clinicDaysLabel([...hours, { dayOfWeek: 'Monday', opens: '10:00', closes: '12:00' }])).toBe('Mon, Tue and Fri');
  });

  it('lists the next working days, today first and highlighted, with sessions and free slots in time order', () => {
    const c = client([sess('a', '2026-12-01T16:00:00Z'), sess('b', '2026-12-01T17:00:00Z', 'cancelled')]);
    const days = clinicDays(hours, [{ s: c.sessions[0], c }, { s: c.sessions[1], c }], [slot('2026-12-01T18:00')], '2026-12-01', 3);
    expect(days.map(d => d.ymd)).toEqual(['2026-12-01', '2026-12-04', '2026-12-08']);
    expect(days[0].isToday).toBe(true);
    expect(days[1].isToday).toBe(false);
    expect(days[0].items).toEqual([
      { time: '16:00', kind: 'session', name: 'Test' },
      { time: '18:00', kind: 'free' },
    ]);
  });

  it('starts from the next working day when today is not one', () => {
    expect(clinicDays(hours, [], [], '2026-12-02', 1)[0].ymd).toBe('2026-12-04');
  });
});

describe('free this week', () => {
  it('runs from today through the next seven days', () => {
    const slots = [slot('2026-12-01T18:00'), slot('2026-12-04T17:00'), slot('2026-12-08T18:00'), slot('2026-12-11T17:00')];
    expect(slotsNextWeek(slots, '2026-12-01').map(s => s.local)).toEqual(['2026-12-01T18:00', '2026-12-04T17:00', '2026-12-08T18:00']);
    expect(slotsNextWeek(slots, '2026-12-04').map(s => s.local)).toEqual(['2026-12-01T18:00', '2026-12-04T17:00', '2026-12-08T18:00', '2026-12-11T17:00']);
  });
});

describe('cadence', () => {
  it('reads weekly and fortnightly from the nearest two sessions', () => {
    expect(cadenceLabel(client([sess('a', '2026-12-01T16:00:00Z'), sess('b', '2026-12-08T16:00:00Z')]))).toBe('Weekly');
    expect(cadenceLabel(client([sess('a', '2026-12-01T16:00:00Z'), sess('b', '2026-12-15T16:00:00Z')]))).toBe('Every 2 wks');
    expect(cadenceLabel(client([sess('a', '2026-12-01T16:00:00Z')]))).toBe('One-off');
  });
});
