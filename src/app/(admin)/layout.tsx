import type { Metadata, Viewport } from 'next';
import '@/components/admin/admin.css';
import '@/components/admin/sage/sage.css';
import { Inter } from 'next/font/google';
import { PRACTICE } from '@/practice.config';

// Dashboard type is Inter (the public site keeps its own fonts: this is loaded
// here, in the admin layout only).
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

// "OL Diary": short enough to sit under the icon unclipped.
const APP_SHORT_NAME = `${PRACTICE.practitionerName.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('')} Diary`;

// The dashboard must never appear in search results. robots.txt blocks
// crawling, but a blocked URL can still be indexed from a link; noindex is
// the instruction search engines actually honour.
export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
  // A bolder, dashboard-only home-screen icon (the public site keeps its own).
  // iOS uses the apple-touch-icon and title when the page is added to the home
  // screen; Android uses the dashboard manifest, which opens on the dashboard.
  manifest: '/admin-manifest',
  icons: {
    icon: [{ url: '/admin-icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/admin-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: APP_SHORT_NAME, statusBarStyle: 'default' },
};

// viewport-fit=cover lets the page use the whole iPhone screen and exposes the
// safe-area insets (home indicator, notch) that the tab bar and content use.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#4F8A68',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // display: contents so the wrapper adds no box; it only carries the font variable.
  return <div className={inter.variable} style={{ display: 'contents' }}>{children}</div>;
}
