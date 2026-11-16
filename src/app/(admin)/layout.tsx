import type { Metadata } from 'next';
import '@/components/admin/admin.css';

// The dashboard must never appear in search results. robots.txt blocks
// crawling, but a blocked URL can still be indexed from a link; noindex is
// the instruction search engines actually honour.
export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
