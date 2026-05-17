'use client';

import { useEffect, useRef, useState } from 'react';

export default function PsychologyTodayBadge() {
  const sealRef = useRef<HTMLAnchorElement>(null);
  const [sealLoaded, setSealLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://member.psychologytoday.com/verified-seal.js';
    script.setAttribute('data-badge', '14');
    script.setAttribute('data-id', '1745757');
    script.setAttribute('data-code', 'aHR0cHM6Ly93d3cucHN5Y2hvbG9neXRvZGF5LmNvbS9hcGkvdmVyaWZpZWQtc2VhbC9zZWFscy8xNC9wcm9maWxlLzE3NDU3NTc/Y2FsbGJhY2s9c3hjYWxsYmFjaw==');
    document.head.appendChild(script);

    let observer: MutationObserver | null = null;
    const el = sealRef.current;
    if (el) {
      observer = new MutationObserver(() => {
        if (el.querySelector('img')) {
          setSealLoaded(true);
          observer?.disconnect();
        }
      });
      observer.observe(el, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  return (
    <>
      {/* PT seal element — hidden until script injects the badge image */}
      <a
        ref={sealRef}
        href="https://www.psychologytoday.com/profile/1745757"
        className="sx-verified-seal"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: sealLoaded ? 'inline-block' : 'none' }}
        aria-label="Verified by Psychology Today"
      />

      {/* Fallback pill — shown until the PT seal loads */}
      {!sealLoaded && (
        <a
          href="https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
          style={{ background: '#c85a1a', borderRadius: '6px', padding: '6px 14px' }}
          aria-label="Verified by Psychology Today"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="white" strokeWidth="1.5" />
            <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-white text-xs font-normal" style={{ letterSpacing: '0.03em' }}>
            Verified by Psychology Today
          </span>
        </a>
      )}
    </>
  );
}
