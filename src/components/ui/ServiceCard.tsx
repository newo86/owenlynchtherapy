'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

interface Props {
  name: string;
  url: string;
  description: string;
  index: number;
}

export default function ServiceCard({ name, url, description, index }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [entered, setEntered] = useState(false);
  const [lineVisible, setLineVisible] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Entry + accent-line reveal, formerly framer-motion. The observer fires
  // once; CSS transitions handle the fade/rise (inline below) and hover lift.
  // `entered` drops the stagger delay after the entry runs so hover stays snappy.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          timers.push(setTimeout(() => setLineVisible(true), (0.2 + index * 0.08) * 1000));
          timers.push(setTimeout(() => setEntered(true), index * 100 + 650));
          observer.disconnect();
        }
      },
      { rootMargin: '-60px 0px' },
    );
    observer.observe(el);
    return () => { observer.disconnect(); timers.forEach(clearTimeout); };
  }, [index]);

  return (
    <div
      ref={ref}
      className="service-card-border rounded-xl h-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        opacity: inView ? 1 : 0,
        transform: hovered ? 'translateY(-4px)' : inView ? 'none' : 'translateY(24px)',
        transition: 'opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.45s cubic-bezier(0.22,1,0.36,1)',
        transitionDelay: entered ? '0s' : `${index * 0.1}s`,
      }}
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
    </div>
  );
}
