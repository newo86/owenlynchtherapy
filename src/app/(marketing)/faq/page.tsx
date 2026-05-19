import type { Metadata } from 'next';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FaqAccordion, { type FaqCategory } from '@/components/sections/FaqAccordion';
import FloatingCircles from '@/components/ui/floating-circles';

export const metadata: Metadata = {
  title: 'FAQ | Psychotherapy Dublin and Online | Owen Lynch',
  description:
    'Answers to common questions about psychotherapy in Dublin and online therapy in Ireland. IAHIP accredited. OCD therapy, ADHD therapy, anxiety, confidential sessions.',
  alternates: {
    canonical: 'https://owenlynchtherapy.com/faq',
    languages: {
      'en-IE': 'https://owenlynchtherapy.com/faq',
      'x-default': 'https://owenlynchtherapy.com/faq',
    },
  },
  openGraph: {
    title: 'FAQ | Psychotherapy Dublin and Online | Owen Lynch',
    description:
      'Answers to common questions about psychotherapy in Dublin and online therapy in Ireland. IAHIP accredited. OCD therapy, ADHD therapy, anxiety, confidential sessions.',
    url: 'https://owenlynchtherapy.com/faq',
  },
};

const linkClass = 'underline underline-offset-2 decoration-orange/50 hover:decoration-orange transition-colors';
const IAHIP = <a href="https://psychotherapistdirectory.iahip.org/therapist/owen-lynch" target="_blank" rel="noopener noreferrer" className={linkClass}>IAHIP</a>;
const ICP   = <a href="https://psychotherapycouncil.ie/therapist/owen-lynch/" target="_blank" rel="noopener noreferrer" className={linkClass}>ICP</a>;

/* ── Crisis answer: rich content rendered in the accordion ── */
const crisisContent = (
  <div className="text-sm font-normal text-gray-600 leading-[1.8] space-y-4">
    <p>
      If you or someone you know is in immediate danger, or if there is any risk to life,
      please go straight to your nearest emergency department or call emergency services now.
    </p>
    <ul className="space-y-2">
      <li>
        <span className="font-medium text-gray-700">Emergency Services:</span>{' '}
        <span className="font-medium" style={{ color: '#2D5A42' }}>999 or 112</span>
        {', available 24/7'}
      </li>
      <li>
        <a href="https://www.samaritans.org/ireland/" target="_blank" rel="noopener noreferrer"
          className="text-orange hover:underline">Samaritans</a>
        {': '}
        <span className="font-medium" style={{ color: '#2D5A42' }}>116 123</span>
        {', available 24/7'}
      </li>
      <li>
        <a href="https://www.textaboutit.ie/" target="_blank" rel="noopener noreferrer"
          className="text-orange hover:underline">Text About It</a>
        {': Text '}
        <span className="font-medium" style={{ color: '#2D5A42' }}>HELLO to 50808</span>
      </li>
      <li>
        <a href="https://www.pieta.ie/" target="_blank" rel="noopener noreferrer"
          className="text-orange hover:underline">Pieta</a>
        {': '}
        <span className="font-medium" style={{ color: '#2D5A42' }}>1800 247 247</span>
        {' or text '}
        <span className="font-medium" style={{ color: '#2D5A42' }}>HELP to 51444</span>
      </li>
      <li>
        <a href="https://www2.hse.ie/mental-health/" target="_blank" rel="noopener noreferrer"
          className="text-orange hover:underline">HSE YourMentalHealth</a>
        {': '}
        <span className="font-medium" style={{ color: '#2D5A42' }}>1800 742 444</span>
      </li>
      <li>
        <a href="https://www.childline.ie/" target="_blank" rel="noopener noreferrer"
          className="text-orange hover:underline">Childline</a>
        {' (under 18s): '}
        <span className="font-medium" style={{ color: '#2D5A42' }}>1800 66 66 66</span>
      </li>
    </ul>
    <p>
      If you are a current client and struggling between sessions, please reach out by email
      and I will respond as soon as I can.
    </p>
  </div>
);

/* ── FAQ data: `a` is plain text used in JSON-LD; `content` overrides the rendered UI ── */
const faqCategories: FaqCategory[] = [
  {
    category: 'Getting Started with Therapy',
    items: [
      {
        q: 'How do I know if therapy is right for me?',
        a: "You don't need to be in crisis to benefit from therapy. Many people come to therapy because something feels off: persistent anxiety, low mood, relationship difficulties, or a sense of being stuck. Others come following a specific event or diagnosis. If you're curious about therapy, that curiosity is usually reason enough to explore it. Getting in touch doesn't commit you to anything. It's just a conversation.",
      },
      {
        q: 'What happens in the first session?',
        a: "The first session is a chance for us to meet and for me to understand what has brought you to therapy. I will ask about what you are experiencing, what you are hoping for, and a little about your background. There is no pressure to share more than feels comfortable. By the end we will have a sense of whether working together feels like a good fit.",
      },
      {
        q: 'How long will I need therapy for?',
        a: "This varies enormously from person to person. Some people find significant benefit in six to twelve sessions. Others prefer to work longer term. We'll review how things are going regularly and you're always free to end or pause at any point. There's no minimum commitment.",
      },
      {
        q: 'Do I need a GP referral?',
        a: 'No. You can contact me directly, no referral needed. If you are also seeing a GP or psychiatrist, it can sometimes be useful for us to work alongside them, but this is entirely up to you.',
      },
    ],
  },
  {
    category: 'Fees and Session Information',
    items: [
      {
        q: 'How much does therapy cost?',
        a: 'Sessions are €80 in person and €70 online for 50 minutes. I keep my fees transparent and there are no hidden charges.',
      },
      {
        q: 'Am I covered by health insurance?',
        a: 'Depending on your health insurance plan, yes. Many plans provide partial refunds or discounts on psychotherapy sessions. I am fully accredited by both IAHIP and ICP, which means my sessions should qualify under most plans that cover psychotherapy. Check directly with your insurance provider to confirm your specific cover.',
        content: <p className="text-sm font-normal text-gray-600 leading-[1.8]">Depending on your health insurance plan, yes. Many plans provide partial refunds or discounts on psychotherapy sessions. I am fully accredited by both {IAHIP} and {ICP}, which means my sessions should qualify under most plans that cover psychotherapy. Check directly with your insurance provider to confirm your specific cover.</p>,
      },
      {
        q: 'What is your cancellation policy?',
        a: 'I ask for at least 48 hours notice to cancel or reschedule a session. Sessions cancelled with less than 48 hours notice may be charged in full. I understand that emergencies happen and I try to be reasonable. If something unexpected comes up, just get in touch as soon as you can.',
      },
      {
        q: 'Do you offer reduced fees?',
        a: "I keep a small number of lower-fee slots for people who would otherwise find therapy inaccessible. If cost is a barrier, feel free to mention this when you get in touch and we can talk about what might be possible.",
      },
    ],
  },
  {
    category: 'Online Therapy in Ireland and the UK',
    items: [
      {
        q: 'Is online therapy as effective as in-person?',
        a: 'Research consistently shows that online therapy is as effective as in-person therapy for most presentations, including anxiety, depression, OCD, and trauma. Many people find online sessions more comfortable, particularly when discussing sensitive topics. The therapeutic relationship, which is what matters most, develops just as well over video.',
      },
      {
        q: 'What platform do you use for online sessions?',
        a: "I use a secure, encrypted video platform. You'll receive a link before each session. All you need is a device with a camera and microphone and a private space where you won't be interrupted.",
      },
      {
        q: 'Can I switch between online and in-person sessions?',
        a: 'Yes, many clients mix both depending on what suits them week to week. In-person sessions take place at Insight Matters, 106 Capel Street, Dublin 1.',
      },
      {
        q: "I'm based outside Ireland. Can I work with you?",
        a: "I work with clients across Ireland and the UK via online sessions. If you're based elsewhere, feel free to get in touch and we can discuss whether working together is feasible.",
      },
    ],
  },
  {
    category: 'Confidentiality and Safety',
    items: [
      {
        q: 'Is what I say confidential?',
        a: "Yes. Everything discussed in our sessions is confidential. There are a small number of legal and ethical exceptions: for example, if I believed there was a serious and immediate risk to your life or someone else's. I'll explain these limits clearly in our first session. Outside of these rare circumstances, nothing leaves the room.",
      },
      {
        q: 'Do you keep notes?',
        a: 'I keep brief clinical notes as required by my accreditation bodies IAHIP and ICP. These are stored securely and are not shared with anyone without your consent.',
        content: <p className="text-sm font-normal text-gray-600 leading-[1.8]">I keep brief clinical notes as required by my accreditation bodies {IAHIP} and {ICP}. These are stored securely and are not shared with anyone without your consent.</p>,
      },
      {
        q: "What if I'm in crisis?",
        a: 'If you or someone you know is in immediate danger, or if there is any risk to life, please go straight to your nearest emergency department or call emergency services now. Crisis resources: Emergency Services 999 or 112, available 24/7. Samaritans 116 123. Text About It: text HELLO to 50808. Pieta: 1800 247 247 or text HELP to 51444. HSE YourMentalHealth: 1800 742 444. Childline (under 18s): 1800 66 66 66. If you are a current client and struggling between sessions, please reach out by email and I will respond as soon as I can.',
        content: crisisContent,
      },
    ],
  },
  {
    category: 'Specialist Areas: OCD, ADHD, Autism and More',
    items: [
      {
        q: 'Do you work with ADHD?',
        a: "Yes. I work with adults who are diagnosed with ADHD or exploring whether ADHD might be a factor in their difficulties. Therapy for ADHD isn't about fixing your brain. It's about understanding how it works and building strategies that actually fit you.",
      },
      {
        q: 'Do you work with OCD?',
        a: 'Yes. I work with all presentations of OCD including intrusive thoughts, checking, contamination fears, and pure O. I use Cognitive Behavioural Therapy (CBT), Exposure and Response Prevention (ERP), and Inference-Based Therapy (IBT) — all evidence-based approaches for OCD.',
      },
      {
        q: 'Do you work with autistic adults?',
        a: "Yes. I have experience working with autistic adults including those who are late-diagnosed or self-identifying. Therapy is adapted to suit how you communicate and process. There's no expectation to mask or perform neurotypicality here.",
      },
      {
        q: 'Do you work with LGBTQIA+ clients?',
        a: "Yes. This is an affirming, non-judgmental space. You don't need to explain or justify your identity. We can get straight to what's actually brought you to therapy. I also have experience working with chemsex-related concerns.",
      },
      {
        q: 'Do you diagnose autism or ADHD?',
        a: 'No. I do not carry out assessments or provide diagnoses for autism or ADHD. However I do work with clients around the symptoms and challenges associated with both, whether or not they have a formal diagnosis. If you are looking to get assessed, I am happy to signpost you toward appropriate assessment services in Ireland.',
      },
      {
        q: "I've never been diagnosed with anything. Can I still come to therapy?",
        a: "Absolutely. Most people who come to therapy don't have, and don't need, a diagnosis. You just need to feel that something could be better. That's enough.",
      },
    ],
  },
];

/* ── JSON-LD: FAQPage + Article + BreadcrumbList + WebPage speakable ── */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FAQPage',
      '@id': 'https://owenlynchtherapy.com/faq#faqpage',
      mainEntity: faqCategories.flatMap(cat =>
        cat.items.map(item => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        }))
      ),
    },
    {
      '@type': 'Article',
      '@id': 'https://owenlynchtherapy.com/faq#article',
      headline: 'FAQ | Psychotherapy Dublin and Online | Owen Lynch',
      description:
        'Answers to common questions about psychotherapy in Dublin and online therapy in Ireland. IAHIP accredited. OCD therapy, ADHD therapy, anxiety, confidential sessions.',
      datePublished: '2026-05-17',
      dateModified: '2026-05-17',
      author: {
        '@type': 'Person',
        '@id': 'https://owenlynchtherapy.com/#person',
        name: 'Owen Lynch',
      },
      publisher: { '@id': 'https://owenlynchtherapy.com/#business' },
    },
    {
      '@type': 'BreadcrumbList',
      '@id': 'https://owenlynchtherapy.com/faq#breadcrumb',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://owenlynchtherapy.com' },
        { '@type': 'ListItem', position: 2, name: 'FAQ',  item: 'https://owenlynchtherapy.com/faq' },
      ],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://owenlynchtherapy.com/faq',
      url: 'https://owenlynchtherapy.com/faq',
      name: 'FAQ | Psychotherapy Dublin and Online | Owen Lynch',
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', 'h2', 'h3'],
      },
    },
  ],
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
          <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">
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
        className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8"
        aria-label="Frequently asked questions"
      >
        <FloatingCircles />
        <div className="relative max-w-3xl mx-auto" style={{ zIndex: 1 }}>
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
          <p className="text-orange text-sm font-semibold uppercase tracking-normal mb-5">
            Get in touch
          </p>
          <h2
            id="faq-cta-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
          >
            Still have a question?
          </h2>
          <p className="font-normal text-sm text-cream/70 leading-[1.8] mb-10">
            Feel free to get in touch. I&apos;m happy to answer anything before you decide to book.
          </p>
          <span
            className="block w-12 h-px mx-auto mb-8"
            style={{ backgroundColor: '#d4a843' }}
            aria-hidden="true"
          />
          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-normal font-normal hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </>
  );
}
