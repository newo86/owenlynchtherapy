import { describe, it, expect } from 'vitest';
import { attentionNotices, unlinkedEvents } from './needsAttention';
import type { CalendarEvent, ClientRow, SessionRow, TokenRow } from './types';

// Made-up clients only. "Now" is Tuesday 24 Nov 2026, 18:00 Dublin (GMT).
const NOW = new Date('2026-11-24T18:00:00Z');
const day = (n: number, h = 16) => new Date(Date.UTC(2026, 10, 24 + n, h)).toISOString();

const sess = (id: string, o: Partial<SessionRow>): SessionRow => ({
  id, client_id: 'c1', session_date: day(-1), session_format: 'in_person', location: null, fee: 8000,
  status: 'attended', payment_status: 'unpaid', stripe_payment_link_url: null, receipt_sent_at: null, notes: null, ...o,
});
const client = (sessions: SessionRow[], name = 'Aoife Example'): ClientRow => ({
  id: 'c1', full_name: name, email: 'aoife@example.com', phone: null, date_of_birth: null,
  emergency_contact_name: null, emergency_contact_phone: null, gp_name: null, gp_phone: null,
  session_fee: 8000, status: 'active', created_at: day(-60), sessions,
});

describe('attentionNotices', () => {
  it('is empty when nothing needs attention', () => {
    expect(attentionNotices([client([sess('a', { payment_status: 'paid', receipt_sent_at: day(-1) })])], [], [], NOW)).toEqual([]);
  });

  it('unpaid counts only sessions older than the 7-day prompt window', () => {
    const c = client([
      sess('recent', { session_date: day(-3) }),          // inside the window: a prompt handles it
      sess('old1', { session_date: day(-9) }),
      sess('old2', { session_date: day(-20), fee: 6000 }),
      sess('cancelled', { session_date: day(-20), status: 'cancelled' }),
      sess('future', { session_date: day(3), status: 'scheduled' }),
    ]);
    const [n] = attentionNotices([c], [], [], NOW);
    expect(n).toMatchObject({ key: 'unpaid', count: 2 });
    expect(n.hint).toContain('€140');
  });

  it('receipts counts paid past sessions with no receipt, not unpaid ones', () => {
    const c = client([
      sess('p1', { payment_status: 'paid', receipt_sent_at: null }),
      sess('p2', { payment_status: 'paid', receipt_sent_at: day(-1) }),
      sess('u', { payment_status: 'unpaid' }),
    ]);
    const list = attentionNotices([c], [], [], NOW);
    expect(list.find(n => n.key === 'receipts')?.count).toBe(1);
  });

  it('forms counts unused, unexpired links', () => {
    const t = (id: string, o: Partial<TokenRow>): TokenRow => ({ id, token: id, client_name: 'Test Client', client_email: 'test@example.com', created_at: day(-1), expires_at: day(5), is_used: false, ...o });
    const list = attentionNotices([], [t('a', {}), t('b', { is_used: true }), t('c', { expires_at: day(-1) })], [], NOW);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ key: 'forms', count: 1 });
  });

  it('keeps each notice out when its count is zero, and orders them unpaid, receipts, forms, unlinked', () => {
    const c = client([sess('old', { session_date: day(-9), payment_status: 'unpaid' }), sess('r', { payment_status: 'paid' })]);
    const ev: CalendarEvent = { id: 'g1', title: 'Supervision', start: day(1, 12), end: day(1, 13) };
    const keys = attentionNotices([c], [{ id: 't', token: 't', client_name: null, client_email: null, created_at: day(-1), expires_at: day(5), is_used: false }], [ev], NOW).map(n => n.key);
    expect(keys).toEqual(['unpaid', 'receipts', 'forms', 'unlinked']);
  });
});

describe('unlinkedEvents', () => {
  const c = client([sess('s', { session_date: day(1, 16), status: 'scheduled', gcal_event_id: 'g-linked' })]);
  const ev = (id: string, o: Partial<CalendarEvent>): CalendarEvent => ({ id, title: 'Something', start: day(2, 12), end: day(2, 13), ...o });

  it('leaves out linked, all-day and free events', () => {
    const list = unlinkedEvents([c], [
      ev('g-linked', { start: day(1, 16), end: day(1, 17) }),
      ev('allday', { allDay: true }),
      ev('free', { free: true }),
      ev('personal', { title: 'Supervision' }),
    ]);
    expect(list.map(e => e.id)).toEqual(['personal']);
  });
});
