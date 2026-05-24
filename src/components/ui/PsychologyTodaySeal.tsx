'use client';

import Script from 'next/script';

export default function PsychologyTodaySeal() {
  return (
    <>
      <a
        href="https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757"
        className="sx-verified-seal"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Psychology Today verified therapist"
      />
      <Script
        src="https://member.psychologytoday.com/verified-seal.js"
        data-badge="14"
        data-id="1745757"
        data-code="aHR0cHM6Ly93d3cucHN5Y2hvbG9neXRvZGF5LmNvbS9hcGkvdmVyaWZpZWQtc2VhbC9zZWFscy8xNC9wcm9maWxlLzE3NDU3NTc/Y2FsbGJhY2s9c3hjYWxsYmFjaw=="
        strategy="afterInteractive"
      />
    </>
  );
}
