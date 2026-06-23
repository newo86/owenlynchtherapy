'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';

interface Props {
  name: string;
  url: string;
  description: string;
  index: number;
}

export default function ServiceCard({ name, url, description, index }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [lineVisible, setLineVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const id = setTimeout(
            () => setLineVisible(true),
            (0.2 + index * 0.08) * 1000,
          );
          observer.disconnect();
          return () => clearTimeout(id);
        }
      },
      { rootMargin: '-60px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <motion.div
      ref={ref}
      className="service-card-border rounded-xl h-full"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Link
        href={url}
        className={`relative z-[1] flex flex-col gap-4 bg-white rounded-xl p-6 h-full transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest ${
          hovered ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        {/* Gold accent line — draws in on scroll, widens on hover */}
        <span
          aria-hidden="true"
          className="block h-px bg-gold"
          style={{
            width: hovered ? '3rem' : lineVisible ? '2rem' : '0rem',
            transitionProperty: 'width',
            transitionDuration: hovered ? '200ms' : '400ms',
            transitionTimingFunction: 'ease-out',
          }}
        />

        <h3 className="font-heading font-light text-2xl text-forest">{name}</h3>

        <p className="font-normal text-gray-500 text-base leading-relaxed flex-1">{description}</p>

        <span className="inline-flex items-center gap-2 text-orange text-xs font-normal uppercase tracking-normal">
          Learn more{' '}
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              transform: hovered ? 'translateX(4px)' : 'translateX(0)',
              transition: 'transform 200ms ease-out',
            }}
          >
            →
          </span>
        </span>
      </Link>
    </motion.div>
  );
}
