import Link from 'next/link';

export default function HomeCta() {
  return (
    <section
      className="py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: '#2A4D3C' }}
      aria-labelledby="cta-heading"
    >
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-orange text-xs font-semibold uppercase tracking-[2px] mb-5">
          Get in touch
        </p>

        <h2
          id="cta-heading"
          className="font-heading font-light text-3xl sm:text-4xl text-white mb-6"
        >
          Taking the first step takes courage
        </h2>

        <p className="font-normal text-sm text-white/70 leading-[1.8] mb-12">
          Getting started can feel daunting. If you&apos;d like to find out more or check
          availability, send me a message and I&apos;ll get back to you within one working day.
        </p>

        {/* Gold highlight line above CTA — accent only */}
        <span
          className="block w-12 h-px bg-gold mx-auto mb-8"
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
  );
}
