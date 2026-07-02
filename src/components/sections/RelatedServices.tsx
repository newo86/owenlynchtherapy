import Link from 'next/link';

// Cross-links between the condition landing pages. These pages are the ones
// meant to rank; without internal links between them each one is a dead end
// for both visitors and crawlers.
const PAGES = {
  'ocd-therapy-dublin': 'OCD Therapy',
  'anxiety-therapy-dublin': 'Anxiety Therapy',
  'adhd-therapy-dublin': 'ADHD Therapy',
  'autism-therapy-dublin': 'Autism Therapy',
  'depression-therapy-dublin': 'Depression Therapy',
  'relationship-therapy-dublin': 'Relationship Therapy',
  'trauma-therapy-dublin': 'Trauma Therapy',
  'lgbtqia-therapy-dublin': 'LGBTQIA+ Therapy',
} as const;

type Slug = keyof typeof PAGES;

const RELATED: Record<Slug, Slug[]> = {
  'ocd-therapy-dublin': ['anxiety-therapy-dublin', 'adhd-therapy-dublin', 'autism-therapy-dublin'],
  'anxiety-therapy-dublin': ['ocd-therapy-dublin', 'depression-therapy-dublin', 'trauma-therapy-dublin'],
  'adhd-therapy-dublin': ['autism-therapy-dublin', 'anxiety-therapy-dublin', 'ocd-therapy-dublin'],
  'autism-therapy-dublin': ['adhd-therapy-dublin', 'anxiety-therapy-dublin', 'lgbtqia-therapy-dublin'],
  'depression-therapy-dublin': ['anxiety-therapy-dublin', 'trauma-therapy-dublin', 'relationship-therapy-dublin'],
  'relationship-therapy-dublin': ['depression-therapy-dublin', 'trauma-therapy-dublin', 'lgbtqia-therapy-dublin'],
  'trauma-therapy-dublin': ['anxiety-therapy-dublin', 'depression-therapy-dublin', 'relationship-therapy-dublin'],
  'lgbtqia-therapy-dublin': ['relationship-therapy-dublin', 'anxiety-therapy-dublin', 'depression-therapy-dublin'],
};

export default function RelatedServices({ current }: { current: Slug }) {
  const related = RELATED[current];

  return (
    <section
      className="py-16 px-4 sm:px-6 lg:px-8 bg-white"
      aria-labelledby="related-services-heading"
    >
      <div className="max-w-4xl mx-auto">
        <div className="max-w-[720px] mx-auto">
          <h2
            id="related-services-heading"
            className="font-heading font-light text-2xl text-forest mb-8"
          >
            Other areas I work with
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 list-none">
            {related.map(slug => (
              <li key={slug}>
                <Link
                  href={`/${slug}`}
                  className="block rounded-lg bg-[#F5F0E8] px-5 py-4 font-normal text-base text-forest h-hover:text-orange h-can:transition-colors"
                  style={{ borderTop: '3px solid #c85a1a' }}
                >
                  {PAGES[slug]}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 font-normal text-base text-gray-600">
            Or see{' '}
            <Link
              href="/services"
              className="text-orange underline underline-offset-2 h-hover:opacity-80 h-can:transition-opacity"
            >
              everything I work with
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
