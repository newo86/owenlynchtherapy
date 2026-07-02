import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteConfig';

// Static pages carry no lastModified: previously every entry was stamped
// `new Date()` on each generation, which tells Google "everything changed
// just now" and neutralises the signal entirely. Articles get real dates
// from Sanity.
const staticPages: MetadataRoute.Sitemap = [
  { url: `${SITE_URL}`, changeFrequency: 'monthly', priority: 1 },
  { url: `${SITE_URL}/about`, changeFrequency: 'monthly', priority: 0.8 },
  { url: `${SITE_URL}/services`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${SITE_URL}/articles`, changeFrequency: 'weekly', priority: 0.8 },
  { url: `${SITE_URL}/faq`, changeFrequency: 'monthly', priority: 0.6 },
  { url: `${SITE_URL}/contact`, changeFrequency: 'yearly', priority: 0.8 },
  { url: `${SITE_URL}/ocd-therapy-dublin`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${SITE_URL}/anxiety-therapy-dublin`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${SITE_URL}/adhd-therapy-dublin`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${SITE_URL}/autism-therapy-dublin`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${SITE_URL}/depression-therapy-dublin`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${SITE_URL}/relationship-therapy-dublin`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${SITE_URL}/trauma-therapy-dublin`, changeFrequency: 'monthly', priority: 0.9 },
  { url: `${SITE_URL}/lgbtqia-therapy-dublin`, changeFrequency: 'monthly', priority: 0.9 },
];

const articleSitemapQuery = `
  *[_type == "post" && defined(publishedAt)] {
    "slug": slug.current,
    publishedAt,
    _updatedAt
  }
`;

// Fallback so the sitemap still lists known posts if Sanity is unreachable
// at build time (e.g. sandboxed builds — see docs/OPERATIONS.md).
const knownArticles: MetadataRoute.Sitemap = [
  {
    url: `${SITE_URL}/articles/does-the-body-keep-the-score-trauma-neuroscience`,
    lastModified: new Date('2026-06-01'),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
  {
    url: `${SITE_URL}/articles/how-ocd-therapy-works`,
    lastModified: new Date('2026-05-13'),
    changeFrequency: 'monthly',
    priority: 0.7,
  },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let articles = knownArticles;
  try {
    // Imported lazily so a missing Sanity config (sandboxed builds) throws
    // inside this try instead of at module load, keeping the build green.
    const { sanityClient } = await import('@/lib/sanity/client');
    const posts: { slug: string; publishedAt: string; _updatedAt: string }[] =
      await sanityClient.fetch(articleSitemapQuery);
    if (posts.length > 0) {
      articles = posts.map(post => ({
        url: `${SITE_URL}/articles/${post.slug}`,
        lastModified: new Date(post._updatedAt ?? post.publishedAt),
        changeFrequency: 'monthly',
        priority: 0.7,
      }));
    }
  } catch {
    // Sanity unreachable — ship the static fallback rather than failing the build.
  }
  return [...staticPages, ...articles];
}
