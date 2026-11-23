import { describe, expect, it } from 'vitest';
import { DEFAULT_WAITLIST_MESSAGE, hasButtons, messageBlocks } from './waitlistMessage';
import { buildWaitlistMessageHtml } from './emailTemplates';

describe('waiting-list message', () => {
  it('fills in the first name and places the buttons where [buttons] is', () => {
    const blocks = messageBlocks(DEFAULT_WAITLIST_MESSAGE, 'Jane');
    expect(blocks[0]).toEqual({ kind: 'text', lines: ['Hi Jane,'] });
    expect(blocks.filter(b => b.kind === 'buttons')).toHaveLength(1);
    expect(hasButtons(DEFAULT_WAITLIST_MESSAGE)).toBe(true);
  });

  it('has no buttons without the marker', () => {
    expect(hasButtons('Hi [first name],\n\nJust an update.')).toBe(false);
  });

  it('escapes everything typed into the message and the name', () => {
    const html = buildWaitlistMessageHtml({
      firstName: '<b>Jane</b>',
      message: 'Hi [first name],\n\n<script>alert(1)</script> & "quotes"\n\n[buttons]',
      yesUrl: 'https://owenlynchtherapy.com/waitlist/respond?t=x&a=yes',
      noUrl: 'https://owenlynchtherapy.com/waitlist/respond?t=x&a=no',
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<b>Jane</b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Yes, keep me on the list');
  });

  it('falls back to "there" with no first name', () => {
    expect(messageBlocks('Hi [first name],', '')[0]).toEqual({ kind: 'text', lines: ['Hi there,'] });
  });
});
