import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="font-heading text-5xl font-bold text-green mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">
        Sorry, we could not find that page.
      </p>
      <Link
        href="/"
        className="inline-block bg-green text-white px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition-colors"
      >
        Return home
      </Link>
    </main>
  );
}
