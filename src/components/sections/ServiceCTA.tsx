import Link from 'next/link';

export default function ServiceCTA() {
  return (
    <section
      style={{ backgroundColor: '#2A4D3C' }}
      className="py-24 px-4 sm:px-6 lg:px-8"
      aria-labelledby="service-cta-heading"
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2
          id="service-cta-heading"
          className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
        >
          Ready to take the first step?
        </h2>
        <p className="font-normal text-sm text-cream/75 leading-[1.8] mb-10">
          Getting started can feel daunting. Send me a message and I&apos;ll get back to you within
          one working day.
        </p>
        <span
          className="block w-12 h-px mx-auto mb-8"
          style={{ backgroundColor: '#d4a843' }}
          aria-hidden="true"
        />
        <Link
          href="/contact"
          className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-normal font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
        >
          Get in Touch
        </Link>
      </div>
    </section>
  );
}
