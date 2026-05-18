import Image from 'next/image';
import Link from 'next/link';

export default function AboutTeaser() {
  return (
    <section
      className="py-24 px-4 sm:px-6 lg:px-8 border-t border-forest/10"
      style={{ backgroundColor: '#F5F0E8' }}
      aria-labelledby="about-teaser-heading"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-16">

        {/* Portrait — full width on mobile, fixed width on desktop */}
        <div className="w-full md:w-[320px] lg:w-[360px] shrink-0">
          <Image
            src="/images/Owen1.jpg"
            alt="Owen Lynch, IAHIP and ICP accredited psychotherapist based in Dublin"
            width={4370}
            height={6555}
            className="w-full h-auto rounded-xl object-cover"
            sizes="(max-width: 768px) 100vw, 360px"
            priority={false}
          />
        </div>

        {/* Text */}
        <div className="flex-1 text-center md:text-left">
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            About me
          </p>

          <h2
            id="about-teaser-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-forest mb-10"
          >
            A gentle, non-judgmental approach
          </h2>

          <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-5">
            I&apos;m Owen Lynch, an{' '}
            <a href="https://psychotherapistdirectory.iahip.org/therapist/owen-lynch" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-orange/50 hover:decoration-orange transition-colors">IAHIP</a>
            {' '}and{' '}
            <a href="https://psychotherapycouncil.ie/therapist/owen-lynch/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-orange/50 hover:decoration-orange transition-colors">ICP</a>
            {' '}accredited psychotherapist based in Dublin. I work with adults
            navigating anxiety, identity, relationships, and the quieter struggles that are often
            hardest to name.
          </p>

          <p className="font-normal text-sm text-gray-600 leading-[1.8] mb-12">
            I work with curiosity and honesty &mdash; that means I&apos;ll support you fully, and
            I&apos;ll also challenge you when it&apos;s needed.
          </p>

          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-forest text-xs font-normal uppercase tracking-normal border-b border-forest/40 pb-0.5 hover:border-forest transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest rounded-sm"
          >
            Read more about my approach <span aria-hidden="true">→</span>
          </Link>
        </div>

      </div>
    </section>
  );
}
