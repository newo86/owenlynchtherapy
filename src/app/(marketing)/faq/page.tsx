import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about psychotherapy with Owen Lynch — what to expect, fees, confidentiality, and more.',
  alternates: { canonical: 'https://owenlynchtherapy.com/faq' },
};

export default function FaqPage() {
  return (
    <section className="max-w-3xl mx-auto px-4 py-20">
      <h1 className="font-heading text-4xl font-bold text-green mb-6">
        Frequently Asked Questions
      </h1>
      <p className="text-gray-600 text-lg">
        {/* FAQ items with JSON-LD FAQPage schema to be built in the FAQ iteration */}
        Placeholder — build this page next.
      </p>
    </section>
  );
}
