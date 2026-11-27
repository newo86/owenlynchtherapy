import { describe, it, expect, vi, beforeEach } from 'vitest';

// Made-up data only. A tiny in-memory stand-in for the sessions/payments tables.
const db = { payment_status: 'unpaid', ledger: [] as unknown[] };

vi.mock('@/lib/supabase', () => ({
  dbError: (e: unknown) => String(e),
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'payments') {
        return { insert: async (row: unknown) => { db.ledger.push(row); return { error: null }; } };
      }
      const state: { patch?: Record<string, unknown>; conds: Record<string, unknown>; select?: boolean } = { conds: {} };
      const q: Record<string, unknown> = {
        select: (cols?: string) => {
          if (state.patch) { state.select = true; return q; }
          void cols;
          return q;
        },
        update: (patch: Record<string, unknown>) => { state.patch = patch; return q; },
        eq: (k: string, v: unknown) => { state.conds[k] = v; return q; },
        single: async () => ({
          data: { id: 's1', client_id: 'c1', fee: 8000, session_format: 'online', payment_status: db.payment_status, receipt_sent_at: null, session_date: '2026-11-24T16:00:00Z', clients: { id: 'c1', full_name: 'Test Client', email: 't@example.com' } },
          error: null,
        }),
        then: (resolve: (v: unknown) => void) => {
          // Only the payment flip is conditional on payment_status.
          if (state.patch && 'payment_status' in state.patch) {
            const ok = db.payment_status === state.conds.payment_status;
            if (ok) db.payment_status = 'paid';
            resolve({ data: ok ? [{ id: 's1' }] : [], error: null });
          } else resolve({ data: null, error: null });
        },
      };
      return q;
    },
  },
}));
vi.mock('@/lib/emailTemplates', () => ({ sessionKind: () => 'online' }));
vi.mock('@/lib/sendReceiptEmail', () => ({ sendReceiptEmail: async () => 'sent' }));

import { closeOutSession } from './closeOutSession';

describe('closeOutSession: paid is recorded once', () => {
  beforeEach(() => { db.payment_status = 'unpaid'; db.ledger = []; });

  it('two simultaneous taps log exactly one ledger row, and both report paid', async () => {
    const [a, b] = await Promise.all([
      closeOutSession('s1', { record_payment: true }),
      closeOutSession('s1', { record_payment: true }),
    ]);
    expect(db.ledger).toHaveLength(1);
    expect(a.ok && a.paid).toBe(true);
    expect(b.ok && b.paid).toBe(true);
  });

  it('a refunded session is not reported paid and gets no receipt', async () => {
    db.payment_status = 'refunded';
    const r = await closeOutSession('s1', { record_payment: true, send_receipt: true });
    expect(r.ok && r.paid).toBe(false);
    expect(r.ok && r.receipt_sent).toBe(false);
    expect(db.ledger).toHaveLength(0);
  });
});
