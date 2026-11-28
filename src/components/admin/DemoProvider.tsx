'use client';

// Dev-only: renders its children (the REAL dashboard) against fake data. It
//   1. shifts the clock to a Tuesday afternoon (demoClock.ts),
//   2. answers adminFetch from demoWorld.ts instead of the network.
// It does nothing, and renders nothing, unless demoGate.isDemoAllowed() says so
// (NODE_ENV development AND a /admin-demo path). Nothing is saved or sent.
import { useEffect, useState, type ReactNode } from 'react';
import { setDemoHandler } from './api';
import { isDemoAllowed } from './demoGate';
import { demoNowMs, installDemoClock } from './demoClock';
import { buildDemoWorld, demoRoute } from './demoWorld';

export function DemoProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isDemoAllowed(process.env.NODE_ENV, window.location.pathname)) return;
    const restoreClock = installDemoClock(demoNowMs(Date.now()));
    const world = buildDemoWorld(Date.now());
    const installed = setDemoHandler((url, init) => {
      const { status, body } = demoRoute(world, init.method ?? 'GET', url);
      return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
    });
    if (!installed) { restoreClock(); return; }
    setReady(true);
    return () => { setDemoHandler(null); restoreClock(); setReady(false); };
  }, []);

  // Children mount only after the clock and the fake API are in place, so no
  // screen ever makes a real request or renders the real date first.
  if (!ready) return null;
  return (
    <>
      <div role="note" style={{ position: 'fixed', zIndex: 1000, right: 8, bottom: 84, padding: '4px 10px', borderRadius: 999, background: '#1F2B24', color: '#fff', fontSize: 12, fontWeight: 600, pointerEvents: 'none' }}>
        Demo data. Nothing is saved or sent.
      </div>
      {children}
    </>
  );
}
