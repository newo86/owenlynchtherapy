import { describe, it, expect, vi, beforeEach } from 'vitest';

// Made-up data. A stand-in payments table that can pretend the paid_via column
// has not been added yet (the migration is applied separately).
const db = vi.hoisted(() => ({ rows: [] as Array<Record<string, unknown>>, hasColumn: true, calls: 0 }));

vi.mock('@/lib/supabase', () => ({
  dbError: (e: unknown) => String(e),
  supabaseAdmin: {
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        db.calls++;
        if (!db.hasColumn && 'paid_via' in row) {
          return { error: { code: '42703', message: 'column "paid_via" of relation "payments" does not exist' } };
        }
        db.rows.push(row);
        return { error: null };
      },
    }),
  },
}));

import { parsePaidVia, isMissingPaidViaColumn, insertPaymentRow, PAID_VIA } from './paidVia';

const row = { session_id: 's1', client_id: 'c1', amount_cents: 8000, currency: 'eur', session_type: 'in_person', method: 'manual', paid_at: '2026-11-24T16:00:00Z' };

describe('parsePaidVia (what the routes accept)', () => {
  it('accepts every listed value', () => {
    for (const v of PAID_VIA) expect(parsePaidVia(v)).toEqual({ ok: true, value: v });
  });
  it('absent means "default unchanged"', () => {
    expect(parsePaidVia(undefined)).toEqual({ ok: true, value: undefined });
    expect(parsePaidVia(null)).toEqual({ ok: true, value: undefined });
  });
  it('rejects anything else (the routes answer 400)', () => {
    for (const bad of ['Revolut', 'bank', '', 'REVOLUT', 7, true, {}, ['cash']]) {
      expect(parsePaidVia(bad)).toEqual({ ok: false });
    }
  });
});

describe('isMissingPaidViaColumn', () => {
  it('recognises the Postgres and PostgREST wording', () => {
    expect(isMissingPaidViaColumn({ code: '42703', message: 'column "paid_via" of relation "payments" does not exist' })).toBe(true);
    expect(isMissingPaidViaColumn({ code: 'PGRST204', message: "Could not find the 'paid_via' column of 'payments' in the schema cache" })).toBe(true);
  });
  it('does not swallow other errors', () => {
    expect(isMissingPaidViaColumn({ code: '23503', message: 'violates foreign key constraint' })).toBe(false);
    expect(isMissingPaidViaColumn({ code: '42703', message: 'column "other" does not exist' })).toBe(false);
    expect(isMissingPaidViaColumn(null)).toBe(false);
  });
});

describe('insertPaymentRow', () => {
  beforeEach(() => { db.rows = []; db.hasColumn = true; db.calls = 0; });

  it('stores paid_via on the ledger row', async () => {
    expect(await insertPaymentRow(row, 'revolut')).toBeNull();
    expect(db.rows[0]).toMatchObject({ method: 'manual', paid_via: 'revolut' });
  });
  it('default unchanged when absent: no paid_via key at all', async () => {
    expect(await insertPaymentRow(row, undefined)).toBeNull();
    expect('paid_via' in db.rows[0]).toBe(false);
  });
  it('keeps working before the migration: retries without the column', async () => {
    db.hasColumn = false;
    expect(await insertPaymentRow(row, 'cash')).toBeNull();
    expect(db.calls).toBe(2);
    expect(db.rows).toHaveLength(1);
    expect('paid_via' in db.rows[0]).toBe(false);
    expect(db.rows[0]).toMatchObject({ method: 'manual', amount_cents: 8000 });
  });
});
