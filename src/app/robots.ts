import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // /intake is deliberately NOT disallowed: the page is noindex, and a
      // crawl block would stop Google from ever seeing that noindex if an
      // intake URL leaks into the index from an emailed link.
      disallow: ['/studio/', '/api/', '/admin'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
