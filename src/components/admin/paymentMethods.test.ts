import { describe, it, expect } from 'vitest';
import { howPaid, paidByMethod, defaultPayChoice } from './paymentMethods';
import type { ClientRow, SessionRow } from './types';

const client = (low = false) => ({ is_low_cost: low }) as ClientRow;
const sess = (o: Partial<SessionRow>) => ({ fee: 8000, ...o }) as SessionRow;

describe('howPaid', () => {
  it('uses the recorded paid_via when present', () => {
    expect(howPaid(sess({ paid_via: 'revolut' }), client())).toBe('Revolut');
    expect(howPaid(sess({ paid_via: 'cash' }), client())).toBe('Cash');
    expect(howPaid(sess({ paid_via: 'card' }), client())).toBe('Card');
    expect(howPaid(sess({ paid_via: 'stripe' }), client())).toBe('Card (Stripe)');
  });
  it('the recorded answer beats the old guess (a low-cost client who paid by Revolut)', () => {
    expect(howPaid(sess({ paid_via: 'revolut' }), client(true))).toBe('Revolut');
  });
  it('falls back to the old derivation when there is no paid_via (column not applied yet)', () => {
    expect(howPaid(sess({ stripe_payment_intent_id: 'pi_test' }), client())).toBe('Card (Stripe)');
    expect(howPaid(sess({}), client(true))).toBe('Cash');
    expect(howPaid(sess({}), client())).toBe('Revolut or bank transfer');
    expect(howPaid(sess({ paid_via: null }), client())).toBe('Revolut or bank transfer');
  });
  it('an unknown stored value falls back rather than showing nothing', () => {
    expect(howPaid(sess({ paid_via: 'something-new' }), client())).toBe('Revolut or bank transfer');
  });
});

describe('paidByMethod', () => {
  it('adds up per label and drops empty ones', () => {
    const rows = [
      { s: sess({ paid_via: 'revolut' }), c: client() },
      { s: sess({ paid_via: 'revolut', fee: 5000 }), c: client() },
      { s: sess({ paid_via: 'cash' }), c: client(true) },
      { s: sess({}), c: client() },
    ];
    expect(paidByMethod(rows)).toEqual([
      { label: 'Revolut', cents: 13000 },
      { label: 'Revolut or bank transfer', cents: 8000 },
      { label: 'Cash', cents: 8000 },
    ]);
  });
});

describe('defaultPayChoice', () => {
  it('Revolut, or Cash for a low-cost client', () => {
    expect(defaultPayChoice(client())).toBe('revolut');
    expect(defaultPayChoice(client(true))).toBe('cash');
  });
});
