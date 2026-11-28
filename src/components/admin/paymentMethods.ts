// "How people paid" (Money, desktop and phone). Uses the recorded `paid_via`
// when a session has one; otherwise the old derivation from the session itself
// (a Stripe payment = card, a low-cost client = cash, anything else = Revolut
// or a bank transfer). Pure, so it is unit tested.
import type { ClientRow, SessionRow } from './types';

export type PayLabel = 'Revolut' | 'Cash' | 'Card' | 'Card (Stripe)' | 'Other' | 'Revolut or bank transfer';

const BY_VIA: Record<string, PayLabel> = {
  revolut: 'Revolut', cash: 'Cash', card: 'Card', stripe: 'Card (Stripe)', other: 'Other',
};

/** The label for one paid session. */
export function howPaid(s: Pick<SessionRow, 'paid_via' | 'stripe_payment_intent_id'>, c: Pick<ClientRow, 'is_low_cost'>): PayLabel {
  const recorded = s.paid_via ? BY_VIA[s.paid_via] : undefined;
  if (recorded) return recorded;
  if (s.stripe_payment_intent_id) return 'Card (Stripe)';
  if (c.is_low_cost) return 'Cash';
  return 'Revolut or bank transfer';
}

const ORDER: PayLabel[] = ['Revolut', 'Revolut or bank transfer', 'Cash', 'Card', 'Card (Stripe)', 'Other'];

/** Cents per label for the given paid sessions, biggest groups in a steady order, zero groups left out. */
export function paidByMethod(paid: Array<{ s: SessionRow; c: ClientRow }>): Array<{ label: PayLabel; cents: number }> {
  const sums = new Map<PayLabel, number>();
  for (const { s, c } of paid) sums.set(howPaid(s, c), (sums.get(howPaid(s, c)) ?? 0) + (s.fee ?? 0));
  return ORDER.filter(l => (sums.get(l) ?? 0) > 0).map(label => ({ label, cents: sums.get(label)! }));
}

/** The Revolut / Cash / Card choice offered when marking paid. */
export const PAY_CHOICES = [
  { value: 'revolut', label: 'Revolut' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
] as const;
export type PayChoice = (typeof PAY_CHOICES)[number]['value'];

/** Low-cost clients pay cash, so that is what the choice starts on. */
export const defaultPayChoice = (c: Pick<ClientRow, 'is_low_cost'>): PayChoice => (c.is_low_cost ? 'cash' : 'revolut');
