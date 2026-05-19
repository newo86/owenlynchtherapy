import Link from 'next/link';
import AnimatedCard from '@/components/ui/AnimatedCard';
import FloatingCircles from '@/components/ui/floating-circles';

const services = [
  {
    name: 'OCD',
    url: '/ocd-therapy-dublin',
    description: 'Intrusive thoughts and compulsive patterns',
  },
  {
    name: 'Anxiety',
    url: '/anxiety-therapy-dublin',
    description: 'Worry, panic and generalised anxiety',
  },
  {
    name: 'ADHD',
    url: '/adhd-therapy-dublin',
    description: 'Attention, focus and executive function',
  },
  {
    name: 'Autism',
    url: '/autism-therapy-dublin',
    description: 'Autistic identity and late diagnosis support',
  },
  {
    name: 'Depression',
    url: '/depression-therapy-dublin',
    description: 'Low mood, hopelessness and withdrawal',
  },
  {
    name: 'Relationships',
    url: '/relationship-therapy-dublin',
    description: 'Communication, conflict and connection',
  },
  {
    name: 'Trauma',
    url: '/trauma-therapy-dublin',
    description: 'Processing difficult past experiences',
  },
  {
    name: 'LGBTQIA+',
    url: '/lgbtqia-therapy-dublin',
    description: 'Identity, community and mental wellbeing',
  },
] as const;

export default function Services() {
  return (
    <section
      className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: '#F5F0E8' }}
      aria-labelledby="services-heading"
    >
      <FloatingCircles />
      <div className="relative max-w-6xl mx-auto" style={{ zIndex: 1 }}>
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            Areas of practice
          </p>
          <h2
            id="services-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-forest"
          >
            How I can help
          </h2>
        </div>

        {/* 4-col grid — collapses to 2 on tablet, 1 on mobile */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 list-none">
          {services.map(({ name, url, description }, i) => (
            <li key={url}>
              <AnimatedCard index={i}>
                <Link
                  href={url}
                  className="group flex flex-col gap-4 bg-white rounded-xl p-6 h-full shadow-sm border border-transparent hover:border-forest/15 hover:shadow-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
                >
                  {/* Gold accent line */}
                  <span
                    className="block w-8 h-px bg-gold transition-all duration-300 group-hover:w-12"
                    aria-hidden="true"
                  />

                  <h3 className="font-heading font-light text-xl text-forest">
                    {name}
                  </h3>

                  <p className="font-normal text-gray-500 text-xs leading-relaxed flex-1">
                    {description}
                  </p>

                  <span
                    className="inline-flex items-center gap-2 text-orange text-[10px] font-normal uppercase tracking-normal group-hover:gap-3 transition-all duration-200"
                    aria-label={`Learn more about ${name} therapy`}
                  >
                    Learn more <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </AnimatedCard>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
