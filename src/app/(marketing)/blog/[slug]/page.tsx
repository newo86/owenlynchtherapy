import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // TODO: fetch post from Sanity and populate metadata
  return {
    title: slug,
    alternates: {
      canonical: `https://owenlynchtherapy.com/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  // TODO: fetch post from Sanity; call notFound() if no result
  if (!slug) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 py-20">
      <h1 className="font-heading text-4xl font-bold text-green mb-6">
        {slug}
      </h1>
      <p className="text-gray-600">
        {/* Sanity-powered content to be built in the Blog post iteration */}
        Placeholder — build this page next.
      </p>
    </article>
  );
}
