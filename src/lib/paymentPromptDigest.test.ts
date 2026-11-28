import { describe, it, expect } from 'vitest';
import { buildPaymentPromptDigestHtml } from './emailTemplates';

const base = { sessionId: 's1', label: 'Aoife E.', when: 'Tue 24 Nov, 16:00' };
const build = (item: Record<string, unknown>) =>
  buildPaymentPromptDigestHtml({ origin: 'https://example.test', moreCount: 0, items: [{ ...base, ...item } as never] });

describe('payment prompt digest', () => {
  it('offers the receipt button only when one can be sent, and never names an amount', () => {
    const html = build({ canEmailReceipt: true });
    expect(html).toContain('Paid, email receipt');
    expect(html).not.toContain('&euro;');
  });
  it('without an address: no receipt button, a plain explanation', () => {
    const html = build({ canEmailReceipt: false });
    expect(html).not.toContain('Paid, email receipt');
    expect(html).toContain('Paid, no receipt');
    expect(html).toContain('No email address on file, so no receipt can be sent.');
  });
  it('after a receipt already went, says so', () => {
    expect(build({ canEmailReceipt: false, receiptAlreadySent: true })).toContain('A receipt already went.');
  });
});
