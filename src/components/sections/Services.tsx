import Link from 'next/link';
import AnimatedCard from '@/components/ui/AnimatedCard';
import FloatingCircles from '@/components/ui/floating-circles';

const services = [
  {
    name: 'OCD',
    url: '/ocd-therapy-dublin',
    description:
      'Intrusive thoughts, compulsive behaviours, constant doubt – OCD can be exhausting and isolating. Therapy can help you break the cycle and reclaim your day-to-day life.',
  },
  {
    name: 'Anxiety',
    url: '/anxiety-therapy-dublin',
    description:
      "Racing thoughts, constant worry, a body that won't settle – anxiety can make everything feel harder than it should. Therapy offers a space to understand what's driving it and find steadier ground.",
  },
  {
    name: 'ADHD',
    url: '/adhd-therapy-dublin',
    description:
      "Whether you're recently diagnosed or starting to wonder if ADHD might explain a lot, therapy can help you make sense of how your brain works – and build a life that works with it, not against it.",
  },
  {
    name: 'Autism',
    url: '/autism-therapy-dublin',
    description:
      "Late diagnosis, masking, sensory overwhelm, navigating a world that wasn't designed with you in mind – therapy can be a space to understand yourself better and live more comfortably as you are.",
  },
  {
    name: 'Depression',
    url: '/depression-therapy-dublin',
    description:
      "Loss of motivation, withdrawing from the people and things you care about, a heaviness that won't lift – therapy can help you gently reconnect with yourself and find a way forward.",
  },
  {
    name: 'Relationships',
    url: '/relationship-therapy-dublin',
    description:
      "Patterns that keep repeating, communication that breaks down, feeling disconnected from the people closest to you – therapy can help you understand what's happening and start to shift it.",
  },
  {
    name: 'Trauma',
    url: '/trauma-therapy-dublin',
    description:
      'When difficult experiences from the past keep showing up in the present – in your body, your reactions, your relationships – therapy offers a safe space to process what happened at your own pace.',
  },
  {
    name: 'LGBTQIA+',
    url: '/lgbtqia-therapy-dublin',
    description:
      'Navigating identity, relationships, coming out, minority stress, chemsex, or just wanting a therapist who gets it without you having to explain – this is an affirming space where you can bring your whole self.',
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
