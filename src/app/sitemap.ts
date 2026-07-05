import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteConfig';
import { articles } from '@/content/articles';

// Static pages carry no lastModified: previously every entry was stamped
// `new Date()` on each generation, which tells Google "everything changed
// just now" and neutralises the signal entirely. Articles get real dates
// from the repo content files.
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

export default function sitemap(): MetadataRoute.Sitemap {
  // Articles are repo content (src/content/articles) — fully static, real dates.
  return [
    ...staticPages,
    ...articles.map(post => ({
      url: `${SITE_URL}/articles/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
