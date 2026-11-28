import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

// The route refuses an unlisted paid_via before touching the database.
const from = vi.hoisted(() => vi.fn());
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: async () => null }));
vi.mock('@/lib/supabase', () => ({ dbError: (e: unknown) => String(e), supabaseAdmin: { from } }));

import { POST } from './route';

const call = (body: unknown) => POST(new NextRequest('http://localhost/api/admin/mark-paid', { method: 'POST', body: JSON.stringify(body) }));

describe('mark-paid: paid_via validation', () => {
  it('400 for a value that is not listed, and nothing is read or written', async () => {
    const res = await call({ session_id: 's1', paid_via: 'bitcoin' });
    expect(res.status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });
  it('400 for a non-string', async () => {
    const res = await call({ session_id: 's1', paid_via: 5 });
    expect(res.status).toBe(400);
  });
});
