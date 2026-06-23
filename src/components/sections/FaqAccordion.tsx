export type FaqItem = { q: string; a: string; content?: React.ReactNode };
export type FaqCategory = { category: string; items: FaqItem[] };

// Native <details>/<summary> accordion — zero client JS. Open/close and the
// chevron rotation are handled by the browser + CSS (see .faq-item in
// globals.css), so this is a server component.
export default function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  return (
    <div className="space-y-14">
      {categories.map((cat, ci) => (
        <div key={cat.category}>
          <div className="flex items-center gap-4 mb-8">
            <span className="block w-8 h-px flex-shrink-0" style={{ backgroundColor: '#d4a843' }} aria-hidden="true" />
            <h2 className="font-heading font-light text-2xl text-forest">{cat.category}</h2>
          </div>

          <div className="divide-y divide-[#E8E2D9]">
            {cat.items.map((item, ii) => (
              <details key={`${ci}-${ii}`} className="faq-item">
                <summary className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2">
                  <h3 className="font-heading font-light text-base text-forest leading-snug">
                    {item.q}
                  </h3>
                  <svg
                    className="faq-chevron flex-shrink-0 w-4 h-4 transition-transform duration-300"
                    style={{ color: '#c85a1a' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>

                <div className="pb-5 pl-5" style={{ borderLeft: '2px solid #d4a843' }}>
                  {item.content ?? (
                    <p className="text-base font-normal text-gray-600 leading-[1.8]">{item.a}</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
