import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeroCircles from '@/components/sections/PageHeroCircles';

// TODO: Wire to Sanity:
// import { sanityClient } from '@/lib/sanity/client';
// import { postBySlugQuery, allPostSlugsQuery } from '@/lib/sanity/queries';

type Props = {
  params: Promise<{ slug: string }>;
};

const BASE_URL = 'https://owenlynchtherapy.com';

// ── JSON-LD ──────────────────────────────────────────────────────────────────

const blogPostingJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How OCD Therapy Works: An Evidence-Based Guide',
  description:
    'An integrative look at I-CBT, ACT, ERP, and psychodynamic approaches to OCD treatment.',
  image: `${BASE_URL}/images/ocd-radio-analogy.png`,
  author: {
    '@type': 'Person',
    name: 'Owen Lynch',
    url: `${BASE_URL}/about`,
    jobTitle: 'Psychotherapist',
    description:
      'IAHIP-accredited psychotherapist based in Dublin, Ireland, specialising in OCD, anxiety, ADHD, autism, and LGBTQ+ mental health.',
    sameAs: [BASE_URL],
  },
  publisher: {
    '@type': 'Organization',
    name: 'Owen Lynch Psychotherapy',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/images/logo-stacked-transparent.svg`,
    },
  },
  datePublished: '2026-05-13',
  dateModified: '2026-05-13',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `${BASE_URL}/blog/how-ocd-therapy-works`,
  },
  wordCount: 3200,
  articleSection: 'OCD',
  keywords: [
    'OCD therapy',
    'OCD treatment Dublin',
    'I-CBT',
    'inference-based CBT',
    'ACT for OCD',
    'ERP',
    'OCD psychotherapy',
    'OCD Ireland',
    'obsessive compulsive disorder treatment',
  ],
  citation: [
    {
      '@type': 'ScholarlyArticle',
      name: 'The inference-based approach to OCD: A comprehensive review',
      author: ['Aardema, F.', 'O’Connor, K. P.', 'Delorme, M.-E.', 'Audet, J.-S.'],
      datePublished: '2022',
      isPartOf: {
        '@type': 'Periodical',
        name: 'Journal of Obsessive-Compulsive and Related Disorders',
      },
    },
    {
      '@type': 'ScholarlyArticle',
      name: 'A randomized clinical trial of acceptance and commitment therapy versus progressive relaxation training for obsessive-compulsive disorder',
      author: ['Twohig, M. P.', 'Hayes, S. C.'],
      datePublished: '2010',
      isPartOf: {
        '@type': 'Periodical',
        name: 'Journal of Consulting and Clinical Psychology',
      },
    },
  ],
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'How OCD Therapy Works: An Evidence-Based Guide',
    },
  ],
};

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  // TODO: replace with Sanity fetch: const slugs = await sanityClient.fetch(allPostSlugsQuery);
  return [{ slug: 'how-ocd-therapy-works' }];
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  if (slug !== 'how-ocd-therapy-works') {
    // TODO: fetch from Sanity for other slugs
    return {
      title: 'Post Not Found',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: 'How OCD Therapy Works: An Evidence-Based Guide | Owen Lynch Psychotherapy',
    description:
      'An integrative look at I-CBT, ACT, ERP, and psychodynamic approaches to OCD treatment. Written by Owen Lynch, psychotherapist in Dublin, Ireland.',
    alternates: { canonical: `${BASE_URL}/blog/how-ocd-therapy-works` },
    openGraph: {
      title: 'How OCD Therapy Works: An Evidence-Based Guide',
      description:
        'An integrative look at I-CBT, ACT, ERP, and psychodynamic approaches to OCD treatment. Written by Owen Lynch, psychotherapist in Dublin, Ireland.',
      type: 'article',
      url: `${BASE_URL}/blog/how-ocd-therapy-works`,
      images: [{ url: `${BASE_URL}/images/ocd-radio-analogy.png` }],
      publishedTime: '2026-05-13T00:00:00Z',
      authors: [`${BASE_URL}/about`],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'How OCD Therapy Works: An Evidence-Based Guide',
      description:
        'An integrative look at I-CBT, ACT, ERP, and psychodynamic approaches to OCD treatment.',
      images: [`${BASE_URL}/images/ocd-radio-analogy.png`],
    },
  };
}

// ── Shared prose classes ──────────────────────────────────────────────────────

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';
const inlineLink =
  'underline underline-offset-2 decoration-orange/60 hover:decoration-orange transition-colors';

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  // TODO: fetch post from Sanity; call notFound() if no result returned
  if (slug !== 'how-ocd-therapy-works') notFound();

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(blogPostingJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* ── Hero ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="relative overflow-hidden pt-[100px] pb-[60px] md:pt-[120px] md:pb-[80px] px-4 sm:px-6 lg:px-8"
        aria-labelledby="post-hero-heading"
      >
        <PageHeroCircles />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 list-none text-xs text-cream/60">
              <li>
                <Link href="/" className="hover:text-cream transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/blog" className="hover:text-cream transition-colors">
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-cream/80">How OCD Therapy Works</li>
            </ol>
          </nav>

          {/* Category */}
          <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">
            OCD
          </p>

          {/* Title */}
          <h1
            id="post-hero-heading"
            className="font-heading font-light text-3xl sm:text-4xl lg:text-[3rem] leading-tight text-cream mb-8"
          >
            How OCD Therapy Works: An Evidence-Based Guide
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cream/70">
            <span>
              By{' '}
              <Link href="/about" className="text-cream/90 hover:text-cream transition-colors underline underline-offset-2">
                Owen Lynch
              </Link>
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime="2026-05-13">13 May 2026</time>
            <span aria-hidden="true">·</span>
            <span>10 min read</span>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="py-14 px-4 sm:px-6 lg:px-8"
        aria-label="Article content"
      >
        <div className="max-w-4xl mx-auto">

          {/* Featured image */}
          <figure className="mb-14">
            <Image
              src="/images/ocd-radio-analogy.png"
              alt="Illustration of the radio analogy explaining how OCD tunes into meaningless thoughts and treats them as threats"
              width={1936}
              height={1360}
              className="w-full h-auto rounded-xl"
              priority
            />
          </figure>

          {/* Article body */}
          <article className="max-w-[720px] mx-auto">

            {/* Intro */}
            <p className={p}>
              {`Obsessive-Compulsive Disorder is one of the most misunderstood conditions in mental health. It is frequently reduced to a punchline about tidiness or hand-washing, but the clinical reality is far more complex, and far more distressing, than popular culture suggests.`}
            </p>

            <p className={p}>
              <Link href="/ocd-therapy-dublin" className={inlineLink}>OCD</Link>
              {` affects roughly 2–3% of the population over a lifetime (Ruscio et al., 2010). It involves intrusive, unwanted thoughts (obsessions) that generate intense anxiety, followed by repetitive behaviours or mental acts (compulsions) aimed at neutralising that anxiety. The content of obsessions can be deeply disturbing to the person experiencing them. Thoughts about harm, contamination, sexuality, religion, relationships, or identity can feel utterly at odds with who they know themselves to be.`}
            </p>

            <p className={p}>
              {`This is a critical point that often gets lost: OCD latches onto what matters most to you. A loving parent may be tormented by intrusive thoughts of harming their child. A deeply moral person may be plagued by thoughts they find repulsive. The distress these thoughts cause is itself evidence of how seriously the person holds their values, not evidence of hidden intent.`}
            </p>

            <p className={p}>
              {`If you are living with OCD, or suspect you might be, this post outlines what current research tells us about how OCD works and what effective treatment looks like.`}
            </p>

            {/* H2: How OCD Maintains Itself */}
            <h2 className={h2}>How OCD Maintains Itself</h2>

            <p className={p}>
              {`To understand treatment, it helps to understand the mechanism that keeps OCD going. OCD is sometimes described as a “doubt disorder.” Not because the person is generally indecisive, but because the condition generates a specific, compelling sense of doubt that overrides ordinary reasoning.`}
            </p>

            <p className={p}>
              {`Most people experience intrusive thoughts. Research by Rachman and de Silva (1978) demonstrated decades ago that the content of intrusive thoughts in people with OCD and people without OCD is largely the same. The difference is not in what thought shows up, but in what happens next. In OCD, the thought gets flagged as meaningful, dangerous, or revealing of character. This interpretation triggers anxiety, which triggers compulsions, which provide temporary relief but ultimately reinforce the cycle.`}
            </p>

            <p className={p}>
              {`This is the basic cognitive-behavioural model, and it has strong empirical support (Salkovskis, 1985). But more recent research has added important nuance to our understanding of how that doubt arises in the first place.`}
            </p>

            {/* H2: Inference-Based CBT */}
            <h2 className={h2}>
              Inference-Based CBT: Understanding Where the Doubt Comes From
            </h2>

            <p className={p}>
              {`Inference-Based CBT (I-CBT) is a newer approach developed by Frederick Aardema and Kieron O’Connor at the University of Montreal. It has a growing evidence base, including randomised controlled trials showing comparable outcomes to more established treatments (O’Connor et al., 2005; Aardema et al., 2022).`}
            </p>

            <p className={p}>
              {`I-CBT offers a different angle on OCD. Rather than focusing primarily on how you respond to an intrusive thought once it has arrived, I-CBT asks a more upstream question: why did you take this thought seriously in the first place?`}
            </p>

            <p className={p}>
              {`The model proposes that OCD involves what the researchers call “inferential confusion.” This is a process where the person comes to distrust their own direct experience (what they can see, hear, feel, and know) and instead gives authority to an imagined possibility. In other words, OCD convinces you that the story in your head is more trustworthy than the evidence of your own senses.`}
            </p>

            {/* H2: The Inner Wheel and the Outer Wheel */}
            <h2 className={h2}>The Inner Wheel and the Outer Wheel</h2>

            <p className={p}>
              {`I-CBT uses a model of two “wheels” to explain this process, and it is worth spending a moment on because it makes the mechanism very concrete.`}
            </p>

            <p className={p}>
              {`The Outer Wheel represents the observable OCD cycle that most people are familiar with: an intrusive thought appears, it triggers doubt, the doubt creates anxiety, and the person performs a compulsion to manage the anxiety. This is the visible pattern, the part you can see from the outside.`}
            </p>

            <p className={p}>
              {`The Inner Wheel is what drives that cycle from underneath. It represents the reasoning process that makes the obsessional doubt feel believable in the first place. This includes things like:`}
            </p>

            <ul className="list-disc list-outside pl-6 space-y-3 mb-6 text-base text-gray-700 leading-[1.75]">
              <li>
                {`Absorbing stories, news, or information and applying it selectively to yourself (“I read about someone who did something terrible. What if that’s me?”)`}
              </li>
              <li>
                {`Distrusting your own direct senses (“The door looks locked, but what if I didn’t check properly?”)`}
              </li>
              <li>
                {`Using purely imagined scenarios as though they are evidence (“I can imagine doing something harmful, so maybe I’m capable of it”)`}
              </li>
              <li>
                {`Confusing the ability to think something with the likelihood of doing it`}
              </li>
            </ul>

            <p className={p}>
              {`The Inner Wheel is where OCD does its most persuasive work. It builds what I-CBT calls a “narrative,” a story that feels compelling but is not actually grounded in anything the person has directly observed or experienced. The doubt feels real, but it is based entirely on imagination and possibility, not on evidence from the person’s actual life.`}
            </p>

            {/* Image: inner/outer wheel */}
            <figure className="my-10">
              <Image
                src="/images/ocd-inner-outer-wheel.png"
                alt="Diagram of the I-CBT inner wheel and outer wheel model showing how OCD maintains itself"
                width={1468}
                height={824}
                className="w-full h-auto rounded-xl"
                loading="lazy"
              />
              <figcaption className="mt-3 text-sm text-gray-500 text-center italic">
                The I-CBT model: the inner wheel drives obsessional doubt, the outer wheel maintains
                the cycle through compulsions and avoidance.
              </figcaption>
            </figure>

            {/* H2: The Radio Analogy */}
            <h2 className={h2}>The Radio Analogy</h2>

            <p className={p}>
              {`One way to understand this is to think of OCD as a radio station. Everyone has a radio in their head, and occasionally it picks up static. Random, unwanted signals. For most people, the static is briefly annoying but they recognise it as noise and move on.`}
            </p>

            <p className={p}>
              {`In OCD, something different happens. You tune into the static, and instead of recognising it as meaningless interference, you start listening carefully. You begin to hear patterns in the noise. You turn up the volume. You start to believe there is an important message hidden in the static that you need to decode.`}
            </p>

            <p className={p}>
              {`I-CBT does not ask you to fight the static or force yourself to sit with it. Instead, it helps you understand why you tuned in and started listening in the first place, and what reasoning process made the noise seem meaningful. Over time, you learn to recognise the static for what it is: noise. Not a message. Not a warning. Not a reflection of who you are.`}
            </p>

            <p className={p}>
              {`This is a fundamentally different move from trying to manage or tolerate the anxiety once it has already taken hold. It addresses the mechanism that generates the doubt, not just the distress that follows from it.`}
            </p>

            {/* Image: radio analogy */}
            <figure className="my-10">
              <Image
                src="/images/ocd-radio-analogy.png"
                alt="Illustration of the radio analogy explaining how OCD tunes into meaningless thoughts and treats them as threats"
                width={1936}
                height={1360}
                className="w-full h-auto rounded-xl"
                loading="lazy"
              />
              <figcaption className="mt-3 text-sm text-gray-500 text-center italic">
                Everyone gets intrusive thoughts. OCD tunes in and turns up the volume.
              </figcaption>
            </figure>

            {/* H2: Acceptance and Commitment Therapy */}
            <h2 className={h2}>
              Acceptance and Commitment Therapy: Changing Your Relationship With Thoughts
            </h2>

            <p className={p}>
              {`Acceptance and Commitment Therapy (ACT) approaches OCD from a different but complementary direction. Developed by Steven Hayes, ACT has a substantial evidence base for anxiety-related presentations and a growing body of research specific to OCD (Twohig et al., 2010; Bluett et al., 2014).`}
            </p>

            <p className={p}>
              {`ACT does not focus on whether the content of a thought is true or false. Instead, it focuses on how you relate to your thoughts and whether that relationship is helping or hindering you in living the life you actually want.`}
            </p>

            <p className={p}>
              {`A central concept in ACT is “cognitive fusion,” the tendency to become entangled with our thoughts, treating them as literal truths rather than as mental events. When you are fused with a thought, there is no space between you and the thought. You are the thought.`}
            </p>

            <p className={p}>
              {`ACT works to create that space through a process called “defusion.” This might involve noticing a thought and naming it (“I’m having the thought that…”), observing the thought as though watching it pass like a cloud, or recognising that a thought can be present without requiring action.`}
            </p>

            <p className={p}>
              {`Crucially, ACT also asks: what actually matters to you? What kind of life do you want to build? OCD narrows a person’s world. It consumes time, energy, and attention that could otherwise go toward relationships, work, creativity, or rest. ACT helps people reconnect with their values and take steps toward what matters, even in the presence of uncomfortable thoughts and feelings.`}
            </p>

            <p className={p}>
              {`The research suggests that ACT may be particularly helpful for people who struggle with the experiential avoidance that OCD often produces, meaning the increasing tendency to avoid situations, people, or activities that might trigger obsessional thoughts (Twohig et al., 2015).`}
            </p>

            {/* H2: Psychodynamic Perspectives */}
            <h2 className={h2}>
              Psychodynamic Perspectives: Understanding the Person Behind the Symptom
            </h2>

            <p className={p}>
              {`While cognitive and behavioural models focus on mechanisms and cycles, psychodynamic thinking adds another dimension: it asks what function the symptom might be serving in the broader landscape of a person’s emotional life.`}
            </p>

            <p className={p}>
              {`This is not about claiming that OCD is “caused” by unconscious conflict in some simplistic Freudian sense. Modern psychodynamic approaches to OCD are more nuanced than that. Nancy McWilliams (2011), for example, emphasises the importance of understanding the person’s character structure and developmental history alongside their presenting symptoms. The question is not just “what is the OCD doing?” but “what is this person’s relationship to control, uncertainty, and vulnerability more broadly?”`}
            </p>

            <p className={p}>
              {`For some people, OCD emerges or intensifies during periods of significant life transition, loss, or relational stress. For others, there is a long developmental history of trying to manage an environment that felt unpredictable or unsafe. Winnicott’s concept of the “holding environment” is relevant here: the degree to which a person’s early relational world provided a sense of safety that allowed them to tolerate uncertainty and ambiguity (Winnicott, 1965).`}
            </p>

            <p className={p}>
              {`None of this replaces the need for targeted OCD intervention. But it can enrich the work significantly. Understanding why a person’s nervous system is so primed toward threat, why uncertainty feels so intolerable, why the need for certainty is so urgent, provides a depth of understanding that purely technique-driven approaches sometimes miss.`}
            </p>

            <p className={p}>
              {`In practice, this means that alongside specific OCD-focused work, there is often value in exploring the person’s broader emotional world: their attachment history, their relationship patterns, the ways they have learned to cope with anxiety and vulnerability over the course of their life.`}
            </p>

            {/* H2: A Note on ERP */}
            <h2 className={h2}>A Note on Exposure and Response Prevention</h2>

            <p className={p}>
              {`Exposure and Response Prevention (ERP) remains one of the most extensively researched treatments for OCD, with a large evidence base stretching back decades (Foa & Kozak, 1986; Öst et al., 2015). It works by gradually exposing the person to the situations or thoughts that trigger their obsessions, while supporting them to resist performing compulsions.`}
            </p>

            <p className={p}>
              {`It is worth being honest about ERP: for many people, the early stages can be intensely uncomfortable. The treatment asks you to move toward the very thing your OCD is telling you to avoid, and that requires significant courage. Some people find this approach highly effective from the outset. Others find it difficult to engage with, particularly if the therapeutic relationship does not feel safe enough yet, or if the rationale has not been clearly explained and genuinely understood.`}
            </p>

            <p className={p}>
              {`This is not a reason to dismiss ERP. The evidence for its efficacy is strong. But it is a reason to think carefully about how and when it is introduced, and to recognise that it is one tool among several, not the only legitimate approach to OCD treatment.`}
            </p>

            {/* H2: How We Would Work Together */}
            <h2 className={h2}>How We Would Work Together</h2>

            <p className={p}>
              {`I work with clients in Dublin and online across Ireland and the UK, so wherever you’re based, getting started doesn’t have to mean travelling. If you were to come to therapy for OCD, here is what you could expect.`}
            </p>

            <p className={p}>
              {`We would not begin with techniques. We would begin by building a relationship in which you feel genuinely safe. Safe enough to talk about thoughts that may feel shameful, frightening, or difficult to say out loud. This matters because the content of OCD is often deeply personal and distressing, and many people have spent years hiding it. The research is clear that the therapeutic relationship is one of the strongest predictors of outcome across all modalities (Norcross & Wampold, 2011). It is not a preamble to the “real” work. It is the foundation of the work.`}
            </p>

            <p className={p}>
              {`From there, we would develop a shared understanding of what is happening: how your OCD operates, what maintains it, and what your experience of it has been. This is a collaborative process. You are the expert on your own life; I bring expertise in how OCD functions and what the research says about changing it.`}
            </p>

            <p className={p}>
              {`Treatment would draw on the approaches described above, tailored to what fits for you. That might involve exploring the reasoning process that makes your doubts feel so compelling (I-CBT), learning to change your relationship with intrusive thoughts rather than fighting them (ACT), understanding the deeper emotional patterns that make uncertainty feel so threatening (psychodynamic exploration), or gradually facing feared situations at a pace that feels manageable (ERP).`}
            </p>

            <p className={p}>
              {`Critically, therapy would never force you to do anything you do not want to do. This is not a boot camp. You set the pace. If something feels too much, we slow down. If an approach does not fit, we adjust. The goal is not to white-knuckle your way through distress. It is to develop a fundamentally different relationship with your own mind, one that gives you back the freedom that OCD has taken.`}
            </p>

            {/* H2: A Final Word */}
            <h2 className={h2}>A Final Word</h2>

            <p className={p}>
              {`OCD is a condition that thrives on silence and shame. The more isolated a person feels with their thoughts, the more power those thoughts accumulate. One of the most important things you can do, whether or not you pursue therapy right now, is to understand that intrusive thoughts are not a reflection of your character. They are a feature of a well-documented neuropsychological condition that responds to treatment.`}
            </p>

            <p className={p}>
              {`You are not your OCD. You are the person it is happening to.`}
            </p>

            {/* ── References ── */}
            <details className="mt-16 border-t border-gray-200 pt-8 group">
              <summary className="font-heading font-light text-xl text-forest cursor-pointer select-none hover:text-orange transition-colors list-none flex items-center gap-2">
                <span>References</span>
                <svg
                  className="w-4 h-4 text-orange transition-transform group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>

              <div className="mt-6 space-y-5">
                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Aardema, F., O’Connor, K. P., Delorme, M.-E., & Audet, J.-S. (2022). The inference-based approach to OCD: A comprehensive review of its etiological model, treatment efficacy, and model of change. `}
                  <em>Journal of Obsessive-Compulsive and Related Disorders</em>
                  {`, 32, 100703.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Bluett, E. J., Homan, K. J., Morrison, K. L., Levin, M. E., & Twohig, M. P. (2014). Acceptance and commitment therapy for anxiety and OCD spectrum disorders: An empirical review. `}
                  <em>Journal of Anxiety Disorders</em>
                  {`, 28(6), 612–624.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Foa, E. B., & Kozak, M. J. (1986). Emotional processing of fear: Exposure to corrective information. `}
                  <em>Psychological Bulletin</em>
                  {`, 99(1), 20–35.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`McWilliams, N. (2011). `}
                  <em>Psychoanalytic Diagnosis: Understanding Personality Structure in the Clinical Process</em>
                  {` (2nd ed.). Guilford Press.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Norcross, J. C., & Wampold, B. E. (2011). Evidence-based therapy relationships: Research conclusions and clinical practices. `}
                  <em>Psychotherapy</em>
                  {`, 48(1), 98–102.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`O’Connor, K. P., Aardema, F., Bouthillier, D., Fournier, S., Guay, S., Robillard, S., … & Bhardwaj, A. (2005). Evaluation of an inference-based approach to treating obsessive-compulsive disorder. `}
                  <em>Cognitive Behaviour Therapy</em>
                  {`, 34(3), 148–163.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Öst, L.-G., Havnen, A., Hansen, B., & Kvale, G. (2015). Cognitive behavioral treatments of obsessive–compulsive disorder: A systematic review and meta-analysis of studies published 1993–2014. `}
                  <em>Clinical Psychology Review</em>
                  {`, 40, 156–169.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Rachman, S., & de Silva, P. (1978). Abnormal and normal obsessions. `}
                  <em>Behaviour Research and Therapy</em>
                  {`, 16(4), 233–248.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Ruscio, A. M., Stein, D. J., Chiu, W. T., & Kessler, R. C. (2010). The epidemiology of obsessive-compulsive disorder in the National Comorbidity Survey Replication. `}
                  <em>Molecular Psychiatry</em>
                  {`, 15(1), 53–63.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Salkovskis, P. M. (1985). Obsessional-compulsive problems: A cognitive-behavioural analysis. `}
                  <em>Behaviour Research and Therapy</em>
                  {`, 23(5), 571–583.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Twohig, M. P., Hayes, S. C., Plumb, J. C., Pruitt, L. D., Collins, A. B., Hazlett-Stevens, H., & Woidneck, M. R. (2010). A randomized clinical trial of acceptance and commitment therapy versus progressive relaxation training for obsessive-compulsive disorder. `}
                  <em>Journal of Consulting and Clinical Psychology</em>
                  {`, 78(5), 705–716.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Twohig, M. P., Abramowitz, J. S., Smith, B. M., Fabricant, L. E., Jacoby, R. J., Morrison, K. L., … & Ledermann, T. (2015). Adding acceptance and commitment therapy to exposure and response prevention for obsessive-compulsive disorder: A randomized controlled trial. `}
                  <em>Behaviour Research and Therapy</em>
                  {`, 74, 58–67.`}
                </p>

                <p className="text-sm text-gray-600 leading-[1.75]">
                  {`Winnicott, D. W. (1965). `}
                  <em>The Maturational Processes and the Facilitating Environment</em>
                  {`. Hogarth Press.`}
                </p>
              </div>
            </details>

          </article>
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{ backgroundColor: '#2A4D3C' }}
        className="py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="post-cta-heading"
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2
            id="post-cta-heading"
            className="font-heading font-light text-3xl sm:text-4xl text-cream mb-6"
          >
            Could therapy help?
          </h2>
          <p className="font-normal text-sm text-cream/75 leading-[1.8] mb-10">
            {`If you’re in Ireland or the UK and think therapy might help with OCD, I offer OCD-informed therapy in Dublin and online. There’s no pressure and no obligation — the first step is simply a conversation.`}
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
