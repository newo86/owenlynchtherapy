import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import AnimatedCard from '@/components/ui/AnimatedCard';
import FloatingCircles from '@/components/ui/floating-circles';
import { articles } from '@/content/articles';
import { SITE_URL } from '@/practice.config';

export const metadata: Metadata = {
  title: { absolute: 'Articles | Owen Lynch Psychotherapy' },
  description:
    'Articles on OCD, anxiety, ADHD, autism, and mental health by Owen Lynch, psychotherapist in Dublin. Evidence-based insights and practical guidance.',
  alternates: {
    canonical: `${SITE_URL}/articles`,
    languages: {
      'en': `${SITE_URL}/articles`,
      'x-default': `${SITE_URL}/articles`,
    },
  },
  openGraph: {
    title: 'Articles | Owen Lynch Psychotherapy',
    description:
      'Articles on OCD, anxiety, ADHD, autism, and mental health by Owen Lynch, psychotherapist in Dublin. Evidence-based insights and practical guidance.',
    type: 'website',
    url: `${SITE_URL}/articles`,
    images: [{ url: `${SITE_URL}/images/blog-hero-ocd-therapy.png`, width: 3200, height: 1800, alt: 'Abstract illustration representing OCD therapy — concentric circles in forest green and terracotta' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Articles | Owen Lynch Psychotherapy',
    description:
      'Articles on OCD, anxiety, ADHD, autism, and mental health by Owen Lynch, psychotherapist in Dublin.',
    images: [`${SITE_URL}/images/blog-hero-ocd-therapy.png`],
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}` },
    { '@type': 'ListItem', position: 2, name: 'Articles', item: `${SITE_URL}/articles` },
  ],
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const PAGE_SIZE = 9;

// Articles live in the repo (src/content/articles) — no CMS, no network.
export default function ArticlesPage() {
  const visiblePosts = articles.slice(0, PAGE_SIZE);
  const hasMore = articles.length > PAGE_SIZE;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Page banner ─────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="articles-heading"
      >
        <PageHeroCircles />

        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">
            Articles &amp; Insights
          </p>
          <h1
            id="articles-heading"
            className="font-heading font-light text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-cream mb-4"
          >
            Articles
          </h1>
          <p className="font-normal text-base text-cream/75 leading-[1.8] max-w-xl">
            Thoughts on therapy, mental health, and the work of change
          </p>
        </div>
      </section>

      {/* ── Card grid ───────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="relative overflow-hidden px-4 sm:px-6 lg:px-8 pt-14 pb-24"
        aria-label="Articles"
      >
        <FloatingCircles />
        <div className="relative max-w-6xl mx-auto" style={{ zIndex: 1 }}>
          {visiblePosts.length === 0 ? (
            <p className="font-normal text-base text-gray-500 py-16">
              No articles yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {visiblePosts.map((post, i) => (
                <AnimatedCard key={post.slug} index={i} className="service-card-border rounded-2xl">
                  <article
                    className="relative z-[1] group flex flex-col flex-1 rounded-2xl bg-white h-hover:-translate-y-1 h-can:transition-all h-can:duration-300"
                    style={{ boxShadow: '0 2px 16px rgba(42,77,60,0.07)' }}
                  >
                    <Link
                      href={`/articles/${post.slug}`}
                      className="flex flex-col flex-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-linen"
                      aria-label={`Read article: ${post.title}`}
                    >
                      {/* Featured image */}
                      {post.featuredImage && (
                      <div className="relative aspect-video overflow-hidden rounded-t-2xl">
                        <Image
                          src={post.featuredImage.src}
                          alt={post.featuredImage.alt || post.title}
                          fill
                          className="object-cover h-can:transition-transform h-can:duration-700 ease-out group-h-hover:scale-[1.04]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          priority={i === 0}
                        />
                      </div>
                      )}

                      {/* Category pill — pulls up slightly into the image zone */}
                      <div className="relative z-10 px-5 -mt-[14px] mb-4">
                        <span className="inline-flex items-center bg-forest text-white text-[9px] font-semibold uppercase tracking-[2px] px-3 py-1.5 rounded-full shadow-sm">
                          {post.category ?? 'Article'}
                        </span>
                      </div>

                      {/* Card body */}
                      <div className="flex flex-col flex-1 px-5 pb-6">
                        {/* Gold accent rule — grows on hover */}
                        <span
                          className="block h-px mb-4 h-can:transition-all h-can:duration-300 group-h-hover:w-10"
                          style={{ backgroundColor: '#D4A843', width: '24px' }}
                          aria-hidden="true"
                        />

                        <h2
                          className="font-heading font-light text-forest leading-snug mb-2"
                          style={{ fontSize: '1.15rem' }}
                        >
                          {post.title}
                        </h2>

                        <time
                          dateTime={post.publishedAt}
                          className="block text-xs text-gray-400 tracking-wide mb-4"
                        >
                          {formatDate(post.publishedAt)}
                        </time>

                        <p className="font-normal text-base text-gray-600 leading-[1.8] flex-1 mb-5 line-clamp-3">
                          {post.excerpt}
                        </p>

                        <span className="inline-flex items-center gap-1.5 text-orange text-[10px] font-normal uppercase tracking-normal mt-auto">
                          Read more
                          <span
                            className="h-can:transition-transform h-can:duration-300 group-h-hover:translate-x-1"
                            aria-hidden="true"
                          >
                            →
                          </span>
                        </span>
                      </div>
                    </Link>
                  </article>
                </AnimatedCard>
              ))}
            </div>
          )}

          {/* Pagination slot — visible only when posts exceed PAGE_SIZE */}
          {hasMore && (
            <nav aria-label="Articles pagination" className="mt-16 flex justify-center gap-3">
              {/* TODO: implement page links when post count exceeds 9 */}
            </nav>
          )}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="articles-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            Get in touch
          </p>
          <h2
            id="articles-cta-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
          >
            Thinking about starting therapy?
          </h2>
          <p className="font-normal text-base text-cream/70 leading-[1.8] mb-12">
            {`Reading about therapy is one thing. Taking the first step is another — and it doesn't have to feel daunting. Send me a message and I'll get back to you within one working day.`}
          </p>
          <span
            className="block w-12 h-px mx-auto mb-8"
            style={{ backgroundColor: '#D4A843' }}
            aria-hidden="true"
          />
          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-normal font-normal h-hover:opacity-90 h-can:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
