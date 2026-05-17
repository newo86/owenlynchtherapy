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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Hero ── */}
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
          <p className="font-normal text-base text-cream/75 leading-[1.8] max-w-2xl">
            Thoughts on therapy, mental health, and the work of change
          </p>
        </div>
      </section>

      {/* ── Posts grid ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-label="Blog posts"
      >
        <div className="max-w-6xl mx-auto">
          {visiblePosts.length === 0 ? (
            <p className="font-normal text-sm text-gray-600">No posts yet — check back soon.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {visiblePosts.map((post) => (
                <article
                  key={post.slug}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-inset"
                  >
                    {/* Featured image — 16:9 */}
                    <div className="relative aspect-video overflow-hidden">
                      <Image
                        src={post.featuredImage}
                        alt={post.featuredImageAlt}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>

                    <div className="p-6">
                      <p className="text-orange text-[10px] uppercase tracking-[2px] font-normal mb-2">
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
                      <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-5 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-orange text-[10px] uppercase tracking-[2px] font-normal group-hover:gap-3 transition-all duration-200">
                        Read more <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}

          {/* Pagination — rendered when more than PAGE_SIZE posts exist */}
          {hasMore && (
            <nav aria-label="Blog pagination" className="mt-16 flex justify-center gap-2">
              {/* TODO: implement pagination links when post count exceeds 9 */}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
