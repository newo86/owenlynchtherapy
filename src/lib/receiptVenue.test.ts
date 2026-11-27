import { describe, it, expect } from 'vitest';
import { buildReceiptHtml, inPersonAddressFor } from './emailTemplates';

// Made-up client. 24 Nov 2026 is a Tuesday, 27 Nov 2026 a Friday (Dublin = UTC+0 in winter).
const receipt = (iso: string) => buildReceiptHtml({
  firstName: 'Aoife', fullName: 'Aoife Example', date: 'x', time: 'y', feeEuros: 80,
  sessionFormat: 'in_person', inPersonAddress: inPersonAddressFor(iso),
});

describe('receipt venue', () => {
  it('a Friday 4pm in-person session shows Baggot Street', () => {
    const html = receipt('2026-11-27T16:00:00Z');
    expect(html).toContain('124 Baggot Street Lower');
    expect(html).not.toContain('Capel Street');
  });
  it('a Tuesday in-person session shows Capel Street', () => {
    expect(receipt('2026-11-24T16:00:00Z')).toContain('Capel Street');
  });
});
