import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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
      // Specialist service pages — not built yet
      { source: '/ocd-therapy-dublin',          destination: '/contact', permanent: false },
      { source: '/anxiety-therapy-dublin',      destination: '/contact', permanent: false },
      { source: '/adhd-therapy-dublin',         destination: '/contact', permanent: false },
      { source: '/autism-therapy-dublin',       destination: '/contact', permanent: false },
      { source: '/depression-therapy-dublin',   destination: '/contact', permanent: false },
      { source: '/relationship-therapy-dublin', destination: '/contact', permanent: false },
      { source: '/trauma-therapy-dublin',       destination: '/contact', permanent: false },
      { source: '/lgbtqia-therapy-dublin',      destination: '/contact', permanent: false },
      // Service detail sub-pages — not built yet
      { source: '/services/:slug',              destination: '/contact', permanent: false },
      // Placeholder blog posts — not written yet
      { source: '/blog/what-does-adhd-feel-like',    destination: '/contact', permanent: false },
      { source: '/blog/finding-the-right-therapist', destination: '/contact', permanent: false },
    ];
  },
};

export default nextConfig;
