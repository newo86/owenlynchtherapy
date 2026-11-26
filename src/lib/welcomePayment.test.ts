import { describe, it, expect } from 'vitest';
import { welcomePaymentStep } from './emailTemplates';

const STRIPE = 'https://buy.stripe.com/test_abc?client_reference_id=s1';
const REVOLUT = 'https://checkout.revolut.com/pay/test-link';

describe('welcomePaymentStep (new-client welcome email)', () => {
  it('uses the Revolut link, not Stripe, when a Revolut link is set', () => {
    const html = welcomePaymentStep({ stripeUrl: STRIPE, feeEuros: 80, revolutUrl: REVOLUT });
    expect(html).toContain(`href="${REVOLUT}"`);
    expect(html).not.toContain('stripe');
    expect(html).not.toContain('Stripe');
    expect(html).toContain('via Revolut');
  });

  it('states the fee in words, since a Revolut link does not carry the amount', () => {
    const html = welcomePaymentStep({ stripeUrl: STRIPE, feeEuros: 70, revolutUrl: REVOLUT });
    expect(html).toContain('Your first session is &euro;70');
  });

  it('falls back to the Stripe link only when no Revolut link is set', () => {
    const html = welcomePaymentStep({ stripeUrl: STRIPE, feeEuros: 80, revolutUrl: '' });
    expect(html).toContain(`href="${STRIPE}"`);
    expect(html).toContain('via Stripe');
    expect(html).toContain('PAY &euro;80 FOR YOUR FIRST SESSION');
    expect(html).not.toContain('Revolut');
  });

  it('says payment details will follow when there is no link at all', () => {
    const html = welcomePaymentStep({ stripeUrl: '', feeEuros: 80, revolutUrl: '' });
    expect(html).not.toContain('href=');
    expect(html).toContain('will send you payment details separately');
  });

  it("uses the practice's configured Revolut link by default", () => {
    const html = welcomePaymentStep({ stripeUrl: STRIPE, feeEuros: 80 });
    expect(html).toContain('checkout.revolut.com');
    expect(html).not.toContain('buy.stripe.com');
  });
});

describe('inPersonAddressFor', () => {
  it('Fridays are at Baggot Street, other days at the main venue', async () => {
    const { inPersonAddressFor, INSIGHT_MATTERS_ADDRESS } = await import('./emailTemplates');
    expect(inPersonAddressFor('2026-11-27T16:00:00Z')).toBe('124 Baggot Street Lower, Dublin 2');   // Fri 4pm
    expect(inPersonAddressFor('2026-11-24T17:00:00Z')).toBe(INSIGHT_MATTERS_ADDRESS);               // Tue
    expect(inPersonAddressFor('2027-07-02T23:30:00Z')).toBe(INSIGHT_MATTERS_ADDRESS);               // 00:30 Saturday in Dublin (summer time)
  });
});
