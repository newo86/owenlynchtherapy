import { describe, it, expect, afterEach, vi } from 'vitest';
import { isDemoAllowed } from './demoGate';
import { setDemoHandler, adminFetch } from './api';
import { buildDemoWorld, demoRoute } from './demoWorld';
import { demoNowMs } from './demoClock';

describe('demo gate', () => {
  it('only allows development on /admin-demo', () => {
    expect(isDemoAllowed('development', '/admin-demo')).toBe(true);
    expect(isDemoAllowed('development', '/admin-demo/parts')).toBe(true);
    expect(isDemoAllowed('development', '/admin/intake')).toBe(false);
    expect(isDemoAllowed('development', '/admin-demonstration')).toBe(false);
    expect(isDemoAllowed('development', undefined)).toBe(false);
  });
  it('is never allowed in production or test builds', () => {
    expect(isDemoAllowed('production', '/admin-demo')).toBe(false);
    expect(isDemoAllowed('test', '/admin-demo')).toBe(false);
    expect(isDemoAllowed(undefined, '/admin-demo')).toBe(false);
  });
});

describe('demo hook in adminFetch', () => {
  afterEach(() => { setDemoHandler(null); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('refuses to install outside development, and adminFetch uses the network', async () => {
    const handler = vi.fn(() => new Response('{}'));
    expect(setDemoHandler(handler, '/admin-demo')).toBe(false); // NODE_ENV is "test" here
    const real = vi.fn(async () => new Response('{"real":true}'));
    vi.stubGlobal('fetch', real);
    const res = await adminFetch('/api/admin/clients');
    expect(await res.json()).toEqual({ real: true });
    expect(handler).not.toHaveBeenCalled();
    expect(real).toHaveBeenCalledTimes(1);
  });

  it('refuses to install in development off the demo route', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(setDemoHandler(() => new Response('{}'), '/admin/intake')).toBe(false);
  });

  it('answers from the handler in development on /admin-demo, never the network', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const real = vi.fn();
    vi.stubGlobal('fetch', real);
    expect(setDemoHandler(() => new Response('{"demo":true}'), '/admin-demo')).toBe(true);
    const res = await adminFetch('/api/admin/clients');
    expect(await res.json()).toEqual({ demo: true });
    expect(real).not.toHaveBeenCalled();
  });

  it('in production a stale handler is ignored by adminFetch', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    setDemoHandler(() => new Response('{"demo":true}'), '/admin-demo');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"real":true}')));
    expect(await (await adminFetch('/x')).json()).toEqual({ real: true });
  });
});

describe('demo world', () => {
  const now = demoNowMs(new Date('2026-11-28T10:00:00Z').getTime()); // a Saturday
  const world = buildDemoWorld(now);

  it('puts "now" on the Tuesday of that week, mid-afternoon', () => {
    expect(new Date(now).toISOString()).toBe('2026-11-24T15:20:00.000Z');
  });
  it('uses only made-up people and example.com emails', () => {
    for (const c of world.clients) expect(c.email.endsWith('@example.com')).toBe(true);
    expect(world.clients.map(c => c.full_name)).toContain('Aoife Example');
  });
  it('books only Tuesdays 4-8pm and Fridays 3-7pm (Dublin)', () => {
    for (const s of world.sessions) {
      const p = new Intl.DateTimeFormat('en-IE', { timeZone: 'Europe/Dublin', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(s.session_date));
      const wd = p.find(x => x.type === 'weekday')!.value;
      const h = Number(p.find(x => x.type === 'hour')!.value);
      expect(['Tue', 'Fri']).toContain(wd);
      if (wd === 'Tue') expect(h >= 16 && h <= 19).toBe(true);
      else expect(h >= 15 && h <= 19).toBe(true);
    }
  });
  it('has sessions today and unpaid past sessions for the prompts', () => {
    expect(world.sessions.filter(s => s.session_date.startsWith('2026-11-24') && s.status === 'scheduled').length).toBeGreaterThan(0);
    expect(world.prompts.length).toBeGreaterThan(0);
  });
  it('can show the calendar-not-connected warning', () => {
    const off = buildDemoWorld(now, { calendarConnected: false });
    expect(demoRoute(off, 'GET', '/api/auth/google/status').body).toEqual({ connected: false });
    expect(demoRoute(world, 'GET', '/api/auth/google/status').body).toMatchObject({ connected: true });
  });
  it('answers reads and ignores writes; unknown paths are a 404, never the network', () => {
    expect(demoRoute(world, 'GET', '/api/admin/clients').status).toBe(200);
    expect(demoRoute(world, 'GET', '/api/admin/calendar?weekOffset=0&weeks=4').status).toBe(200);
    expect(demoRoute(world, 'POST', '/api/admin/send-receipt').body).toMatchObject({ demo: true });
    expect(demoRoute(world, 'GET', '/api/admin/nope').status).toBe(404);
  });
});
