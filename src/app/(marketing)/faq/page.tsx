import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FaqAccordion from '@/components/sections/FaqAccordion';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions | Owen Lynch Psychotherapy Dublin',
  description:
    'Answers to common questions about psychotherapy in Dublin and online — fees, what to expect, confidentiality, ADHD, OCD, online sessions, and more.',
  alternates: { canonical: 'https://owenlynchtherapy.com/faq' },
  openGraph: {
    title: 'Frequently Asked Questions | Owen Lynch Psychotherapy Dublin',
    description:
      'Answers to common questions about psychotherapy in Dublin and online — fees, what to expect, confidentiality, ADHD, OCD, online sessions, and more.',
    url: 'https://owenlynchtherapy.com/faq',
  },
};

const faqCategories = [
  {
    category: 'Getting Started',
    items: [
      {
        q: 'How do I know if therapy is right for me?',
        a: "You don't need to be in crisis to benefit from therapy. Many people come to therapy because something feels off — persistent anxiety, low mood, relationship difficulties, or a sense of being stuck. Others come following a specific event or diagnosis. If you're curious about therapy, that curiosity is usually reason enough to explore it. Getting in touch doesn't commit you to anything — it's just a conversation.",
      },
      {
        q: 'What happens in the first session?',
        a: "The first session is a chance for us to meet and for me to understand what's brought you to therapy. I'll ask about what you're experiencing, what you're hoping to get from the work, and a little about your background. There's no pressure to share more than feels comfortable. By the end we'll have a sense of whether working together feels like a good fit.",
      },
      {
        q: 'How long will I need therapy for?',
        a: "This varies enormously from person to person. Some people find significant benefit in six to twelve sessions. Others prefer to work longer term. We'll review how things are going regularly and you're always free to end or pause at any point. There's no minimum commitment.",
      },
      {
        q: 'Do I need a GP referral?',
        a: 'No. You can contact me directly — no referral needed. If you are also seeing a GP or psychiatrist, it can sometimes be useful for us to work alongside them, but this is entirely up to you.',
      },
    ],
  },
  {
    category: 'Fees and Practicalities',
    items: [
      {
        q: 'How much does therapy cost?',
        a: 'Sessions are €90 for 50 minutes. I keep my fees transparent and there are no hidden charges.',
      },
      {
        q: 'Can I claim tax relief on therapy fees?',
        a: "Yes. Psychotherapy fees qualify for tax relief in Ireland under the MED 1 claim. At the standard 20% tax rate this reduces the effective cost per session. Keep your receipts and claim at year end through Revenue's myAccount.",
      },
      {
        q: 'What is your cancellation policy?',
        a: "I ask for at least 48 hours notice to cancel or reschedule a session. Sessions cancelled with less than 48 hours notice may be charged in full. I understand that emergencies happen and I try to be reasonable — if something unexpected comes up, just get in touch as soon as you can.",
      },
      {
        q: 'Do you offer reduced fees?',
        a: "I keep a small number of lower-fee slots for people who would otherwise find therapy inaccessible. If cost is a barrier, feel free to mention this when you get in touch and we can talk about what might be possible.",
      },
    ],
  },
  {
    category: 'Online Therapy',
    items: [
      {
        q: 'Is online therapy as effective as in-person?',
        a: 'Research consistently shows that online therapy is as effective as in-person therapy for most presentations — including anxiety, depression, OCD, and trauma. Many people find online sessions more comfortable, particularly when discussing sensitive topics. The therapeutic relationship — which is what matters most — develops just as well over video.',
      },
      {
        q: 'What platform do you use for online sessions?',
        a: "I use a secure, encrypted video platform. You'll receive a link before each session. All you need is a device with a camera and microphone and a private space where you won't be interrupted.",
      },
      {
        q: 'Can I switch between online and in-person sessions?',
        a: 'Yes — many clients mix both depending on what suits them week to week. In-person sessions take place at Insight Matters, 106 Capel Street, Dublin 1.',
      },
      {
        q: "I'm based outside Ireland — can I work with you?",
        a: "I work with clients across Ireland and the UK via online sessions. If you're based elsewhere, feel free to get in touch and we can discuss whether working together is feasible.",
      },
    ],
  },
  {
    category: 'Confidentiality and Safety',
    items: [
      {
        q: 'Is what I say confidential?',
        a: "Yes. Everything discussed in our sessions is confidential. There are a small number of legal and ethical exceptions — for example if I believed there was a serious and immediate risk to your life or someone else's. I'll explain these limits clearly in our first session. Outside of these rare circumstances, nothing leaves the room.",
      },
      {
        q: 'Do you keep notes?',
        a: 'I keep brief clinical notes as required by my accreditation bodies IAHIP and ICP. These are stored securely and are not shared with anyone without your consent.',
      },
      {
        q: "What if I'm in crisis?",
        a: 'If you are in immediate danger please contact emergency services (999/112) or go to your nearest emergency department. The Samaritans are available 24/7 on 116 123. If you\'re a client and you\'re struggling between sessions, please reach out and I\'ll respond as soon as I can.',
      },
    ],
  },
  {
    category: 'Specialist Areas',
    items: [
      {
        q: 'Do you work with ADHD?',
        a: "Yes. I work with adults who are diagnosed with ADHD or exploring whether ADHD might be a factor in their difficulties. Therapy for ADHD isn't about fixing your brain — it's about understanding how it works and building strategies that actually fit you.",
      },
      {
        q: 'Do you work with OCD?',
        a: 'Yes. I use CBT and Exposure and Response Prevention (ERP) — the most evidence-based approaches for OCD. I work with all presentations of OCD including intrusive thoughts, checking, contamination fears, and pure O.',
      },
      {
        q: 'Do you work with autistic adults?',
        a: "Yes. I have experience working with autistic adults including those who are late-diagnosed or self-identifying. Therapy is adapted to suit how you communicate and process — there's no expectation to mask or perform neurotypicality here.",
      },
      {
        q: 'Do you work with LGBTQIA+ clients?',
        a: "Yes. This is an affirming, non-judgmental space. You don't need to explain or justify your identity — we can get straight to what's actually brought you to therapy. I also have experience working with chemsex-related concerns.",
      },
      {
        q: "I've never been diagnosed with anything — can I still come to therapy?",
        a: "Absolutely. Most people who come to therapy don't have — and don't need — a diagnosis. You just need to feel that something could be better. That's enough.",
      },
    ],
  },
];

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqCategories.flatMap(cat =>
    cat.items.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    }))
  ),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* ── Section 1: Hero ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="faq-hero-heading"
      >
        <PageHeroCircles />
        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="text-white md:text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
            Got a question
          </p>
          <h1
            id="faq-hero-heading"
            className="font-heading font-light text-4xl sm:text-5xl lg:text-[3.25rem] leading-tight text-white mb-4"
          >
            Frequently Asked Questions
          </h1>
          <p className="font-normal text-base text-cream/75 leading-[1.8] max-w-lg">
            Everything you need to know before getting in touch.
          </p>
        </div>
      </section>

      {/* ── Section 2: FAQ accordion ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="py-20 px-4 sm:px-6 lg:px-8"
        aria-label="Frequently asked questions"
      >
        <div className="max-w-3xl mx-auto">
          <FaqAccordion categories={faqCategories} />
        </div>
      </section>

      {/* ── Section 3: CTA ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="faq-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-orange text-xs font-normal uppercase tracking-[3px] mb-5">
            Get in touch
          </p>
          <h2
            id="faq-cta-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
          >
            Still have a question?
          </h2>
          <p className="font-normal text-sm text-cream/70 leading-[1.8] mb-10">
            Feel free to get in touch — I&apos;m happy to answer anything before you decide to book.
          </p>
          <span
            className="block w-12 h-px mx-auto mb-8"
            style={{ backgroundColor: '#d4a843' }}
            aria-hidden="true"
          />
          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-[2px] font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </>
  );
}
