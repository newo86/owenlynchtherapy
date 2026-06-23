'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedCardProps {
  children: React.ReactNode;
  index: number;
  className?: string;
}

// Scroll-reveal entry animation, formerly framer-motion. An IntersectionObserver
// adds .is-in once the card scrolls into view (once), and CSS handles the
// fade/rise (see .anim-rise in globals.css). Per-card stagger via inline delay.
export default function AnimatedCard({ children, index, className }: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '-60px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`anim-rise flex flex-col h-full${shown ? ' is-in' : ''}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: `${index * 0.1}s` }}
    >
      {children}
    </div>
  );
}
