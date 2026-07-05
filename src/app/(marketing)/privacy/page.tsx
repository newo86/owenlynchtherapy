import type { Metadata } from 'next';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import { getPractice } from '@/lib/practiceSettings';
import { SITE_URL } from '@/practice.config';

// Privacy policy, generated from the live practice settings so every clone of
// this template publishes an accurate policy naming ITS controller, contact
// details and venue without editing this file. Legal-ish prose is deliberately
// plain-English — the audience is clients, not lawyers.

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How this practice collects, uses, stores and protects your personal information, and the rights you have over it.',
  alternates: { canonical: `${SITE_URL}/privacy` },
  robots: { index: true, follow: true },
};

const h2 = 'font-heading font-light text-2xl text-forest mt-12 mb-4';
const p = 'font-normal text-base leading-[1.8] text-gray-700 mb-4';
const li = 'font-normal text-base leading-[1.8] text-gray-700 mb-2';

export default async function PrivacyPage() {
  const practice = await getPractice();
  const {
    businessName, practitionerName, email, telephoneDisplay, hasInPerson, address,
  } = practice;

  return (
    <>
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="privacy-heading"
      >
        <PageHeroCircles />
        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">
            Your information
          </p>
          <h1 id="privacy-heading" className="font-heading font-light text-4xl sm:text-5xl text-cream mb-6">
            Privacy Policy
          </h1>
          <p className="font-normal text-base text-cream/75 leading-[1.8] max-w-lg">
            How {businessName} collects, uses and protects your personal information.
          </p>
        </div>
      </section>

      <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <p className={p}>
            Therapy depends on trust, and that includes trusting what happens to your
            information. This page explains, in plain language, what {businessName} collects,
            why, where it is kept, and the rights you have over it under the General Data
            Protection Regulation (GDPR).
          </p>

          <h2 className={h2}>Who is responsible for your data</h2>
          <p className={p}>
            {practitionerName} is the data controller for all personal information handled by
            this practice. You can reach me about anything on this page at{' '}
            <a href={`mailto:${email}`} className="text-orange h-hover:underline">{email}</a>
            {telephoneDisplay ? ` or ${telephoneDisplay}` : ''}.
            {hasInPerson
              ? ` In-person sessions take place at ${address.venue}, ${address.streetAddress}, ${address.addressLocality}.`
              : ''}
          </p>

          <h2 className={h2}>What I collect, and why</h2>
          <ul className="list-disc pl-6 mb-4">
            <li className={li}><strong>Contact and waiting-list enquiries</strong> — your name, email and phone number, so I can reply to you. Waiting-list entries are kept only until you become a client, ask to be removed, or the entry goes stale.</li>
            <li className={li}><strong>Intake information</strong> — when you become a client you complete an intake form covering your contact details, relevant history and consent. This is clinical information and is treated with the highest level of care.</li>
            <li className={li}><strong>Session and payment records</strong> — appointment dates, attendance, fees and receipts, kept because I am professionally and legally required to keep accurate records.</li>
            <li className={li}><strong>Basic website analytics</strong> — anonymous usage statistics that help me understand how people find the site. Nothing here identifies you.</li>
          </ul>
          <p className={p}>
            The lawful bases are: taking steps to enter and perform our therapy agreement
            (contract), legal obligations around records and accounts, and your consent for
            the waiting list and reminder emails — which you can withdraw at any time (every
            reminder includes an opt-out link).
          </p>

          <h2 className={h2}>Where your data lives</h2>
          <p className={p}>
            Records are stored in a private, access-controlled database hosted in the
            European Union (Supabase). Email is sent through Resend. Card payments are
            processed by Stripe — your card details go directly to Stripe and are never
            seen or stored by this practice. Appointments sync with Google Calendar. The
            website is hosted on Vercel. Each of these providers processes data under a GDPR
            data-processing agreement. Your information is never sold or shared for
            marketing.
          </p>

          <h2 className={h2}>How long I keep it</h2>
          <ul className="list-disc pl-6 mb-4">
            <li className={li}>Clinical records (intake, sessions) — <strong>7 years after our last contact</strong>, in line with professional record-keeping guidance, then deleted.</li>
            <li className={li}>Unused intake links — deleted automatically 30 days after they expire.</li>
            <li className={li}>Waiting-list entries — deleted once no longer needed, or immediately on request.</li>
            <li className={li}>Financial records (receipts) — kept as required by Revenue rules.</li>
          </ul>

          <h2 className={h2}>Your rights</h2>
          <p className={p}>
            You can ask at any time to see the information I hold about you, have mistakes
            corrected, receive a copy, or — subject to the record-keeping obligations above —
            have it deleted. Just email{' '}
            <a href={`mailto:${email}`} className="text-orange h-hover:underline">{email}</a>.
            If you are unhappy with how your information has been handled you can complain to
            the Data Protection Commission (dataprotection.ie).
          </p>

          <h2 className={h2}>Confidentiality</h2>
          <p className={p}>
            Beyond data protection law, everything you share in therapy is held in
            professional confidence, with the narrow exceptions required by law or to
            prevent serious harm — which I explain fully before we begin working together.
          </p>
        </div>
      </section>
    </>
  );
}
