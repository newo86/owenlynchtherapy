import { describe, it, expect, vi, beforeEach } from 'vitest';

// Owen's dashboard and the emails he receives moved to the 24-hour clock
// (Nov 2026). Emails to CLIENTS must not: they keep "6:00 pm". Made-up data.
const send = vi.hoisted(() => vi.fn());
const captured = vi.hoisted(() => ({ reminderTime: '', receiptTime: '' }));

vi.mock('@/lib/supabase', () => {
  const session = {
    id: 's1', client_id: 'c1', fee: 8000, status: 'scheduled', session_format: 'in_person',
    format_confirmed: true, payment_status: 'unpaid', receipt_sent_at: null, gcal_event_id: null,
    session_date: '2026-11-10T18:00:00Z',
    clients: { full_name: 'Test Client', email: 'test.client@example.com', is_low_cost: false },
  };
  const q: Record<string, unknown> = {};
  const chain = () => q;
  Object.assign(q, {
    select: chain, eq: chain, is: chain, limit: async () => ({ data: [], error: null }),
    single: async () => ({ data: session, error: null }),
    insert: async () => ({ error: null }),
    delete: chain,
    update: () => {
      const u: Record<string, unknown> = {};
      Object.assign(u, { eq: () => u, is: () => u, select: async () => ({ data: [{ id: 's1' }], error: null }), then: (r: (v: unknown) => void) => r({ error: null }) });
      return u;
    },
  });
  return { dbError: (e: unknown) => e, supabaseAdmin: { from: () => q } };
});
vi.mock('@/lib/resend', () => ({ getResend: () => ({ emails: { send } }) }));
vi.mock('@/lib/emailTemplates', () => ({
  buildReminderHtml: (a: { time: string }) => { captured.reminderTime = a.time; return '<p>reminder</p>'; },
  buildReceiptHtml: (a: { time: string }) => { captured.receiptTime = a.time; return '<p>receipt</p>'; },
  paymentLinkFor: () => 'https://example.com/pay', sessionKind: () => 'in_person',
  inPersonAddressFor: () => 'Test Venue', EMAIL_FROM: 'x@example.com',
}));
vi.mock('@/lib/reminderOptOut', () => ({ reminderOptOutUrl: () => 'https://example.com/optout' }));
vi.mock('@/practice.config', () => ({ PRACTICE: { practitionerName: 'Test Therapist' } }));
vi.mock('googleapis', () => ({ google: {} }));
vi.mock('@/lib/googleOAuth', () => ({ getAuthorizedClient: async () => null }));

import { sendSessionReminder } from './sendSessionReminder';
import { sendReceiptEmail } from './sendReceiptEmail';
import { formatShortWhen, formatClock24 } from './dateUtils';

describe('client emails keep the 12-hour clock', () => {
  beforeEach(() => {
    send.mockReset().mockResolvedValue({ error: null });
    process.env.EMAILS_ENABLED = 'true';
    captured.reminderTime = '';
    captured.receiptTime = '';
  });

  it('the session reminder still says 6:00 pm, not 18:00', async () => {
    const r = await sendSessionReminder('s1');
    expect(r.success).toBe(true);
    expect(captured.reminderTime).toMatch(/^6:00\s?pm$/i);
  });

  it('the receipt email still says 6:00 pm, not 18:00', async () => {
    const r = await sendReceiptEmail(
      { id: 's1', fee: 8000, session_date: '2026-11-10T18:00:00Z', session_format: 'in_person' },
      { full_name: 'Test Client', email: 'test.client@example.com' },
    );
    expect(r).toBe('sent');
    expect(captured.receiptTime).toMatch(/^6:00\s?pm$/i);
  });
});

describe('Owen-facing times are 24-hour', () => {
  it('formatShortWhen and formatClock24 print 18:00', () => {
    expect(formatShortWhen('2026-11-10T18:00:00Z')).toBe('Tue 10 Nov, 18:00');
    expect(formatClock24('2026-11-10T18:00:00Z')).toBe('18:00');
    expect(formatClock24('2026-07-07T07:05:00Z')).toBe('08:05');
  });
});
