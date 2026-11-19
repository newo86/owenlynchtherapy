import type { Metadata, Viewport } from 'next';
import '@/components/admin/admin.css';

// The dashboard must never appear in search results. robots.txt blocks
// crawling, but a blocked URL can still be indexed from a link; noindex is
// the instruction search engines actually honour.
export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

// viewport-fit=cover lets the page use the whole iPhone screen and exposes the
// safe-area insets (home indicator, notch) that the tab bar and content use.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2A4D3C',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
