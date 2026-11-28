// The one rule for when the dashboard demo (fake data, no network) may run.
// It must NEVER be active in a production build: Next replaces
// process.env.NODE_ENV at build time, so on Vercel (production) this is a
// constant `false` and the demo code is unreachable. It also requires the
// /admin-demo route, so `next dev` on /admin/intake still talks to the real API.

export function isDemoAllowed(nodeEnv: string | undefined, pathname: string | undefined): boolean {
  if (nodeEnv !== 'development') return false;
  if (!pathname) return false;
  return pathname === '/admin-demo' || pathname.startsWith('/admin-demo/');
}
