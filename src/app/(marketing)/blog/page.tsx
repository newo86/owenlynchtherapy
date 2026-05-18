import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import AnimatedCard from '@/components/ui/AnimatedCard';

// TODO: Replace hard-coded posts with Sanity query when CMS is configured:
// import { sanityClient } from '@/lib/sanity/client';
// import { allPostsQuery } from '@/lib/sanity/queries';
// const posts = await sanityClient.fetch(allPostsQuery);

export const metadata: Metadata = {
  title: { absolute: 'Blog | Owen Lynch Psychotherapy' },
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

// Hard-coded fallback — swap for Sanity fetch when CMS is wired up
const posts: Post[] = [
  {
    slug: 'how-ocd-therapy-works',
    title: 'How OCD Therapy Works: An Evidence-Based Guide',
    excerpt:
      'An integrative look at I-CBT, ACT, and psychodynamic approaches to OCD treatment — what the research says and what therapy actually looks like.',
    publishedAt: '2026-05-13',
    category: 'OCD',
    featuredImage: '/images/ocd-radio-analogy.png',
    featuredImageAlt:
      'Illustration of the radio analogy explaining how OCD tunes into meaningless thoughts and treats them as threats',
  },
  {
    slug: 'what-does-adhd-feel-like',
    title: 'What Does ADHD Actually Feel Like?',
    excerpt:
      'Beyond the stereotypes — understanding the lived experience of ADHD in adults, and why so many people are only diagnosed later in life.',
    publishedAt: '2026-05-20',
    category: 'ADHD',
    featuredImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    featuredImageAlt: 'Person looking thoughtfully out a window, representing the internal experience of ADHD',
  },
  {
    slug: 'finding-the-right-therapist',
    title: 'Finding the Right Therapist: What to Look For',
    excerpt:
      'Therapy is a relationship. Here\'s how to find someone who\'s actually a good fit for you — and what the research says matters most.',
    publishedAt: '2026-05-27',
    category: 'General',
    featuredImage: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    featuredImageAlt: 'Two chairs facing each other in a warm therapy room, representing the therapeutic relationship',
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

      {/* ── Page banner ─────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="blog-heading"
      >
        <PageHeroCircles />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none text-xs text-cream/60">
              <li>
                <Link href="/" className="hover:text-cream transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-cream/80">Blog</li>
            </ol>
          </nav>

          <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">
            Articles &amp; Insights
          </p>
          <h1
            id="blog-heading"
            className="font-heading font-light text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-cream mb-4"
          >
            Blog
          </h1>
          <p className="font-normal text-base text-cream/75 leading-[1.8] max-w-xl">
            Thoughts on therapy, mental health, and the work of change
          </p>
        </div>
      </section>

      {/* ── Card grid ───────────────────────────────────────────────────────── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="px-4 sm:px-6 lg:px-8 pt-14 pb-24"
        aria-label="Blog posts"
      >
        <div className="max-w-6xl mx-auto">
          {visiblePosts.length === 0 ? (
            <p className="font-normal text-sm text-gray-500 py-16">
              No articles yet — check back soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {visiblePosts.map((post, i) => (
                /*
                 * AnimatedBlogCard is a client component that wraps the article
                 * in a motion.div with whileInView fade-up. The article content
                 * itself is always present in the server-rendered HTML for SEO.
                 */
                <AnimatedCard key={post.slug} index={i}>
                  <article
                    className="group flex flex-col flex-1 rounded-2xl bg-white border border-transparent hover:border-[#C85A1A]/15 hover:-translate-y-1 transition-all duration-300"
                    style={{ boxShadow: '0 2px 16px rgba(42,77,60,0.07)' }}
                  >
                    <Link
                      href={`/blog/${post.slug}`}
                      className="flex flex-col flex-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-linen"
                      aria-label={`Read article: ${post.title}`}
                    >
                      {/* Featured image */}
                      <div className="relative aspect-video overflow-hidden rounded-t-2xl">
                        <Image
                          src={post.featuredImage}
                          alt={post.featuredImageAlt}
                          fill
                          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          priority={i === 0}
                          unoptimized={post.featuredImage.startsWith('https://images.unsplash')}
                        />
                      </div>

                      {/* Category pill — pulls up slightly into the image zone */}
                      <div className="relative z-10 px-5 -mt-[14px] mb-4">
                        <span className="inline-flex items-center bg-forest text-white text-[9px] font-semibold uppercase tracking-[2px] px-3 py-1.5 rounded-full shadow-sm">
                          {post.category}
                        </span>
                      </div>

                      {/* Card body */}
                      <div className="flex flex-col flex-1 px-5 pb-6">
                        {/* Gold accent rule — grows on hover */}
                        <span
                          className="block h-px mb-4 transition-all duration-300 group-hover:w-10"
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

                        <p className="font-normal text-sm text-gray-600 leading-[1.8] flex-1 mb-5 line-clamp-3">
                          {post.excerpt}
                        </p>

                        <span className="inline-flex items-center gap-1.5 text-orange text-[10px] font-normal uppercase tracking-normal mt-auto">
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
                </AnimatedCard>
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

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
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
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-normal font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </>
  );
}
