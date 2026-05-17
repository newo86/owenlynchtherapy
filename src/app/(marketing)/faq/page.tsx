import type { Metadata } from 'next';
import PageHeroCircles from '@/components/sections/PageHeroCircles';

export const metadata: Metadata = {
  title: 'FAQ | Owen Lynch Psychotherapy Dublin',
  description:
    'Frequently asked questions about psychotherapy with Owen Lynch — what to expect, fees, confidentiality, and more.',
  alternates: { canonical: 'https://owenlynchtherapy.com/faq' },
};

export default function FaqPage() {
  return (
    <>
      {/* ── Section 1: Hero ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="faq-hero-heading"
      >
        <PageHeroCircles />
        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-white md:text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
            Questions &amp; answers
          </p>
          <h1
            id="faq-hero-heading"
            className="font-heading font-light text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-cream"
          >
            Frequently Asked Questions
          </h1>
        </div>
      </section>

      {/* ── Section 2: FAQ content ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <p className="text-gray-600 text-sm leading-[1.8]">
            {/* FAQ items with JSON-LD FAQPage schema to be built in the FAQ iteration */}
            Placeholder — build this page next.
          </p>
        </div>
      </section>
    </>
  );
}
