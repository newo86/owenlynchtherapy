'use client';

import { useState } from 'react';

export type FaqItem = { q: string; a: string; content?: React.ReactNode };
export type FaqCategory = { category: string; items: FaqItem[] };

export default function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setOpenKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-14">
      {categories.map((cat, ci) => (
        <div key={cat.category}>
          <div className="flex items-center gap-4 mb-8">
            <span className="block w-8 h-px flex-shrink-0" style={{ backgroundColor: '#d4a843' }} aria-hidden="true" />
            <h2 className="font-heading font-light text-2xl text-forest">{cat.category}</h2>
          </div>

          <div className="divide-y divide-[#E8E2D9]">
            {cat.items.map((item, ii) => {
              const key = `${ci}-${ii}`;
              const isOpen = openKeys.has(key);
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2"
                  >
                    <h3 className="font-heading font-light text-base text-forest leading-snug">
                      {item.q}
                    </h3>
                    <svg
                      className="flex-shrink-0 w-4 h-4 transition-transform duration-300"
                      style={{
                        color: '#c85a1a',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <div
                    className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                    style={{ maxHeight: isOpen ? '800px' : '0px' }}
                  >
                    <div
                      className="pb-5 pl-5"
                      style={{ borderLeft: '2px solid #d4a843' }}
                    >
                      {item.content ?? (
                        <p className="text-sm font-normal text-gray-600 leading-[1.8]">{item.a}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
