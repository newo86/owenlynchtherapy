import { describe, it, expect } from 'vitest';
import {
  sessionsNeedingPrompt, nextMorning, promptLabel, withinSendingHours,
  type PromptSession, type PromptRow,
} from './paymentPrompts';

// Made-up clients only. sessionMinutes is 50, so a 16:00Z session ends 16:50Z.
const now = new Date('2026-12-02T18:00:00Z');
const sess = (id: string, session_date: string, over: Partial<PromptSession> = {}): PromptSession => ({
  id, session_date, status: 'attended', payment_status: 'unpaid', fee: 8000, ...over,
});
const ids = (l: PromptSession[]) => l.map(s => s.id);

describe('sessionsNeedingPrompt', () => {
  it('includes an unpaid session that ended over 15 minutes ago', () => {
    expect(ids(sessionsNeedingPrompt([sess('a', '2026-12-02T16:00:00Z')], [], now))).toEqual(['a']);
  });
  it('waits until 15 minutes after the end', () => {
    // ends 17:45, due from 18:00
    const s = sess('a', '2026-12-02T16:55:00Z');
    expect(sessionsNeedingPrompt([s], [], new Date('2026-12-02T17:59:00Z'))).toHaveLength(0);
    expect(sessionsNeedingPrompt([s], [], new Date('2026-12-02T18:00:00Z'))).toHaveLength(1);
  });
  it('ignores sessions still in progress or in the future', () => {
    expect(sessionsNeedingPrompt([sess('a', '2026-12-02T17:30:00Z'), sess('b', '2026-12-03T16:00:00Z')], [], now)).toHaveLength(0);
  });
  it('ignores sessions that started more than 7 days ago', () => {
    expect(sessionsNeedingPrompt([sess('old', '2026-11-24T16:00:00Z'), sess('ok', '2026-11-26T16:00:00Z')], [], now).map(s => s.id)).toEqual(['ok']);
  });
  it('only scheduled or attended, never cancelled or no-show', () => {
    const list = [
      sess('s', '2026-12-02T10:00:00Z', { status: 'scheduled' }),
      sess('a', '2026-12-02T11:00:00Z', { status: 'attended' }),
      sess('c', '2026-12-02T12:00:00Z', { status: 'cancelled' }),
      sess('n', '2026-12-02T13:00:00Z', { status: 'no_show' }),
    ];
    expect(ids(sessionsNeedingPrompt(list, [], now))).toEqual(['s', 'a']);
  });
  it('skips paid, refunded and zero-fee sessions', () => {
    const list = [
      sess('p', '2026-12-02T10:00:00Z', { payment_status: 'paid' }),
      sess('r', '2026-12-02T11:00:00Z', { payment_status: 'refunded' }),
      sess('z', '2026-12-02T12:00:00Z', { fee: 0 }),
      sess('u', '2026-12-02T13:00:00Z'),
    ];
    expect(ids(sessionsNeedingPrompt(list, [], now))).toEqual(['u']);
  });
  it('skips resolved prompts, and snoozed ones until the snooze passes', () => {
    const list = [sess('res', '2026-12-02T10:00:00Z'), sess('snz', '2026-12-02T11:00:00Z'), sess('woke', '2026-12-02T12:00:00Z')];
    const prompts: PromptRow[] = [
      { session_id: 'res', prompt_count: 1, snoozed_until: null, resolved_at: '2026-12-02T12:00:00Z' },
      { session_id: 'snz', prompt_count: 1, snoozed_until: '2026-12-03T09:00:00Z', resolved_at: null },
      { session_id: 'woke', prompt_count: 1, snoozed_until: '2026-12-02T17:00:00Z', resolved_at: null },
    ];
    expect(ids(sessionsNeedingPrompt(list, prompts, now))).toEqual(['woke']);
    expect(ids(sessionsNeedingPrompt(list, prompts, now, { forDashboard: true }))).toEqual(['snz', 'woke']);
  });
  it('does not re-ask within 18 hours of the last prompt', () => {
    const list = [sess('x', '2026-12-02T10:00:00Z')];
    const at = (iso: string): PromptRow[] => [{ session_id: 'x', prompt_count: 1, last_prompted_at: iso, snoozed_until: null, resolved_at: null }];
    expect(sessionsNeedingPrompt(list, at('2026-12-02T17:00:00Z'), now)).toHaveLength(0);
    expect(sessionsNeedingPrompt(list, at('2026-12-01T20:00:00Z'), now)).toHaveLength(1);
    expect(sessionsNeedingPrompt(list, at('2026-12-02T17:00:00Z'), now, { forDashboard: true })).toHaveLength(1);
  });
  it('stops after 5 prompts (the dashboard still lists it)', () => {
    const list = [sess('x', '2026-12-02T10:00:00Z')];
    const prompts: PromptRow[] = [{ session_id: 'x', prompt_count: 5, snoozed_until: null, resolved_at: null }];
    expect(sessionsNeedingPrompt(list, prompts, now)).toHaveLength(0);
    expect(sessionsNeedingPrompt(list, [{ ...prompts[0], prompt_count: 4 }], now)).toHaveLength(1);
    expect(sessionsNeedingPrompt(list, prompts, now, { forDashboard: true })).toHaveLength(1);
  });
});

describe('nextMorning', () => {
  it('is 09:00 Dublin the next day in winter (UTC+0)', () => {
    expect(nextMorning(new Date('2026-12-02T18:00:00Z')).toISOString()).toBe('2026-12-03T09:00:00.000Z');
  });
  it('is 09:00 Dublin the next day in summer (UTC+1)', () => {
    expect(nextMorning(new Date('2026-07-10T15:00:00Z')).toISOString()).toBe('2026-07-11T08:00:00.000Z');
  });
  it('uses the Dublin date, not the UTC date, late at night in summer', () => {
    // 23:30 UTC on 10 Jul is 00:30 on 11 Jul in Dublin -> next morning is 12 Jul
    expect(nextMorning(new Date('2026-07-10T23:30:00Z')).toISOString()).toBe('2026-07-12T08:00:00.000Z');
  });
  it('is right across the spring clock change (28 Mar 2027)', () => {
    expect(nextMorning(new Date('2027-03-27T20:00:00Z')).toISOString()).toBe('2027-03-28T08:00:00.000Z');
  });
  it('is right across the autumn clock change (25 Oct 2026)', () => {
    expect(nextMorning(new Date('2026-10-24T20:00:00Z')).toISOString()).toBe('2026-10-25T09:00:00.000Z');
  });
});

describe('promptLabel', () => {
  it('is first name plus last initial', () => {
    expect(promptLabel({ full_name: 'Aoife Example' })).toBe('Aoife E.');
    expect(promptLabel({ full_name: '  test   client  ' })).toBe('test C.');
  });
  it('handles one name and several names', () => {
    expect(promptLabel({ full_name: 'Aoife' })).toBe('Aoife');
    expect(promptLabel({ full_name: 'Aoife Mary Example' })).toBe('Aoife E.');
  });
});

describe('withinSendingHours', () => {
  it('allows 08:00 to 22:00 Dublin only', () => {
    expect(withinSendingHours(new Date('2026-12-02T07:59:00Z'))).toBe(false);
    expect(withinSendingHours(new Date('2026-12-02T08:00:00Z'))).toBe(true);
    expect(withinSendingHours(new Date('2026-12-02T21:59:00Z'))).toBe(true);
    expect(withinSendingHours(new Date('2026-12-02T22:00:00Z'))).toBe(false);
  });
  it('follows Dublin summer time', () => {
    expect(withinSendingHours(new Date('2026-07-10T06:59:00Z'))).toBe(false); // 07:59 IST
    expect(withinSendingHours(new Date('2026-07-10T07:00:00Z'))).toBe(true);
    expect(withinSendingHours(new Date('2026-07-10T21:00:00Z'))).toBe(false); // 22:00 IST
  });
});
