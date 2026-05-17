import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Articles and insights on mental health, therapy, and wellbeing from Owen Lynch Psychotherapy.',
  alternates: { canonical: 'https://owenlynchtherapy.com/blog' },
};

export default function BlogPage() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-20">
      <h1 className="font-heading text-4xl font-bold text-green mb-6">
        Blog
      </h1>
      <p className="text-gray-600 text-lg">
        {/* Content to be built in the Blog page iteration (Sanity-powered) */}
        Placeholder — build this page next.
      </p>
    </section>
  );
}
