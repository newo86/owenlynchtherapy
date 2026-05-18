import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

// TODO: Replace hard-coded posts with Sanity query when CMS is configured:
// import { sanityClient } from '@/lib/sanity/client';
// import { allPostsQuery } from '@/lib/sanity/queries';
// const posts = await sanityClient.fetch(allPostsQuery);

export const metadata: Metadata = {
  title: 'Blog | Owen Lynch Psychotherapy',
  description:
    'Articles on OCD, anxiety, ADHD, autism, and mental health by Owen Lynch, psychotherapist in Dublin. Evidence-based insights and practical guidance.',
  alternates: { canonical: 'https://owenlynchtherapy.com/blog' },
  openGraph: {
    title: 'Blog | Owen Lynch Psychotherapy',
    description:
      'Articles on OCD, anxiety, ADHD, autism, and mental health by Owen Lynch, psychotherapist in Dublin. Evidence-based insights and practical guidance.',
    type: 'website',
    url: 'https://owenlynchtherapy.com/blog',
    images: [{ url: 'https://owenlynchtherapy.com/images/ocd-radio-analogy.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog | Owen Lynch Psychotherapy',
    description:
      'Articles on OCD, anxiety, ADHD, autism, and mental health by Owen Lynch, psychotherapist in Dublin.',
    images: ['https://owenlynchtherapy.com/images/ocd-radio-analogy.png'],
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://owenlynchtherapy.com' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://owenlynchtherapy.com/blog' },
  ],
};

// ── Card entrance animation ───────────────────────────────────────────────────
// Inline style element, same pattern as PageHeroCircles — Server Component safe.
const CARD_ANIM_CSS = `
  @keyframes blog-card-in {
    from { opacity: 0; transform: translateY(22px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .blog-card {
    animation: blog-card-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
`;

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: string;
  featuredImage: string;
  featuredImageAlt: string;
};

// Hard-coded fallback — swap for Sanity fetch when CMS is wired up
const posts: Post[] = [
  {
    slug: 'how-ocd-therapy-works',
    title: 'How OCD Therapy Works: An Evidence-Based Guide',
    excerpt:
      'OCD is more complex than popular culture suggests. This article explores how it maintains itself and what evidence-based treatment — I-CBT, ACT, ERP, and psychodynamic therapy — looks like.',
    publishedAt: '2026-05-13',
    category: 'OCD',
    featuredImage: '/images/ocd-radio-analogy.png',
    featuredImageAlt:
      'Illustration of the radio analogy explaining how OCD tunes into meaningless thoughts and treats them as threats',
  },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const PAGE_SIZE = 9;

export default function BlogPage() {
  const visiblePosts = posts.slice(0, PAGE_SIZE);
  const hasMore = posts.length > PAGE_SIZE;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Page masthead ─────────────────────────────────────────────────────
           Light background with the H1 in forest green — editorial, not heroic.
           A thin gold rule and a muted subtitle frame the section before cards.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="px-4 sm:px-6 lg:px-8 pt-20 pb-0 sm:pt-28"
        aria-labelledby="blog-heading"
      >
        <div className="max-w-6xl mx-auto border-b border-forest/10 pb-14 sm:pb-16">
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-6">
            Articles &amp; Insights
          </p>

          <h1
            id="blog-heading"
            className="font-heading font-light leading-none text-forest mb-7"
            style={{ fontSize: 'clamp(3rem, 8vw, 5.5rem)' }}
          >
            Blog
          </h1>

          {/* Gold rule — brand accent, signals the subtitle is a sub-title */}
          <span
            className="block w-10 h-px mb-7"
            style={{ backgroundColor: '#D4A843' }}
            aria-hidden="true"
          />

          <p className="font-normal text-base sm:text-lg text-gray-500 leading-[1.65] max-w-[440px]">
            Thoughts on therapy, mental health, and the work of change
          </p>
        </div>
      </section>

      {/* ── Card grid ─────────────────────────────────────────────────────────
           All posts rendered as equal-weight cards. When there is only one post
           it sits in the first column; the grid fills naturally as posts grow.
           Cards have no overflow-hidden at the article level so the category
           pill can overlap the image/content boundary cleanly with z-index.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="px-4 sm:px-6 lg:px-8 pt-14 pb-24"
        aria-label="Blog posts"
      >
        {/* Inject keyframes — pattern from PageHeroCircles, Server Component safe */}
        <style>{CARD_ANIM_CSS}</style>

        <div className="max-w-6xl mx-auto">
          {visiblePosts.length === 0 ? (
            <p className="font-normal text-sm text-gray-500 py-16">
              No articles yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {visiblePosts.map((post, i) => (
                <article
                  key={post.slug}
                  className="blog-card group flex flex-col rounded-2xl bg-white border border-transparent hover:border-forest/10 hover:-translate-y-1 transition-all duration-300"
                  style={{
                    animationDelay: `${i * 110}ms`,
                    boxShadow: '0 2px 16px rgba(42,77,60,0.07)',
                  }}
                  /*
                   * Hover shadow via onMouseEnter/Leave would need 'use client'.
                   * We use a CSS custom property trick via a sibling data attribute
                   * instead — or simply rely on Tailwind's hover: utilities below.
                   * The base shadow is set inline; the lifted shadow is handled by
                   * a <style> rule targeting .blog-card:hover for SSR safety.
                   */
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex flex-col flex-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-linen"
                    aria-label={`Read article: ${post.title}`}
                  >
                    {/* ── Featured image ─────────────────────────────────────
                         overflow-hidden on this container clips the scale
                         animation; rounded-t-2xl matches the card corners.
                    ─────────────────────────────────────────────────────── */}
                    <div className="relative aspect-video overflow-hidden rounded-t-2xl">
                      <Image
                        src={post.featuredImage}
                        alt={post.featuredImageAlt}
                        fill
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        priority={i === 0}
                      />
                    </div>

                    {/* ── Category pill ──────────────────────────────────────
                         Negative margin-top pulls the pill up into the image
                         zone. position:relative + z-index ensures it paints
                         above the image even when the image has a CSS transform
                         applied (transform creates a stacking context).
                    ─────────────────────────────────────────────────────── */}
                    <div className="relative z-10 px-5 -mt-[14px] mb-4">
                      <span className="inline-flex items-center bg-forest text-white text-[9px] font-semibold uppercase tracking-[2px] px-3 py-1.5 rounded-full shadow-sm">
                        {post.category}
                      </span>
                    </div>

                    {/* ── Card body ──────────────────────────────────────────
                         flex-1 on this div + mt-auto on "Read more" ensures
                         consistent card heights: excerpt stretches, the link
                         is always anchored to the card bottom.
                    ─────────────────────────────────────────────────────── */}
                    <div className="flex flex-col flex-1 px-5 pb-6">
                      {/* Gold accent rule — grows on hover, signals hover intent */}
                      <span
                        className="block h-px mb-4 transition-all duration-300 group-hover:w-10"
                        style={{ backgroundColor: '#D4A843', width: '24px' }}
                        aria-hidden="true"
                      />

                      <h2 className="font-heading font-light text-forest leading-snug mb-2" style={{ fontSize: '1.15rem' }}>
                        {post.title}
                      </h2>

                      <time
                        dateTime={post.publishedAt}
                        className="block text-xs text-gray-400 tracking-wide mb-4"
                      >
                        {formatDate(post.publishedAt)}
                      </time>

                      <p className="font-normal text-sm text-gray-600 leading-[1.8] flex-1 mb-5 line-clamp-3">
                        {post.excerpt}
                      </p>

                      {/* Read more — arrow shifts right, no gap-width trick
                           which could cause layout shift on narrow cards */}
                      <span className="inline-flex items-center gap-1.5 text-orange text-[10px] font-normal uppercase tracking-[2px] mt-auto">
                        Read more
                        <span
                          className="transition-transform duration-300 group-hover:translate-x-1"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {/* Pagination slot — visible only when posts exceed PAGE_SIZE */}
          {hasMore && (
            <nav aria-label="Blog pagination" className="mt-16 flex justify-center gap-3">
              {/* TODO: implement page links when post count exceeds 9 */}
            </nav>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────
           Matches the closing CTA pattern used on every other page of the site
           (About, Services, FAQ). Keeps the blog page feeling fully resolved.
      ──────────────────────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="blog-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            Get in touch
          </p>
          <h2
            id="blog-cta-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
          >
            Thinking about starting therapy?
          </h2>
          <p className="font-normal text-sm text-cream/70 leading-[1.8] mb-12">
            {`Reading about therapy is one thing. Taking the first step is another — and it doesn't have to feel daunting. Send me a message and I'll get back to you within one working day.`}
          </p>
          <span
            className="block w-12 h-px mx-auto mb-8"
            style={{ backgroundColor: '#D4A843' }}
            aria-hidden="true"
          />
          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-[2px] font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
