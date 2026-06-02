import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';
import { PortableText } from '@portabletext/react';
import type { PortableTextBlock } from '@portabletext/types';
import { sanityClient } from '@/lib/sanity/client';
import { postBySlugQuery, allPostSlugsQuery } from '@/lib/sanity/queries';

type Props = {
  params: Promise<{ slug: string }>;
};

const BASE_URL = 'https://owenlynchtherapy.com';

// ── Shared prose classes ──────────────────────────────────────────────────────

const p = 'font-normal text-base md:text-[1.05rem] text-gray-700 leading-[1.85] mb-7';
const h2 = 'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';
const inlineLink = 'underline underline-offset-2 decoration-orange/60 h-hover:decoration-orange h-can:transition-colors';

// ── Portable text helpers ─────────────────────────────────────────────────────

function hasText(block?: PortableTextBlock): boolean {
  return (
    block?.children?.some(child => {
      const text = (child as { text?: string }).text;
      return typeof text === 'string' && text.trim().length > 0;
    }) ?? false
  );
}

// ── Portable text components ──────────────────────────────────────────────────

const portableTextComponents = {
  block: {
    normal: ({ children, value }: { children?: React.ReactNode; value?: PortableTextBlock }) =>
      hasText(value) ? <p className={p}>{children}</p> : null,
    h2: ({ children, value }: { children?: React.ReactNode; value?: PortableTextBlock }) =>
      hasText(value) ? <h2 className={h2}>{children}</h2> : null,
    h3: ({ children, value }: { children?: React.ReactNode; value?: PortableTextBlock }) =>
      hasText(value) ? (
        <h3 className="font-heading font-light text-xl text-forest mt-10 mb-4 leading-snug">{children}</h3>
      ) : null,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-2 border-orange pl-5 my-6 text-gray-600 italic">{children}</blockquote>
    ),
  },
  marks: {
    link: ({ value, children }: { value?: { href: string; blank?: boolean }; children?: React.ReactNode }) => (
      <a
        href={value?.href}
        target={value?.blank ? '_blank' : undefined}
        rel={value?.blank ? 'noopener noreferrer' : undefined}
        className={inlineLink}
      >
        {children}
      </a>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
  },
  types: {
    image: ({ value }: { value: { asset?: { url?: string }; alt?: string; caption?: string } }) =>
      value?.asset?.url ? (
        <figure className="my-10">
          <Image
            src={value.asset.url}
            alt={value.alt ?? ''}
            width={1200}
            height={675}
            className="w-full h-auto rounded-xl"
            loading="lazy"
          />
          {value.caption && (
            <figcaption className="mt-3 text-sm text-gray-500 text-center italic">{value.caption}</figcaption>
          )}
        </figure>
      ) : null,
  },
};

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const slugs: { slug: string }[] = await sanityClient.fetch(allPostSlugsQuery);
  return slugs.map(s => ({ slug: s.slug }));
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await sanityClient.fetch(postBySlugQuery, { slug });
  if (!post) return { title: 'Post Not Found', robots: { index: false, follow: false } };

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt || '';
  const imageUrl = post.featuredImageUrl ?? undefined;

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
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
      publishedTime: post.publishedAt,
      authors: [`${BASE_URL}/about`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Reference = {
  authors?: string;
  year?: string;
  title?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = await sanityClient.fetch(postBySlugQuery, { slug });
  if (!post) notFound();

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const postJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription || post.excerpt || '',
    ...(post.featuredImageUrl ? { image: post.featuredImageUrl } : {}),
    author: {
      '@type': 'Person',
      name: post.author ?? 'Owen Lynch',
      url: `${BASE_URL}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Owen Lynch Psychotherapy',
      url: BASE_URL,
    },
    datePublished: post.publishedAt,
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
                {post.author ?? 'Owen Lynch'}
              </Link>
            </span>
            {publishedDate && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={post.publishedAt}>{publishedDate}</time>
              </>
            )}
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
          {post.featuredImageUrl && (
            <figure className="mb-14">
              <Image
                src={post.featuredImageUrl}
                alt={post.featuredImageAlt ?? post.title}
                width={1200}
                height={675}
                className="w-full h-auto rounded-xl"
                priority
              />
            </figure>
          )}
          <article className="max-w-[720px] mx-auto">
            {post.body && <PortableText value={post.body} components={portableTextComponents} />}

            {post.references && post.references.length > 0 && (
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
                <div className="mt-6 space-y-5">
                  {post.references.map((ref: Reference, i: number) => (
                    <p key={i} className="text-sm text-gray-600 leading-[1.75]">
                      {[ref.authors, ref.year ? `(${ref.year}).` : null, ref.title ? `${ref.title}.` : null]
                        .filter(Boolean)
                        .join(' ')}
                      {ref.journal && <>{' '}<em>{ref.journal}</em></>}
                      {[
                        ref.volume ?? null,
                        ref.issue ? `(${ref.issue})` : null,
                        ref.pages ? `, ${ref.pages}.` : null,
                      ]
                        .filter(Boolean)
                        .join('')}
                      {ref.doi && (
                        <>{' '}<a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className={inlineLink}>{`doi:${ref.doi}`}</a></>
                      )}
                    </p>
                  ))}
                </div>
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
          <p className="font-normal text-sm text-cream/75 leading-[1.8] mb-10">
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
