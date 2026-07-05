import { PRACTICE } from '@/practice.config';
const OLMark = () => (
  <svg width="56" height="56" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="100" cy="100" r="82" fill="none" stroke="#C85A1A" strokeWidth="9"
      strokeLinecap="round" strokeDasharray="335 180" transform="rotate(70,100,100)" />
    <circle cx="100" cy="100" r="50" fill="none" stroke="#2A4D3C" strokeWidth="6"
      strokeLinecap="round" strokeDasharray="200 100" transform="rotate(70,100,100)" />
    <text x="100" y="108" fontFamily="Avenir,'Avenir Next',Montserrat,sans-serif"
      fontSize="44" fontWeight="300" fill="#2A4D3C" textAnchor="middle">OL</text>
  </svg>
);

export default function IntakeConfirmation({ displayName }: { displayName: string }) {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-5 py-20"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      <div className="max-w-lg w-full text-center">
        <div className="flex justify-center mb-6">
          <OLMark />
        </div>
        <span
          className="block w-10 h-px mx-auto mb-6"
          style={{ backgroundColor: '#D4A843' }}
          aria-hidden="true"
        />
        <h1
          className="font-heading font-light text-3xl sm:text-4xl mb-6"
          style={{ color: '#2A4D3C' }}
        >
          Thank you, {displayName}.
        </h1>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#555', lineHeight: 1.8 }}>
          Your information has been submitted securely. I&apos;ll review this before our first
          session.
        </p>
        <p className="text-sm leading-relaxed mb-4" style={{ color: '#555', lineHeight: 1.8 }}>
          If you have any questions in the meantime, feel free to email me at{' '}
          <a
            href={`mailto:${PRACTICE.email}`}
            className="underline underline-offset-2"
            style={{ color: '#C85A1A' }}
          >{PRACTICE.email}</a>
          .
        </p>
        <p className="text-sm leading-relaxed" style={{ color: '#555', lineHeight: 1.8 }}>
          Looking forward to working with you. &mdash; Owen
        </p>
      </div>
    </div>
  );
}
