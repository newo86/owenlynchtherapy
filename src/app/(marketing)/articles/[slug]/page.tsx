import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import { articles, getArticle } from '@/content/articles';

type Props = {
  params: Promise<{ slug: string }>;
};

const BASE_URL = 'https://owenlynchtherapy.com';

// Articles are typed content files in src/content/articles — written and
// shipped through Claude sessions, no CMS. Body markup was captured from the
// original rendered pages, so classes match the site's prose styles exactly.

export function generateStaticParams() {
  return articles.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getArticle(slug);
  if (!post) return { title: 'Post Not Found', robots: { index: false, follow: false } };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const imageUrl = post.featuredImage
    ? new URL(post.featuredImage.src, BASE_URL).toString()
    : `${BASE_URL}/og-image.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/articles/${slug}`,
      languages: {
        'en': `${BASE_URL}/articles/${slug}`,
        'x-default': `${BASE_URL}/articles/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${BASE_URL}/articles/${slug}`,
      images: [{ url: imageUrl }],
      publishedTime: post.publishedAt,
      authors: [`${BASE_URL}/about`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getArticle(slug);
  if (!post) notFound();

  const publishedDate = new Date(post.publishedAt).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const postJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    ...(post.featuredImage ? { image: new URL(post.featuredImage.src, BASE_URL).toString() } : {}),
    author: {
      '@type': 'Person',
      name: post.author,
      url: `${BASE_URL}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Owen Lynch Psychotherapy',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/images/logo-horizontal-pdf.png`,
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${BASE_URL}/articles/${slug}` },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Articles', item: `${BASE_URL}/articles` },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(postJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
      />

      {/* ── Hero ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="post-hero-heading"
      >
        <PageHeroCircles />
        <div className="relative z-10 max-w-4xl mx-auto">
          {post.category && (
            <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">{post.category}</p>
          )}
          <h1
            id="post-hero-heading"
            className="font-heading font-light text-3xl sm:text-4xl lg:text-[3rem] leading-tight text-cream mb-8"
          >
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cream/70">
            <span>
              By{' '}
              <Link href="/about" className="text-cream/90 h-hover:text-cream h-can:transition-colors underline underline-offset-2">
                {post.author}
              </Link>
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={post.publishedAt}>{publishedDate}</time>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="relative overflow-hidden py-14 px-4 sm:px-6 lg:px-8"
        aria-label="Article content"
      >
        <FloatingCircles />
        <div className="relative max-w-4xl mx-auto" style={{ zIndex: 1 }}>
          {post.featuredImage && (
            <figure className="mb-14">
              <Image
                src={post.featuredImage.src}
                alt={post.featuredImage.alt || post.title}
                width={1200}
                height={675}
                className="w-full h-auto rounded-xl"
                priority
              />
            </figure>
          )}
          <article className="max-w-[720px] mx-auto">
            {/* Trusted, repo-authored markup — same classes the prose styles
                have always used; never user-generated. */}
            <div dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

            {post.referencesHtml && (
              <details className="mt-16 border-t border-gray-200 pt-8 group">
                <summary className="font-heading font-light text-xl text-forest cursor-pointer select-none h-hover:text-orange h-can:transition-colors list-none flex items-center gap-2">
                  <span>References</span>
                  <svg
                    className="w-4 h-4 text-orange h-can:transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div
                  className="mt-6 space-y-5"
                  dangerouslySetInnerHTML={{ __html: post.referencesHtml }}
                />
              </details>
            )}
          </article>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="post-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2
            id="post-cta-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
          >
            Could therapy help?
          </h2>
          <p className="font-normal text-base text-cream/75 leading-[1.8] mb-10">
            {`If you're based in Ireland or the UK and think therapy might help, I offer sessions in Dublin and online. There's no pressure — the first step is simply a conversation.`}
          </p>
          <span className="block w-12 h-px mx-auto mb-8" style={{ backgroundColor: '#d4a843' }} aria-hidden="true" />
          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-normal font-normal h-hover:opacity-90 h-can:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </>
  );
}
