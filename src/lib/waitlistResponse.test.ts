import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifyWaitlistToken, waitlistResponseUrl } from './waitlistResponse';

const tokenFrom = (url: string) => new URL(url).searchParams.get('t')!;

describe('waiting-list reply links', () => {
  beforeEach(() => { process.env.SESSION_SIGNING_KEY = 'test-secret-for-waitlist-links'; });
  afterEach(() => { delete process.env.SESSION_SIGNING_KEY; });

  it('round-trips the id and send time', () => {
    const sent = new Date();
    const t = tokenFrom(waitlistResponseUrl('abc-123', sent, 'yes')!);
    expect(verifyWaitlistToken(t)).toEqual({ id: 'abc-123', sentAtMs: sent.getTime() });
  });

  it('rejects a link for someone else, or a changed send time', () => {
    const sent = new Date();
    const t = tokenFrom(waitlistResponseUrl('abc-123', sent, 'no')!);
    const [, ms, sig] = t.split('.');
    expect(verifyWaitlistToken(`someone-else.${ms}.${sig}`)).toBeNull();
    expect(verifyWaitlistToken(`abc-123.${Number(ms) + 1}.${sig}`)).toBeNull();
    expect(verifyWaitlistToken('abc-123')).toBeNull();
  });

  it('expires after 60 days', () => {
    const old = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000);
    expect(verifyWaitlistToken(tokenFrom(waitlistResponseUrl('abc-123', old, 'yes')!))).toBeNull();
  });
});
