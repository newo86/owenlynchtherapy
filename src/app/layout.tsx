import type { Metadata } from 'next';
import { Poppins, Montserrat } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import ScrollToTop from '@/components/ui/ScrollToTop';
import { PRACTICE, SITE_URL, DEFAULT_OG_IMAGE } from '@/practice.config';

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${PRACTICE.businessName} | Professional Therapy Services`,
    template: `%s | ${PRACTICE.businessName}`,
  },
  description:
    `Professional psychotherapy services with ${PRACTICE.practitionerName}. Evidence-based therapy for anxiety, depression, trauma, and relationship difficulties. Based in Ireland.`,
  authors: [{ name: PRACTICE.practitionerName }],
  creator: PRACTICE.practitionerName,
  openGraph: {
    type: 'website',
    locale: 'en_IE',
    url: SITE_URL,
    siteName: PRACTICE.businessName,
    title: `${PRACTICE.businessName} | Professional Therapy Services`,
    description:
      `Professional psychotherapy services with ${PRACTICE.practitionerName}. Evidence-based therapy in Ireland.`,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: PRACTICE.businessName,
    description:
      `${PRACTICE.accreditation.summary} psychotherapist. ${PRACTICE.serviceArea}.`,
    images: [DEFAULT_OG_IMAGE.url],
  },
  // NOTE: deliberately no root-level `alternates.canonical` — a global
  // canonical pointing at the homepage would apply to every page that doesn't
  // override it. Each indexable page declares its own canonical.
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
  ...(PRACTICE.googleSiteVerification
    ? { verification: { google: PRACTICE.googleSiteVerification } }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const gtm = PRACTICE.gtmId;
  return (
    <html lang="en" className={`${poppins.variable} ${montserrat.variable}`}>
      <head>
        {gtm && (
          <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');` }} />
        )}
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-cream text-gray-900">
        {gtm && (
          <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        )}
        {children}
        <ScrollToTop />
        <Analytics />
      </body>
    </html>
  );
}
