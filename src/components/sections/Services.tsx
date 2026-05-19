import ServiceCard from '@/components/ui/ServiceCard';
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
              <ServiceCard name={name} url={url} description={description} index={i} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
