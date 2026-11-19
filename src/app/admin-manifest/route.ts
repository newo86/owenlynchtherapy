import { PRACTICE } from '@/practice.config';

// Web app manifest for the DASHBOARD only (linked from the admin layout), so
// "Add to Home Screen" from /admin/intake gives a separate, bolder app icon
// that opens straight onto the dashboard, while the public website keeps its
// own manifest (src/app/manifest.ts). Public on purpose: browsers fetch a
// manifest without credentials, and it holds nothing but the app's name,
// colours and icon files. Generated from practice.config.ts so a clone never
// ships another practice's name.

export const dynamic = 'force-static';

/** "Owen Lynch" → "OL Diary": short enough to sit under the icon unclipped. */
const initials = PRACTICE.practitionerName.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('');
const APP_SHORT_NAME = `${initials} Diary`;

export function GET() {
  const manifest = {
    name: `${PRACTICE.practitionerName} · Diary`,
    short_name: APP_SHORT_NAME,
    description: 'Today, free times and scheduling.',
    start_url: '/admin/intake',
    scope: '/admin/',
    display: 'standalone',
    background_color: PRACTICE.brand.linen,
    theme_color: PRACTICE.brand.forest,
    icons: [
      { src: '/admin-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/admin-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // The mark sits well inside the central safe zone, so the same files
      // also work when Android crops the icon to a circle or squircle.
      { src: '/admin-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/admin-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' },
  });
}
