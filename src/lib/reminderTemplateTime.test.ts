import { describe, it, expect } from 'vitest';
import { buildReminderHtml } from './emailTemplates';
import { formatClientTime } from './dateUtils';

// Unmocked: the real reminder template, with the client time as clients see it.
describe('the real reminder template', () => {
  it('says "at 6:00 pm", never 18:00', () => {
    const html = buildReminderHtml({
      firstName: 'Test', time: formatClientTime(new Date('2026-11-10T18:00:00Z')), dayPhrase: 'today', kind: 'in_person',
      sessionFormat: 'in_person', paymentUrl: 'https://example.com/pay', alreadyPaid: false, address: 'Test Venue',
    } as Parameters<typeof buildReminderHtml>[0]);
    expect(html).toContain('at 6:00 pm');
    expect(html).not.toContain('18:00');
  });
});
