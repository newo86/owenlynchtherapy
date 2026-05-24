import type { Metadata } from 'next';
import { Poppins, Montserrat } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import ScrollToTop from '@/components/ui/ScrollToTop';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['300', '400'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://owenlynchtherapy.com'),
  title: {
    default: 'Owen Lynch Psychotherapy | Professional Therapy Services',
    template: '%s | Owen Lynch Psychotherapy',
  },
  description:
    'Professional psychotherapy services with Owen Lynch. Evidence-based therapy for anxiety, depression, trauma, and relationship difficulties. Based in Ireland.',
  authors: [{ name: 'Owen Lynch' }],
  creator: 'Owen Lynch',
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    url: 'https://owenlynchtherapy.com',
    siteName: 'Owen Lynch Psychotherapy',
    title: 'Owen Lynch Psychotherapy | Professional Therapy Services',
    description:
      'Professional psychotherapy services with Owen Lynch. Evidence-based therapy in Ireland.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Owen Lynch Psychotherapy',
    description: 'Professional psychotherapy services.',
  },
  alternates: {
    canonical: 'https://owenlynchtherapy.com',
    languages: {
      'en-IE': 'https://owenlynchtherapy.com',
      'x-default': 'https://owenlynchtherapy.com',
    },
  },
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
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  verification: {
    google: 'INmCeOlMzKRQuiKu2-9w4Vq6-JypCzLXvOb0Mjfj2xY',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${montserrat.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-PT5KPMD3');` }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "MedicalBusiness",
          "@id": "https://www.owenlynchtherapy.com/#medicalbusiness",
          "name": "Owen Lynch Psychotherapy",
          "url": "https://www.owenlynchtherapy.com",
          "logo": "https://www.owenlynchtherapy.com/logo.png",
          "image": "https://www.owenlynchtherapy.com/therapy-room.jpg",
          "description": "Accredited integrative psychotherapist in Dublin specializing in evidence-based treatments for Anxiety, OCD, ADHD, Autism, and Trauma.",
          "telephone": "+353851471689",
          "email": "info@owenlynchtherapy.com",
          "priceRange": "€70-€80",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "106 Capel Street",
            "addressLocality": "Rotunda",
            "addressRegion": "Dublin 1",
            "postalCode": "D01 WY40",
            "addressCountry": "IE"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": "53.3498",
            "longitude": "-6.2674"
          },
          "openingHoursSpecification": [
            { "@type": "OpeningHoursSpecification", "dayOfWeek": "Friday", "opens": "16:00", "closes": "20:00" },
            { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "15:00" }
          ],
          "medicalSpecialty": ["MedicalPsychology", "MentalHealth"],
          "knowsAbout": [
            "Psychotherapy",
            "Cognitive Behavioral Therapy",
            "Acceptance and Commitment Therapy",
            "Exposure and Response Prevention",
            "Obsessive-Compulsive Disorder",
            "Anxiety Management",
            "ADHD Support"
          ],
          "founder": {
            "@type": "Person",
            "name": "Owen Lynch",
            "jobTitle": "Accredited Psychotherapist",
            "alumniOf": { "@type": "EducationalOrganization", "name": "National University of Ireland Maynooth" },
            "award": ["IAHIP Accredited", "ICP Accredited"]
          }
        }) }} />
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-cream text-gray-900">
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-PT5KPMD3" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        {children}
        <ScrollToTop />
        <Analytics />
      </body>
    </html>
  );
}
