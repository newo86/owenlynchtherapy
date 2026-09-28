import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// requireAdmin decides access to every admin route, so lock in its rules:
// signed + unexpired cookie, AND issued after the last "Sign out".

type Row = { data: { valid_after: string } | null; error: { code?: string; message: string } | null };
let selectResult: Row = { data: { valid_after: new Date(0).toISOString() }, error: null };
let upsertError: { message: string } | null = null;

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => selectResult }) }),
      upsert: async () => ({ error: upsertError }),
    }),
  },
}));

async function freshAuth() {
  vi.resetModules(); // clears the per-instance revocation cache
  return import('./adminAuth');
}

function reqWith(token: string | null): NextRequest {
  return new NextRequest('https://example.test/api/admin/clients', {
    headers: token ? { cookie: `ol_admin_session=${token}` } : {},
  });
}

beforeEach(() => {
  process.env.INTAKE_ADMIN_SECRET = 'correct horse';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-only-secret';
  selectResult = { data: { valid_after: new Date(0).toISOString() }, error: null };
  upsertError = null;
});

describe('requireAdmin', () => {
  it('accepts a freshly issued session', async () => {
    const auth = await freshAuth();
    const token = auth.createSessionToken()!;
    expect(await auth.requireAdmin(reqWith(token))).toBeNull();
  });

  it('rejects no cookie and a tampered cookie', async () => {
    const auth = await freshAuth();
    const token = auth.createSessionToken()!;
    expect((await auth.requireAdmin(reqWith(null)))?.status).toBe(401);
    expect((await auth.requireAdmin(reqWith(token.slice(0, -2) + 'xx')))?.status).toBe(401);
  });

  it('rejects a cookie forged with only the password (the old 2FA bypass)', async () => {
    const { createHmac } = await import('node:crypto');
    const auth = await freshAuth();
    const exp = String(Date.now() + 60_000);
    const forged = `${exp}.${createHmac('sha256', 'correct horse').update(exp).digest('base64url')}`;
    expect((await auth.requireAdmin(reqWith(forged)))?.status).toBe(401);
  });

  it('rejects a cookie issued before the last sign-out (copied cookie)', async () => {
    const auth = await freshAuth();
    const token = auth.createSessionToken()!;
    selectResult = { data: { valid_after: new Date(Date.now() + 1000).toISOString() }, error: null };
    const again = await freshAuth(); // new instance, no cache
    expect((await again.requireAdmin(reqWith(token)))?.status).toBe(401);
  });

  it('revokeAllAdminSessions voids existing cookies immediately on this instance', async () => {
    const auth = await freshAuth();
    const token = auth.createSessionToken()!;
    expect(await auth.requireAdmin(reqWith(token))).toBeNull();
    await new Promise(r => setTimeout(r, 5));
    expect(await auth.revokeAllAdminSessions()).toBe(true);
    expect((await auth.requireAdmin(reqWith(token)))?.status).toBe(401);
  });

  it('does not lock anyone out before the migration is run (missing table)', async () => {
    selectResult = { data: null, error: { code: 'PGRST205', message: 'not found' } };
    const auth = await freshAuth();
    expect(await auth.requireAdmin(reqWith(auth.createSessionToken()!))).toBeNull();
  });

  it('fails closed on a transient database error with nothing cached', async () => {
    selectResult = { data: null, error: { code: '08006', message: 'connection failure' } };
    const auth = await freshAuth();
    expect((await auth.requireAdmin(reqWith(auth.createSessionToken()!)))?.status).toBe(401);
  });
});
