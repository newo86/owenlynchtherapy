import type { Metadata } from 'next';
import { Poppins, Montserrat } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

const montserrat = Montserrat({
  variable: '--font-montserrat',
  subsets: ['latin'],
  weight: ['400'],
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
  keywords: [
    'psychotherapy',
    'psychotherapist',
    'therapy',
    'counselling',
    'mental health',
    'anxiety',
    'depression',
    'trauma',
    'Owen Lynch',
    'Ireland',
  ],
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
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${montserrat.variable}`}>
      <body className="min-h-screen flex flex-col antialiased bg-cream text-gray-900">
        {children}
      </body>
    </html>
  );
}
