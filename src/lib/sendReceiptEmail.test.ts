import { describe, it, expect, vi, beforeEach } from 'vitest';

// A tiny in-memory stand-in for the sessions table: enough to model the
// atomic "update ... where receipt_sent_at is null" claim.
const db = vi.hoisted(() => ({ receipt_sent_at: null as string | null }));
const send = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  dbError: (e: unknown) => e,
  supabaseAdmin: {
    from: () => ({
      update: (vals: { receipt_sent_at: string | null }) => {
        let requireNull = false;
        const q = {
          eq: () => q,
          is: () => { requireNull = true; return q; },
          select: async () => {
            if (requireNull && db.receipt_sent_at !== null) return { data: [], error: null };
            db.receipt_sent_at = vals.receipt_sent_at;
            return { data: [{ id: 's1' }], error: null };
          },
          then: (res: (v: unknown) => void) => {
            db.receipt_sent_at = vals.receipt_sent_at;
            res({ error: null });
          },
        };
        return q;
      },
    }),
  },
}));
vi.mock('@/lib/resend', () => ({ getResend: () => ({ emails: { send } }) }));
vi.mock('@/lib/emailTemplates', () => ({ buildReceiptHtml: () => '<p>receipt</p>', EMAIL_FROM: 'x@example.com' }));
vi.mock('@/practice.config', () => ({ PRACTICE: { practitionerName: 'Test' } }));

import { sendReceiptEmail } from './sendReceiptEmail';

const session = { id: 's1', fee: 8000, session_date: '2026-11-10T18:00:00Z', session_format: 'online' };
const client = { full_name: 'Jane Test', email: 'jane@example.com' };

describe('sendReceiptEmail: only once', () => {
  beforeEach(() => {
    db.receipt_sent_at = null;
    send.mockReset().mockResolvedValue({ error: null });
    process.env.EMAILS_ENABLED = 'true';
  });

  it('a double-click sends exactly one email', async () => {
    const results = await Promise.all([
      sendReceiptEmail(session, client),
      sendReceiptEmail(session, client),
    ]);
    expect(results.sort()).toEqual(['already_sent', 'sent']);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('releases the claim when the send fails, so it can be retried', async () => {
    send.mockResolvedValueOnce({ error: { message: 'boom' } });
    expect(await sendReceiptEmail(session, client)).toBe('failed');
    expect(db.receipt_sent_at).toBeNull();
    expect(await sendReceiptEmail(session, client)).toBe('sent');
  });

  it('an explicit forced resend sends even when already sent', async () => {
    db.receipt_sent_at = '2026-11-10T19:00:00Z';
    expect(await sendReceiptEmail(session, client, { force: true })).toBe('sent');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does nothing, and records nothing, while the email kill switch is on', async () => {
    process.env.EMAILS_ENABLED = 'false';
    expect(await sendReceiptEmail(session, client)).toBe('failed');
    expect(send).not.toHaveBeenCalled();
    expect(db.receipt_sent_at).toBeNull();
  });
});
