import { describe, it, expect, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {}, dbError: (e: unknown) => ({ message: String(e) }) }));
vi.mock('@/lib/calendarFix', () => ({ applyDriftChoice: vi.fn() }));
import { planGoogleTruth, MAX_AUTO_CANCELS, MAX_AUTO_CHANGES } from './googleTruth';
import type { DriftItem } from './calendarDrift';

const item = (kind: DriftItem['kind'], over: Partial<DriftItem> = {}): DriftItem => ({
  key: `${kind}:${Math.random()}`, kind, clientId: 'c1', clientName: 'Jake Walsh', ...over,
});

describe('planGoogleTruth', () => {
  it('adds new Google sessions, follows moves and cancels deletions', () => {
    const plan = planGoogleTruth([
      item('only_in_google', { eventId: 'e1', googleStart: '2026-12-11T16:00:00Z' }),
      item('moved_in_google', { sessionId: 's1', eventId: 'e2', appStart: '2026-12-04T16:00:00Z', googleStart: '2026-12-04T15:00:00Z' }),
      item('not_in_google', { sessionId: 's2', appStart: '2026-12-25T16:00:00Z', retry: false }),
    ], new Set());
    expect(plan.changes.map(c => [c.action, c.choice])).toEqual([
      ['added', 'add_to_app'], ['moved', 'keep_google'], ['cancelled', 'cancel_in_app'],
    ]);
    expect(plan.held).toBe(0);
    expect(plan.left).toBe(0);
  });

  it('never touches a paid session; it stays for a tap', () => {
    const plan = planGoogleTruth([
      item('not_in_google', { sessionId: 'paid1', retry: false }),
      item('moved_in_google', { sessionId: 'paid2', eventId: 'e', googleStart: '2026-12-04T15:00:00Z' }),
    ], new Set(['paid1', 'paid2']));
    expect(plan.changes).toEqual([]);
    expect(plan.left).toBe(2);
  });

  it('never brings back a session cancelled in the app', () => {
    const plan = planGoogleTruth([item('cancelled_still_in_google', { sessionId: 's', eventId: 'e' })], new Set());
    expect(plan.changes).toEqual([]);
    expect(plan.left).toBe(1);
  });

  it('leaves a failed app booking to the retry step, not cancelled', () => {
    const plan = planGoogleTruth([item('not_in_google', { sessionId: 's', retry: true })], new Set());
    expect(plan.changes).toEqual([]);
    expect(plan.left).toBe(0);
  });

  it('holds every cancellation when too many vanish at once, but still adds and moves', () => {
    const gone = Array.from({ length: MAX_AUTO_CANCELS + 1 }, (_, i) => item('not_in_google', { sessionId: `s${i}`, retry: false }));
    const plan = planGoogleTruth([...gone, item('only_in_google', { eventId: 'e', googleStart: '2026-12-11T16:00:00Z' })], new Set());
    expect(plan.held).toBe(MAX_AUTO_CANCELS + 1);
    expect(plan.changes.map(c => c.action)).toEqual(['added']);
  });

  it('adds and moves a batch at a time', () => {
    const many = Array.from({ length: MAX_AUTO_CHANGES + 5 }, (_, i) => item('only_in_google', { eventId: `e${i}`, googleStart: '2026-12-11T16:00:00Z' }));
    expect(planGoogleTruth(many, new Set()).changes).toHaveLength(MAX_AUTO_CHANGES);
  });
});
