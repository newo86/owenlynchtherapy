import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit', 'sharp'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async redirects() {
    return [
      // Service detail sub-pages — not built yet
      { source: '/services/:slug',              destination: '/contact', permanent: false },
      // Placeholder blog posts — not written yet
      { source: '/blog/what-does-adhd-feel-like',    destination: '/contact', permanent: false },
      { source: '/blog/finding-the-right-therapist', destination: '/contact', permanent: false },
    ];
  },
};

export default nextConfig;
