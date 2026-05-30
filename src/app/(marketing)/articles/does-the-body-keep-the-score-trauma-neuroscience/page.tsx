import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import PageHeroCircles from '@/components/sections/PageHeroCircles';
import FloatingCircles from '@/components/ui/floating-circles';

const BASE_URL = 'https://owenlynchtherapy.com';

// ── Metadata ──────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:
    'Does the Body Keep the Score? PTSD, CPTSD and Trauma Neuroscience Explained | Owen Lynch Psychotherapy',
  description:
    'New peer-reviewed research challenges whether trauma is stored in the body. A clear breakdown of PTSD vs CPTSD, what predictive coding explains, and why polyvagal theory is contested.',
  authors: [{ name: 'Owen Lynch', url: `${BASE_URL}/about` }],
  creator: 'Owen Lynch',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: `${BASE_URL}/articles/does-the-body-keep-the-score-trauma-neuroscience`,
    languages: {
      'en': `${BASE_URL}/articles/does-the-body-keep-the-score-trauma-neuroscience`,
      'x-default': `${BASE_URL}/articles/does-the-body-keep-the-score-trauma-neuroscience`,
    },
  },
  openGraph: {
    type: 'article',
    url: `${BASE_URL}/articles/does-the-body-keep-the-score-trauma-neuroscience`,
    title: 'Does the Body Keep the Score? PTSD, CPTSD and Trauma Neuroscience Explained',
    description:
      'New peer-reviewed research challenges whether trauma is stored in the body. A clear breakdown of PTSD vs CPTSD, what predictive coding explains, and why polyvagal theory is contested.',
    siteName: 'Owen Lynch Psychotherapy',
    locale: 'en_IE',
    images: [
      {
        url: `${BASE_URL}/images/blog-hero-trauma-neuroscience.png`,
        width: 3200,
        height: 1800,
        alt: 'Abstract illustration representing trauma neuroscience — the brain as a prediction machine',
      },
    ],
    publishedTime: '2026-06-01T00:00:00Z',
    authors: [`${BASE_URL}/about`],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Does the Body Keep the Score? PTSD, CPTSD and Trauma Neuroscience Explained',
    description:
      'New peer-reviewed research challenges whether trauma is stored in the body. What the science actually shows.',
    images: [`${BASE_URL}/images/blog-hero-trauma-neuroscience.png`],
  },
};

// ── JSON-LD ──────────────────────────────────────────────────────────────────

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': ['BlogPosting', 'MedicalWebPage'],
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `${BASE_URL}/articles/does-the-body-keep-the-score-trauma-neuroscience`,
  },
  headline: 'Does the Body Keep the Score? PTSD, CPTSD and Trauma Neuroscience Explained',
  description:
    'New peer-reviewed research challenges whether trauma is stored in the body. A clear breakdown of PTSD vs CPTSD, what predictive coding explains, and why polyvagal theory is contested.',
  image: {
    '@type': 'ImageObject',
    url: `${BASE_URL}/images/blog-hero-trauma-neuroscience.png`,
    width: 3200,
    height: 1800,
  },
  datePublished: '2026-06-01',
  dateModified: '2026-06-01',
  lastReviewed: '2026-06-01',
  author: {
    '@type': 'Person',
    name: 'Owen Lynch',
    url: `${BASE_URL}/about`,
    sameAs: [
      'https://psychotherapistdirectory.iahip.org/therapist/owen-lynch',
      'https://psychotherapycouncil.ie/therapist/owen-lynch/',
      'https://www.psychologytoday.com/ie/counselling/owen-lynch-dublin-dn/1745757',
      'https://www.instagram.com/owenlynchtherapy',
    ],
    jobTitle: 'Accredited Psychotherapist',
    description:
      'IAHIP and ICP accredited psychotherapist in Dublin with a BSc in Biological and Biomedical Sciences specialising in Molecular Immunology.',
    hasCredential: [
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'degree',
        name: 'BSc Biological and Biomedical Sciences (Molecular Immunology)',
      },
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'certification',
        name: 'Accredited Psychotherapist',
        recognizedBy: {
          '@type': 'Organization',
          name: 'Irish Association for Humanistic and Integrative Psychotherapy',
          url: 'https://iahip.org',
        },
      },
      {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'certification',
        name: 'Accredited Psychotherapist',
        recognizedBy: {
          '@type': 'Organization',
          name: 'Irish Council for Psychotherapy',
          url: 'https://psychotherapycouncil.ie',
        },
      },
    ],
    memberOf: [
      {
        '@type': 'Organization',
        name: 'Irish Association for Humanistic and Integrative Psychotherapy (IAHIP)',
        url: 'https://iahip.org',
      },
      {
        '@type': 'Organization',
        name: 'Irish Council for Psychotherapy (ICP)',
        url: 'https://psychotherapycouncil.ie',
      },
    ],
    knowsAbout: [
      'Trauma Therapy',
      'Post-Traumatic Stress Disorder',
      'Complex PTSD',
      'Trauma Neuroscience',
      'Psychotherapy',
      'Molecular Immunology',
      'Anxiety',
      'OCD',
      'ADHD',
    ],
  },
  reviewedBy: {
    '@type': 'Person',
    name: 'Owen Lynch',
    jobTitle: 'IAHIP and ICP Accredited Psychotherapist',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Owen Lynch Psychotherapy',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/og-image.jpg`,
    },
  },
  medicalAudience: [
    { '@type': 'MedicalAudience', audienceType: 'Clinician', suggestedMinAge: 18 },
    { '@type': 'MedicalAudience', audienceType: 'Patient', suggestedMinAge: 18 },
  ],
  keywords: [
    'trauma neuroscience',
    'PTSD vs CPTSD',
    'does the body keep the score',
    'polyvagal theory',
    'predictive coding PTSD',
    'psychedelics PTSD treatment',
    'EMDR neuroscience',
    'trauma therapy Dublin',
    'CPTSD ICD-11',
    'complex PTSD',
  ],
  articleSection: 'Trauma and Psychotherapy',
  wordCount: '3600',
  timeRequired: 'PT15M',
  inLanguage: 'en-IE',
  isAccessibleForFree: true,
  about: [
    {
      '@type': 'MedicalCondition',
      name: 'Post-Traumatic Stress Disorder',
      alternateName: 'PTSD',
      code: { '@type': 'MedicalCode', code: '6B40', codingSystem: 'ICD-11' },
    },
    {
      '@type': 'MedicalCondition',
      name: 'Complex Post-Traumatic Stress Disorder',
      alternateName: 'CPTSD',
      code: { '@type': 'MedicalCode', code: '6B41', codingSystem: 'ICD-11' },
    },
  ],
  isBasedOn: {
    '@type': 'ScholarlyArticle',
    name: 'The body does not keep the score: trauma, predictive coding, and the restoration of metastability',
    author: [
      { '@type': 'Person', name: 'Steven Kotler' },
      { '@type': 'Person', name: 'Michael Mannino' },
      { '@type': 'Person', name: 'Glenn Fox' },
      { '@type': 'Person', name: 'Karl Friston' },
    ],
    datePublished: '2026',
    url: 'https://doi.org/10.3389/fnsys.2026.1812957',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the difference between PTSD and CPTSD?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'PTSD typically follows a specific traumatic event and involves re-experiencing, avoidance, mood changes, and hyperarousal. CPTSD develops after prolonged or repeated trauma and includes all PTSD symptoms plus three additional clusters: difficulties regulating emotions, a persistently damaged sense of self, and pervasive problems in relationships. CPTSD is formally recognised in ICD-11 but does not exist as a standalone diagnosis in DSM-5.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does the body really keep the score?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A 2026 peer-reviewed paper by Kotler, Mannino, Fox and Friston in Frontiers in Systems Neuroscience argues that trauma is not stored in body tissue but reflects a failure of predictive processing in the brain. The body is profoundly affected through stress hormones and inflammation, but the mechanism is top-down from the brain, not bottom-up storage of memory in muscle or connective tissue.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the scientific criticism of polyvagal theory?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "In 2026, 39 researchers published a formal critique in Clinical Neuropsychiatry arguing that polyvagal theory's core anatomical claims are not supported by evidence. Specifically, the dorsal motor nucleus of the vagus primarily controls gut function rather than cardiac freeze responses as the theory proposes. The debate is ongoing and unresolved.",
      },
    },
    {
      '@type': 'Question',
      name: 'Can psychedelics treat PTSD?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MDMA-assisted therapy showed significant results in clinical trials, with 54% of participants no longer meeting PTSD criteria after treatment. The FDA declined to approve it in 2024 due to methodological concerns. Australia has approved both MDMA for PTSD and psilocybin for depression under clinical supervision. These require specialist oversight and are not self-directed treatments.',
      },
    },
  ],
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'Articles', item: `${BASE_URL}/articles` },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Does the Body Keep the Score? PTSD, CPTSD and Trauma Neuroscience Explained',
      item: `${BASE_URL}/articles/does-the-body-keep-the-score-trauma-neuroscience`,
    },
  ],
};

// ── Shared prose classes ──────────────────────────────────────────────────────

const p = 'font-normal text-base text-gray-700 leading-[1.75] mb-6';
const h2 =
  'font-heading font-light text-2xl sm:text-[1.75rem] text-forest mt-14 mb-5 leading-snug';
const inlineLink =
  'underline underline-offset-2 decoration-orange/60 h-hover:decoration-orange h-can:transition-colors';
const ref = 'text-sm text-gray-600 leading-[1.75]';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TraumaNeuroscienceArticle() {
  return (
    <>
      {/* JSON-LD — BlogPosting/MedicalWebPage, FAQPage, BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\\u003c') }}
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
                <Link href="/" className="h-hover:text-cream h-can:transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/articles" className="h-hover:text-cream h-can:transition-colors">
                  Articles
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-cream/80">Does the Body Keep the Score?</li>
            </ol>
          </nav>

          {/* Category */}
          <p className="text-white text-sm font-semibold uppercase tracking-normal mb-5">
            Trauma
          </p>

          {/* Title */}
          <h1
            id="post-hero-heading"
            className="font-heading font-light text-3xl sm:text-4xl lg:text-[3rem] leading-tight text-cream mb-8"
          >
            Does The Body Really Keep The Score? What the Latest Neuroscience Actually Says About Trauma
          </h1>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-cream/70">
            <span>
              By{' '}
              <Link href="/about" className="text-cream/90 h-hover:text-cream h-can:transition-colors underline underline-offset-2">
                Owen Lynch
              </Link>
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime="2026-06-01">1 June 2026</time>
            <span aria-hidden="true">·</span>
            <span>15 min read</span>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <section
        style={{ backgroundColor: '#F5F0E8' }}
        className="relative overflow-hidden py-14 px-4 sm:px-6 lg:px-8"
        aria-label="Article content"
      >
        <FloatingCircles />
        <div className="relative max-w-4xl mx-auto" style={{ zIndex: 1 }}>

          {/* Featured image */}
          {/* TODO: replace with blog-hero-trauma-neuroscience.png */}
          <figure className="mb-14">
            <Image
              src="/images/blog-hero-ocd-therapy.png"
              alt="Abstract illustration representing trauma neuroscience — the brain as a prediction machine"
              width={3200}
              height={1800}
              className="w-full h-auto rounded-xl"
              priority
            />
          </figure>

          {/* Article body */}
          <article className="max-w-[720px] mx-auto">

            {/* H2: First, a Word on the Language We Use */}
            <h2 className={h2}>First, a Word on the Language We Use</h2>

            <p className={p}>
              {`Trauma. PTSD. CPTSD. These terms circulate as though they're interchangeable. They're not, and the difference matters clinically.`}
            </p>

            <p className={p}>
              {`PTSD typically follows a specific traumatic event. The danger has passed; the nervous system hasn't registered that yet. CPTSD develops after prolonged or repeated trauma, usually interpersonal and inescapable, and involves everything in PTSD plus three additional areas of lasting difficulty: emotional dysregulation, a persistently damaged sense of self, and pervasive problems in relationships (Hyland et al., 2021). CPTSD is formally recognised in ICD-11 but does not exist as a standalone diagnosis in DSM-5, which has real implications for how people get assessed and treated. A fuller breakdown of these distinctions, including Acute Stress Disorder and sub-threshold presentations, is covered in a separate article.`}
            </p>

            {/* H2: The Claim That Shaped a Decade */}
            <h2 className={h2}>The Claim That Shaped a Decade</h2>

            <p className={p}>
              {`Bessel van der Kolk's 2014 book brought the phrase "the body keeps the score" into the mainstream therapy world. The argument: trauma isn't only processed by the mind but physically stored in the body: in the muscles, the connective tissue, the nervous system. The framing is compelling. Many trauma survivors describe exactly this: a jaw that won't unclench, a stomach that tightens in certain situations, a body that reacts before the conscious mind has registered anything. Somatic therapies built on this idea have proliferated enormously, along with the CPD economy surrounding them.`}
            </p>

            <p className={p}>
              {`A peer-reviewed paper published this year has now challenged the biological claim directly.`}
            </p>

            {/* H2: What Trauma Actually Does to the Brain */}
            <h2 className={h2}>What Trauma Actually Does to the Brain</h2>

            <p className={p}>
              {`Kotler, Mannino, Fox, and Friston (2026) published `}
              <em>The Body Does Not Keep the Score: Trauma, Predictive Coding, and the Restoration of Metastability</em>
              {` in `}
              <em>Frontiers in Systems Neuroscience</em>
              {`, a peer-reviewed journal. The paper argues that PTSD and trauma responses are better understood as a failure in how the brain makes predictions, not as a storage process in body tissue.`}
            </p>

            <p className={p}>
              {`The framework is called `}
              <em>predictive coding</em>
              {`, developed formally through the work of Karl Friston, one of the paper's co-authors and one of the most cited neuroscientists alive. The core idea: the brain is not a passive recorder of what happens to us. It's an active prediction machine. At every moment, it's generating a model of the world and comparing incoming information against that model. When reality doesn't match the prediction, the brain updates. That updating process is how we learn, adapt, and function.`}
            </p>

            <p className={p}>
              {`Think of it like a constantly revised weather forecast. New data comes in, temperature, pressure, cloud cover, and the model adjusts. A healthy system is flexible. It revises when the evidence changes.`}
            </p>

            <p className={p}>
              {`In trauma, this system becomes miscalibrated. The brain assigns overwhelming confidence to one prediction: danger. Everything that comes in gets filtered through that lens. The prediction gets reinforced rather than revised. Hypervigilance, flashbacks, and avoidance aren't random symptoms. They are the logical output of a prediction system that has locked threat as its standing assumption and won't let go of it.`}
            </p>

            <p className={p}>
              {`This pattern isn't unique to trauma. `}
              <Link href="/articles/how-ocd-therapy-works" className={inlineLink}>OCD</Link>
              {` involves a structurally identical problem: excessive certainty about threat, combined with an inability to release that prediction regardless of what the evidence shows. The predictive coding framework predicts exactly this kind of overlap, and the neuroscience supports it (Chamberlain et al., 2008). What this tells us is that trauma isn't breaking some trauma-specific system. It's disrupting something more fundamental, the brain's general capacity for flexible prediction, and that capacity can fail under sustained pressure in different ways in different people.`}
            </p>

            <p className={p}>
              {`What trauma erodes is `}
              <em>metastability</em>
              {`: the brain's ability to shift fluidly between different mental and neural states depending on context. A healthy brain moves easily: focused then relaxed, alert then calm, social then solitary. That flexibility depends on different brain networks assembling and disassembling quickly in response to what the situation calls for. In PTSD, this flexibility collapses. Research published in the `}
              <em>Journal of Neuroscience</em>
              {` by Hellyer et al. (2015) showed that reduced metastability (the brain getting stuck in narrow, rigid states) directly impairs cognitive flexibility and information processing. Trauma does something functionally identical, not by physically damaging the brain, but by locking it into threat-weighted patterns it cannot exit.`}
            </p>

            <p className={p}>
              {`The brain's structural changes in PTSD confirm this picture. Multiple large studies consistently show reduced volume in the hippocampus, the brain's key structure for contextual memory, for placing experiences in time and space, and for updating predictions about the world, in people with PTSD compared to both trauma-exposed and non-exposed controls (Ben-Zion et al., 2024). This shrinkage is concentrated in specific subregions: CA1, CA3, the dentate gyrus, and the subiculum. These are precisely the parts involved in determining whether a threat is past or present. Part of this is driven by chronic stress hormones suppressing a key brain growth protein called BDNF, which reduces the hippocampus's ability to generate new cells. Separately, the amygdala, the brain's threat-detection centre, shows consistently elevated activity in response to danger signals, particularly on the left side. And the ventromedial prefrontal cortex, the region responsible for putting the brakes on the fear response and recalling that a previous threat no longer exists, is consistently underactive (Del Casale et al., 2022; Kredlow et al., 2022).`}
            </p>

            <p className={p}>
              {`This loss of cognitive flexibility shows up clinically in something most therapists will recognise immediately: reduced mentalisation. Peter Fonagy's work on mentalisation describes the capacity to understand one's own and others' mental states: to hold multiple perspectives simultaneously, to wonder what someone else might be feeling, to reflect on why you yourself responded in a particular way. It requires mental flexibility. It requires the brain to be able to shift between perspectives rather than staying locked in one. Research consistently shows that mentalisation is impaired in people with trauma responses (Fonagy & Bateman, 2016). That isn't a coincidence. It's the same mechanism: when the brain is consumed by threat prediction, the nuanced, context-sensitive work of understanding minds becomes harder. The system trauma makes rigid is the same system mentalisation depends on.`}
            </p>

            <p className={p}>
              {`None of this happens in the fascia or the muscles. It happens in the brain.`}
            </p>

            <p className={p}>
              {`The body is not irrelevant, though. The brain doesn't operate in isolation.`}
            </p>

            {/* H2: The Body as Messenger, Not Archive */}
            <h2 className={h2}>The Body as Messenger, Not Archive</h2>

            <p className={p}>
              {`This is where the picture gets more interesting. Dismissing the body entirely would also be getting it wrong.`}
            </p>

            <p className={p}>
              {`Trauma does leave measurable biological traces in the body. Research consistently shows that people with PTSD have elevated levels of inflammatory proteins circulating in the blood, including IL-1β, IL-6, TNF-α, and C-reactive protein, all markers of a chronically activated immune system (Müller et al., 2023). To understand why, you need to understand the stress response pathway.`}
            </p>

            <p className={p}>
              {`When the brain detects a threat, it activates the hypothalamic-pituitary-adrenal (HPA) axis, a signalling chain involving the hypothalamus and pituitary gland in the brain, and the adrenal glands above the kidneys. The brain sends a chemical signal (CRH) to the pituitary, which releases another signal (ACTH) into the bloodstream, which tells the adrenal glands to release cortisol. Cortisol is the body's master brake on inflammation. Under normal conditions, it suppresses the immune system's pro-inflammatory activity when the threat has passed.`}
            </p>

            <p className={p}>
              {`Here's the paradox: many people with PTSD don't have chronically high cortisol. They have chronically `}
              <em>low</em>
              {` cortisol. The stress system has become so sensitised that it applies the negative feedback brake too hard, suppressing cortisol production even when it's needed. The result: the inflammatory response, normally kept in check by cortisol, runs without adequate control. Inflammatory proteins stay elevated. This is one of the most replicated biological findings in the PTSD literature (Yehuda & Bierer, 2009).`}
            </p>

            <p className={p}>
              {`IL-6 and TNF-α can then cross into the brain through a partially compromised blood-brain barrier, activate the brain's immune cells (microglia), and drive further neuroinflammation. They also promote the excessive release of glutamate. Glutamate is the brain's primary excitatory neurotransmitter, driving electrical signalling between neurons. In excess it becomes toxic, flooding neurons with calcium and triggering cell death. This adds another layer to the neurological damage trauma creates (Müller et al., 2023).`}
            </p>

            <p className={p}>
              {`Some of this dysregulation runs deeper still, into the machinery of gene regulation. Epigenetics is the process by which experience alters how genes are switched on or off, without rewriting the DNA code itself. Think of it as editing the volume on a track rather than changing the music. What matters is not which genes you have but how loudly or quietly they're expressed. Two specific genes involved in regulating the cortisol system, `}
              <em>FKBP5</em>
              {` and `}
              <em>NR3C1</em>
              {` (which encodes the cortisol receptor itself), have been studied as potential epigenetic markers in PTSD, with the idea being that sustained stress alters how sensitively these genes respond, perpetuating the HPA dysregulation described above.`}
            </p>

            <p className={p}>
              {`This is also the area most frequently cited in psychotherapy contexts to explain how trauma might be transmitted across generations, with Yehuda and colleagues' work on Holocaust survivors and their offspring the most prominent example.`}
            </p>

            <p className={p}>
              {`The hypothesis is biologically plausible. The current evidence, however, is considerably weaker than the confidence with which it tends to be presented in CPD settings and therapeutic frameworks. Results for specific gene markers are inconsistent across studies. Blood samples, which is what most of these studies use, contain a mixture of different immune cell types each with different gene expression profiles, making results hard to interpret. Most studies are small and have not replicated cleanly. And the evidence that epigenetic changes are actually transmitted through sperm or egg cells, rather than through the stress environment of the womb or early childhood, is currently insufficient to support firm claims (Cao-Lei et al., 2022). The intergenerational transmission of trauma through epigenetic mechanisms is an interesting hypothesis. It is not an established fact. The distinction matters when it's being sold as established science in clinical training. A fuller examination, alongside the parallel problem of mirror neuron theory in psychotherapy, deserves a dedicated article of its own.`}
            </p>

            <p className={p}>
              {`The key point stands: the body `}
              <em>is</em>
              {` profoundly affected by trauma, at a physiological and molecular level. But the mechanism runs top-down. The brain drives this through the stress hormone cascade and the sympathetic nervous system, producing peripheral biological consequences. Those consequences don't store the memory. The memory, the miscalibrated prediction, the rigid attractor: those live in the brain. The Kotler et al. framing is more precise: the body participates as messenger, not archive.`}
            </p>

            {/* H2: Polyvagal Theory */}
            <h2 className={h2}>Polyvagal Theory: What the Biology Actually Shows</h2>

            <p className={p}>
              {`Polyvagal theory, developed by Stephen Porges from 1995 onwards, has had enormous reach in trauma therapy. The framework proposes that the autonomic nervous system (the part of the nervous system regulating involuntary functions like heart rate, digestion, and breathing) is organised as a hierarchy of three circuits. At the top, the ventral vagal circuit promotes social engagement and feelings of safety. In the middle, the sympathetic system drives fight-or-flight. At the bottom, the ancient dorsal vagal system triggers immobilisation, freeze, and shutdown responses under life-threatening conditions. In trauma, the theory suggests, the nervous system gets stuck in one of the lower circuits.`}
            </p>

            <p className={p}>
              {`The clinical language this framework has generated, the window of tolerance, safety cues, ventral vagal states, has been useful shorthand for therapists and clients. That much is real.`}
            </p>

            <p className={p}>
              {`The biological foundations are where the problems begin.`}
            </p>

            <p className={p}>
              {`PVT's core anatomical argument is that two specific brainstem structures have fundamentally different functions: the nucleus ambiguus, which sends nerve signals from the brain to the heart and promotes social safety; and the dorsal motor nucleus of the vagus, which PVT proposes triggers the freeze and shutdown response via dramatic slowing of the heart rate in life-threatening situations. This distinction between these two structures is the anatomical engine of the whole three-circuit model.`}
            </p>

            <p className={p}>
              {`In early 2026, 39 researchers with expertise in vagal neuroanatomy and neurophysiology published a formal critique in `}
              <em>Clinical Neuropsychiatry</em>
              {` arguing that this claim is not supported by the available evidence (Grossman et al., 2026). Their core argument: in mammals, the regulation of heart rate via the vagus nerve runs predominantly through the nucleus ambiguus, not the dorsal motor nucleus. The dorsal motor nucleus primarily projects to and controls organs below the diaphragm: the gut, the stomach, the liver. Its direct role in cardiac control in mammals is, at best, minor. The dramatic heart-rate slowing that PVT proposes as the mechanism of freeze and shutdown states isn't what the anatomy actually shows happening.`}
            </p>

            <p className={p}>
              {`The second problem is measurement. PVT relies heavily on a measure called respiratory sinus arrhythmia (RSA), the natural variation in heart rate that occurs with each breath, as a proxy for vagal tone and safety-state activation. The problem: RSA is influenced by respiratory rate, breath depth, posture, age, medication, and how the data is analysed. It is not a clean measure of activity specifically in the nucleus ambiguus. Without tightly controlling all those variables, you can't reliably draw the conclusions PVT asks it to support (Grossman, 2023; Beauchaine & Thayer, 2015).`}
            </p>

            <p className={p}>
              {`Porges published a detailed rebuttal in the same journal issue (Porges, 2026), arguing the critique misrepresents what the theory actually claims, a disagreement that has been running for nearly two decades. Some newer biological techniques, including optogenetics and molecular analysis, do support certain functional distinctions between the brainstem structures in question (Strain et al., 2024). The debate is not resolved.`}
            </p>

            <p className={p}>
              {`What is clear: the specific anatomical and physiological claims underpinning polyvagal theory are actively contested at the highest level of the relevant scientific literature, by neurophysiologists who study the vagus nerve for a living. The broader clinical observation that perceived safety and social connection regulate our physiological state is well supported in the wider literature. Those two things are not the same as saying polyvagal theory's specific biological model is correct. And the difference matters when that model is being taught in training programmes as established neuroscience, which it currently is.`}
            </p>

            {/* H2: Why Different Therapies May Work for the Same Reason */}
            <h2 className={h2}>Why Different Therapies May Work for the Same Reason</h2>

            <p className={p}>
              {`Kotler et al. (2026) make an observation worth sitting with. Diverse interventions, EMDR, mindfulness, yoga, psychedelics, even intense physical activity, all produce measurable improvements in PTSD symptoms. On the surface they look completely unrelated. The paper argues they may all work via the same underlying mechanism: each one restores the brain's lost flexibility. Each creates a window in which rigid, threat-weighted predictions can be loosened and updated. The mechanism isn't specific content. It's dynamic reorganisation.`}
            </p>

            <p className={p}>
              {`Flow states fit this picture well. Flow, the experience of complete absorption, effortless focus, and present-moment immersion, is associated with reduced activity in the default mode network, the brain's resting-state self-referential system. In PTSD, this network is chronically overactive. It keeps returning to threat-related memories without resolution. Flow temporarily quiets this loop, creating a window in which the brain isn't actively generating fear predictions, and in which some revision may become possible.`}
            </p>

            <p className={p}>
              {`Psychedelics appear to work through a related mechanism, temporarily loosening the brain's grip on entrenched predictions and creating a neuroplasticity window, and early clinical research, particularly on psilocybin and MDMA for PTSD, is promising (Carhart-Harris & Friston, 2019; Mitchell et al., 2023). These are specialist clinical interventions requiring rigorous preparation and oversight, not self-directed treatments, and the regulatory picture is still developing. But the neuroscience of how they work maps directly onto the metastability framework this article describes.`}
            </p>

            {/* H2: Mindfulness */}
            <h2 className={h2}>Mindfulness: Useful, Evidence-Based, and Not Without Risk</h2>

            <p className={p}>
              {`Mindfulness-based interventions have a legitimate evidence base for PTSD. The US Veterans Affairs and Department of Defense 2024 clinical practice guidelines explicitly recommend mindfulness-based stress reduction (MBSR) as a treatment option, an endorsement that carries weight coming from the world's largest trauma treatment system (VA/DoD, 2024). An umbrella review of 69 separate systematic reviews found low-to-medium effect sizes for mindfulness interventions in reducing PTSD symptoms, with high engagement and retention compared to many other treatments (Koek et al., 2024).`}
            </p>

            <p className={p}>
              {`Why might it work? Sustained present-moment attention, the practice of noticing without reacting, is associated over time with reduced activity in the overactive self-referential network, improved regulation between the prefrontal cortex and the amygdala, and gradual normalisation of the stress hormone response. These directly address several of the core neurobiological features of PTSD. The mechanism fits the metastability framework: regular practice gradually restores the brain's flexibility rather than creating a single acute opening, as psychedelics do.`}
            </p>

            <p className={p}>
              {`The caution is real, however, and has a specific neurobiological basis.`}
            </p>

            <p className={p}>
              {`For someone with PTSD or CPTSD, directing sustained inward attention, particularly body-scan practices, can function as a threat cue rather than a calming one. The brain's threat-prediction system is already overweighted toward danger. Instructing it to attend closely to body sensations can trigger exactly the activation the practice is meant to reduce: hyperarousal, intrusive memories, emotional flooding, or at the other extreme, dissociation. A 2025 study in `}
              <em>PLOS ONE</em>
              {` found that a history of childhood trauma and sub-threshold PTSD symptoms were significant predictors of adverse effects in mindfulness programmes, including increased dissociation and worse outcomes (Canby et al., 2025).`}
            </p>

            <p className={p}>
              {`This is not an argument against mindfulness. It's an argument for trauma-sensitive delivery: adapting pacing and technique to the individual's actual regulatory capacity, watching for signs of activation or dissociation as they emerge, and not assuming the standard eight-week protocol is automatically appropriate for someone with significant trauma history. Trauma-sensitive mindfulness isn't a softer version of the practice. It's the correct version for this population (Treleaven, 2018).`}
            </p>

            {/* H2: Why This All Matters */}
            <h2 className={h2}>Why This All Matters</h2>

            <p className={p}>
              {`Since Kotler et al. (2026) was published, the response has been predictable. Many somatic practitioners have argued, with some justification, that this is essentially what they've always said, just framed in different language. The embodied experience of trauma isn't in dispute. How we explain that experience scientifically, and what we teach as established fact, is a different question.`}
            </p>

            <p className={p}>
              {`The polyvagal theory debate makes the stakes concrete. A model with specific claims about the anatomy of the vagus nerve is taught on most psychotherapy training programmes as established neuroscience. Thirty-nine neurophysiologists have now formally challenged those claims in the peer-reviewed literature. Practitioners deserve to know that.`}
            </p>

            <p className={p}>
              {`The same applies to "the body keeps the score" as a literal biological claim. The body is measurably affected by trauma: through the stress hormone system, through elevated inflammation, through structural changes in the brain. None of that is trivial. But the mechanism isn't somatic memory storage. It's the brain driving downstream biological consequences through a maladaptive prediction system. Those are very different claims with very different implications for how we understand and treat trauma.`}
            </p>

            <p className={p}>
              {`In an era where neuroscience language is aggressively appropriated to market therapeutic products, often at considerable cost to practitioners and clients, the profession has a responsibility to distinguish between what is established, what is theoretically sound but still developing, and what is contested. Not out of pedantry. Because the people we work with deserve frameworks that will hold up.`}
            </p>

            {/* H2: A Note on Science and Psychotherapy */}
            <h2 className={h2}>A Note on Science and Psychotherapy</h2>

            <p className={p}>
              {`The neuroscience of trauma is remarkable. What has emerged from computational neuroscience, immunology, and psychopharmacology over the last two decades offers a far richer account of what trauma does to a person than any metaphor can. There's no need to simplify that into something more accessible if the simplification introduces inaccuracies. The science itself is fascinating. It's already there. Frameworks that help make it clinically usable have value. They should be honest about what's established, clear about what's still speculative, and willing to update when the evidence shifts.`}
            </p>

            <p className={p}>
              {`That's what the Kotler et al. paper asks of us. If trauma is fundamentally a disorder of prediction and flexibility rather than a disorder of physical storage, then the diverse range of interventions that help, EMDR, psychedelics, mindfulness, yoga, relational therapy and somatic approaches, starts to make sense as a coherent family. They all, in different ways, create conditions in which a brain that's been locked in threat can begin to revise. The mechanism is flexibility. The goal is the same.`}
            </p>

            <p className={p}>
              {`The scientific model doesn't ask for certainty. It asks for flexibility. That's something trauma neuroscience and good clinical practice have always had in common.`}
            </p>

            {/* ── References ── */}
            <details className="mt-16 border-t border-gray-200 pt-8 group">
              <summary className="font-heading font-light text-xl text-forest cursor-pointer select-none h-hover:text-orange h-can:transition-colors list-none flex items-center gap-2">
                <span>References</span>
                <svg
                  className="w-4 h-4 text-orange h-can:transition-transform group-open:rotate-180"
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
                <p className={ref}>
                  {`Beauchaine, T.P., & Thayer, J.F. (2015). Heart rate variability as a transdiagnostic biomarker of psychopathology. `}
                  <em>International Journal of Psychophysiology</em>
                  {`, 98(2), 338–350.`}
                </p>
                <p className={ref}>
                  {`Ben-Zion, Z., Korem, N., Fine, N.B., et al. (2024). Structural neuroimaging of hippocampus and amygdala subregions in posttraumatic stress disorder: a scoping review. `}
                  <em>Biological Psychiatry: Global Open Science</em>
                  {`, 4, 120–134.`}
                </p>
                <p className={ref}>
                  {`Canby, N.K., et al. (2025). Childhood trauma and subclinical PTSD symptoms predict adverse effects and worse outcomes across two mindfulness-based programs for active depression. `}
                  <em>PLOS ONE</em>
                  {`, 20(1), e0318499.`}
                </p>
                <p className={ref}>
                  {`Cao-Lei, L., Saumier, D., Fortin, J., & Brunet, A. (2022). A narrative review of the epigenetics of post-traumatic stress disorder and PTSD treatment. `}
                  <em>Frontiers in Psychiatry</em>
                  {`, 13, 857087.`}
                </p>
                <p className={ref}>
                  {`Carhart-Harris, R.L., & Friston, K.J. (2019). REBUS and the Anarchic Brain: Toward a Unified Model of the Brain Action of Psychedelics. `}
                  <em>Pharmacological Reviews</em>
                  {`, 71(3), 316–344.`}
                </p>
                <p className={ref}>
                  {`Chamberlain, S.R., et al. (2008). Orbitofrontal dysfunction in patients with obsessive-compulsive disorder and their unaffected relatives. `}
                  <em>Science</em>
                  {`, 321(5887), 421–422.`}
                </p>
                <p className={ref}>
                  {`Cloitre, M., et al. (2013). Evidence for proposed ICD-11 PTSD and complex PTSD: a latent profile analysis. `}
                  <em>European Journal of Psychotraumatology</em>
                  {`, 4(1), 20706.`}
                </p>
                <p className={ref}>
                  {`Coverdell, T.C., Abraham-Fan, R.J., Wu, C., Abbott, S.B.G., & Campbell, J.N. (2022). Genetic encoding of an esophageal motor circuit. `}
                  <em>Cell Reports</em>
                  {`, 39(11), 110962.`}
                </p>
                <p className={ref}>
                  {`Del Casale, A., et al. (2022). Grey matter volume reductions of the left hippocampus and amygdala in PTSD: a coordinate-based meta-analysis. `}
                  <em>Neuropsychobiology</em>
                  {`, 81, 257–264.`}
                </p>
                <p className={ref}>
                  {`Fonagy, P., & Bateman, A.W. (2016). Adversity, attachment, and mentalizing. `}
                  <em>Comprehensive Psychiatry</em>
                  {`, 64, 59–66.`}
                </p>
                <p className={ref}>
                  {`Friston, K. (2010). The free-energy principle: a unified brain theory? `}
                  <em>Nature Reviews Neuroscience</em>
                  {`, 11(2), 127–138.`}
                </p>
                <p className={ref}>
                  {`Giroux, C., Ahlers, D., & Miawotoe, A. (2023). Polyvagal approaches: Scientifically questionable but useful in practice. `}
                  <em>Journal of Psychiatry Reform</em>
                  {`, 10(11).`}
                </p>
                <p className={ref}>
                  {`Grossman, P., & Taylor, E.W. (2007). Toward understanding respiratory sinus arrhythmia: relations to cardiac vagal tone, evolution, and biobehavioral functions. `}
                  <em>Biological Psychology</em>
                  {`, 74(2), 263–285.`}
                </p>
                <p className={ref}>
                  {`Grossman, P. (2023). Fundamental challenges and likely refutations of the five basic premises of the polyvagal theory. `}
                  <em>Biological Psychology</em>
                  {`, 180, 108589.`}
                </p>
                <p className={ref}>
                  {`Grossman, P., et al. (2026). Why the polyvagal theory is untenable: an international expert evaluation. `}
                  <em>Clinical Neuropsychiatry</em>
                  {`, 23(1).`}
                </p>
                <p className={ref}>
                  {`Hellyer, P.J., Scott, G., Shanahan, M., Sharp, D.J., & Leech, R. (2015). Cognitive flexibility through metastable neural dynamics is disrupted by damage to the structural connectome. `}
                  <em>Journal of Neuroscience</em>
                  {`, 35(24), 9050–9063.`}
                </p>
                <p className={ref}>
                  {`Hyland, P., et al. (2021). Exploring differences between ICD-11 CPTSD and PTSD in a community sample. `}
                  <em>Acta Psychiatrica Scandinavica</em>
                  {`, 143(3), 229–240.`}
                </p>
                <p className={ref}>
                  {`Koek, R.J., et al. (2024). Can mindfulness-based interventions reduce PTSD symptoms? An umbrella review. `}
                  <em>Journal of Affective Disorders</em>
                  {`, 350, 289–302.`}
                </p>
                <p className={ref}>
                  {`Kotler, S. (2014). `}
                  <em>The Rise of Superman: Decoding the Science of Ultimate Human Performance</em>
                  {`. New Harvest. `}
                  <strong className="font-semibold">{`[Non-peer-reviewed popular science book; cited by the authors in their 2026 paper.]`}</strong>
                </p>
                <p className={ref}>
                  {`Kotler, S., Mannino, M., Fox, G., & Friston, K. (2026). The body does not keep the score: trauma, predictive coding, and the restoration of metastability. `}
                  <em>Frontiers in Systems Neuroscience</em>
                  {`, 20, 1812957.`}
                </p>
                <p className={ref}>
                  {`Kredlow, M.A., Fenster, R.J., Laurent, E.S., Ressler, K.J., & Phelps, E.A. (2022). Prefrontal cortex, amygdala, and threat processing: implications for PTSD. `}
                  <em>Neuropsychopharmacology</em>
                  {`, 47, 247–259.`}
                </p>
                <p className={ref}>
                  {`Mitchell, J.M., et al. (2023). MDMA-assisted therapy for moderate to severe PTSD: a randomised, placebo-controlled Phase 3 trial. `}
                  <em>Nature Medicine</em>
                  {`, 29, 2473–2480.`}
                </p>
                <p className={ref}>
                  {`Müller, N., et al. (2023). Emphasising the crosstalk between inflammatory and neural signalling in PTSD. `}
                  <em>Journal of Neuroimmune Pharmacology</em>
                  {`, 18, 229–247.`}
                </p>
                <p className={ref}>
                  {`Porges, S.W. (1995). Orienting in a defensive world: mammalian modifications of our evolutionary heritage. `}
                  <em>Psychophysiology</em>
                  {`, 32, 301–318.`}
                </p>
                <p className={ref}>
                  {`Porges, S.W. (2023). `}
                  <em>The Vagal Paradox: A Polyvagal Solution</em>
                  {`. W.W. Norton.`}
                </p>
                <p className={ref}>
                  {`Porges, S.W. (2026). When a critique becomes untenable: a scholarly response to Grossman et al.'s evaluation of polyvagal theory. `}
                  <em>Clinical Neuropsychiatry</em>
                  {`, 23(1), 113–128.`}
                </p>
                <p className={ref}>
                  {`Shapiro, F. (2017). `}
                  <em>Eye Movement Desensitization and Reprocessing (EMDR) Therapy</em>
                  {` (3rd ed.). Guilford Press. `}
                  <strong className="font-semibold">{`[Clinical text, not empirical primary literature.]`}</strong>
                </p>
                <p className={ref}>
                  {`Siegel, J.S., et al. (2024). Psilocybin desynchronizes the human brain. `}
                  <em>Nature</em>
                  {`, 632, 131–138.`}
                </p>
                <p className={ref}>
                  {`Strain, M.M., et al. (2024). Dorsal motor vagal neurons can elicit bradycardia and reduce anxiety-like behavior. `}
                  <em>iScience</em>
                  {`, 27(3), 109137. https://doi.org/10.1016/j.isci.2024.109137`}
                </p>
                <p className={ref}>
                  {`Treleaven, D.A. (2018). `}
                  <em>Trauma-Sensitive Mindfulness: Practices for Safe and Transformative Healing</em>
                  {`. W.W. Norton. `}
                  <strong className="font-semibold">{`[Clinical practitioner text; not peer-reviewed primary research.]`}</strong>
                </p>
                <p className={ref}>
                  {`US Department of Veterans Affairs / Department of Defense. (2024). `}
                  <em>VA/DoD Clinical Practice Guideline for the Management of PTSD and Acute Stress Disorder</em>
                  {`. VA/DoD Evidence-Based Practice Working Group.`}
                </p>
                <p className={ref}>
                  {`van der Kolk, B.A. (2014). `}
                  <em>The Body Keeps the Score: Brain, Mind, and Body in the Healing of Trauma</em>
                  {`. Viking.`}
                </p>
                <p className={ref}>
                  {`van der Kolk, B.A., et al. (2014). Yoga as an adjunctive treatment for PTSD. `}
                  <em>Journal of Clinical Psychiatry</em>
                  {`, 75(6), e559–e565.`}
                </p>
                <p className={ref}>
                  {`Yehuda, R., & Bierer, L.M. (2009). The relevance of epigenetics to PTSD: implications for the DSM-V. `}
                  <em>Journal of Traumatic Stress</em>
                  {`, 22(5), 427–434.`}
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
            {`If you are in Ireland or the UK and think therapy might help with trauma or PTSD, I offer `}
            <Link href="/trauma-therapy-dublin" className="underline underline-offset-2 decoration-cream/40 h-hover:decoration-cream h-can:transition-colors text-cream/90">
              trauma-informed therapy in Dublin and online
            </Link>
            {`. There is no pressure and no obligation — the first step is simply a conversation.`}
          </p>
          <span
            className="block w-12 h-px mx-auto mb-8"
            style={{ backgroundColor: '#d4a843' }}
            aria-hidden="true"
          />
          <Link
            href="/contact"
            className="inline-block bg-orange text-white px-10 py-4 rounded-md text-xs uppercase tracking-normal font-normal h-hover:opacity-90 h-can:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-[#2A4D3C]"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </>
  );
}
