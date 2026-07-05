import { PRACTICE } from '@/practice.config';
export type InvalidReason = 'no-token' | 'invalid' | 'expired' | 'used';

const messages: Record<InvalidReason, { heading: string; body: string }> = {
  'no-token': {
    heading: 'No link found',
    body: "This form requires a valid private link. If you've been sent a link by Owen, please check your email and try again.",
  },
  'invalid': {
    heading: 'Link not recognised',
    body: "This link doesn't appear to be valid. Please check the link in your email, or contact Owen for a new one.",
  },
  'expired': {
    heading: 'Link has expired',
    body: 'This link was valid for 7 days and has now expired. Please contact Owen to request a new intake link.',
  },
  'used': {
    heading: 'Already submitted',
    body: 'This link has already been used to submit an intake form. If you need to update your information, please contact Owen directly.',
  },
};

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

export default function IntakeInvalid({ reason }: { reason: InvalidReason }) {
  const { heading, body } = messages[reason];
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-5 py-20"
      style={{ backgroundColor: '#F5F0E8' }}
    >
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <OLMark />
        </div>
        <span
          className="block w-10 h-px mx-auto mb-6"
          style={{ backgroundColor: '#D4A843' }}
          aria-hidden="true"
        />
        <h1
          className="font-heading font-light text-2xl sm:text-3xl mb-4"
          style={{ color: '#2A4D3C' }}
        >
          {heading}
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: '#666', lineHeight: 1.8 }}>
          {body}
        </p>
        <a
          href={`mailto:${PRACTICE.email}`}
          className="text-sm font-normal underline underline-offset-2"
          style={{ color: '#C85A1A' }}
        >
          Contact Owen
        </a>
      </div>
    </div>
  );
}
