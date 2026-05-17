import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';

// TODO: Replace hard-coded posts with Sanity query:
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

type Post = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: string;
  featuredImage: string;
  featuredImageAlt: string;
};

// Hard-coded fallback posts — swap for Sanity fetch when CMS is configured
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
  const [featuredPost, ...gridPosts] = visiblePosts;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="blog-hero-heading"
      >
        <PageHeroCircles />
        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-white md:text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
            Articles &amp; Insights
          </p>
          <h1
            id="blog-hero-heading"
            className="font-heading font-light text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-cream mb-6"
          >
            Blog
          </h1>
          <p className="font-normal text-base text-cream/75 leading-[1.8] max-w-xl">
            Thoughts on therapy, mental health, and the work of change
          </p>
        </div>
      </section>

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {visiblePosts.length === 0 && (
        <section
          style={{ backgroundColor: '#F5F0E8' }}
          className="py-32 px-4 sm:px-6 lg:px-8 text-center"
        >
          <p className="font-normal text-sm text-gray-500">
            No articles yet — check back soon.
          </p>
        </section>
      )}

      {/* ── Featured post ─────────────────────────────────────────────────────── */}
      {featuredPost && (
        <section
          className="py-20 px-4 sm:px-6 lg:px-8 bg-white"
          aria-labelledby="featured-post-heading"
        >
          <div className="max-w-6xl mx-auto">
            <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-12">
              Latest Article
            </p>

            <article className="group">
              {/*
               * <Link> as a grid container is valid HTML5 — <a> may wrap block content.
               * The entire card (image + text) is one focusable unit.
               */}
              <Link
                href={`/blog/${featuredPost.slug}`}
                className="grid grid-cols-1 lg:grid-cols-[58fr_42fr] gap-10 lg:gap-16 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:rounded-xl"
                aria-label={`Read: ${featuredPost.title}`}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <Image
                    src={featuredPost.featuredImage}
                    alt={featuredPost.featuredImageAlt}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                    sizes="(max-width: 1024px) 100vw, 58vw"
                    priority
                  />
                </div>

                {/* Content */}
                <div>
                  <span
                    className="block w-8 h-px mb-7"
                    style={{ backgroundColor: '#C85A1A' }}
                    aria-hidden="true"
                  />
                  <p className="text-orange text-[10px] font-normal uppercase tracking-[3px] mb-4">
                    {featuredPost.category}
                  </p>
                  <h2
                    id="featured-post-heading"
                    className="font-heading font-light text-3xl sm:text-4xl text-forest mb-5 leading-tight"
                  >
                    {featuredPost.title}
                  </h2>
                  <time
                    dateTime={featuredPost.publishedAt}
                    className="block text-xs text-gray-400 tracking-wide mb-6"
                  >
                    {formatDate(featuredPost.publishedAt)}
                  </time>
                  <p className="font-normal text-sm text-gray-600 leading-[1.85] mb-10">
                    {featuredPost.excerpt}
                  </p>
                  <span
                    className="inline-flex items-center gap-2 text-orange text-[10px] font-normal uppercase tracking-[2px] group-hover:gap-4 transition-all duration-300"
                    aria-hidden="true"
                  >
                    Read the article <span>→</span>
                  </span>
                </div>
              </Link>
            </article>
          </div>
        </section>
      )}

      {/* ── Grid: remaining posts ─────────────────────────────────────────────── */}
      {gridPosts.length > 0 && (
        <section
          style={{ backgroundColor: '#F5F0E8' }}
          className="py-20 px-4 sm:px-6 lg:px-8"
          aria-label="More articles"
        >
          <div className="max-w-6xl mx-auto">
            <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-12">
              More Articles
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {gridPosts.map((post) => (
                <article
                  key={post.slug}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-inset"
                    aria-label={`Read: ${post.title}`}
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={post.featuredImage}
                        alt={post.featuredImageAlt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>

                    <div className="p-6">
                      <span
                        className="block w-6 h-[1.5px] mb-4 transition-all duration-300 group-hover:w-10"
                        style={{ backgroundColor: '#D4A843' }}
                        aria-hidden="true"
                      />
                      <p className="text-orange text-[10px] font-normal uppercase tracking-[2px] mb-2">
                        {post.category}
                      </p>
                      <h2 className="font-heading font-light text-xl text-forest mb-2 leading-snug">
                        {post.title}
                      </h2>
                      <time
                        dateTime={post.publishedAt}
                        className="block text-xs text-gray-400 mb-4"
                      >
                        {formatDate(post.publishedAt)}
                      </time>
                      <p className="font-normal text-sm text-gray-600 leading-[1.8] line-clamp-2 mb-5">
                        {post.excerpt}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-orange text-[10px] font-normal uppercase tracking-[2px] group-hover:gap-3 transition-all duration-200">
                        Read more <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            {/* Pagination — rendered when post count exceeds PAGE_SIZE */}
            {hasMore && (
              <nav aria-label="Blog pagination" className="mt-16 flex justify-center gap-2">
                {/* TODO: implement pagination when post count exceeds 9 */}
              </nav>
            )}
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="blog-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
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
