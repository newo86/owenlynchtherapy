import { describe, it, expect, vi } from 'vitest';

// C6: if the series table can't be read, the follow step must do nothing
// (a series read as "no series" would be judged like a plain repeat).
// A tiny stand-in for the Supabase client; made-up data only.
const failTable = { name: '' };
vi.mock('@/lib/supabase', () => {
  const builder = (table: string) => {
    const result = table === failTable.name
      ? { data: null, error: { message: 'relation does not exist' } }
      : { data: [], error: null };
    const q: Record<string, unknown> = {};
    for (const k of ['select', 'eq', 'gt', 'gte', 'not', 'order', 'limit', 'in', 'is']) q[k] = () => q;
    q.then = (resolve: (v: unknown) => void) => resolve(result);
    return q;
  };
  return { dbError: (e: unknown) => ({ message: String((e as { message?: string })?.message ?? e) }), supabaseAdmin: { from: builder } };
});
vi.mock('@/lib/resend', () => ({ getResend: () => ({ emails: { send: async () => ({ data: null, error: null }) } }) }));

import { supabaseFollowStore } from './followGoogleStore';

describe('supabaseFollowStore.loadInput', () => {
  it('returns null (no action) when session_series can not be read', async () => {
    failTable.name = 'session_series';
    expect(await supabaseFollowStore.loadInput(new Date('2026-11-28T12:00:00Z'))).toBeNull();
  });

  it('returns null when the sessions read fails', async () => {
    failTable.name = 'sessions';
    expect(await supabaseFollowStore.loadInput(new Date('2026-11-28T12:00:00Z'))).toBeNull();
  });

  it('loads when every read works', async () => {
    failTable.name = '';
    expect(await supabaseFollowStore.loadInput(new Date('2026-11-28T12:00:00Z'))).toMatchObject({ sessions: [], series: [] });
  });
});
