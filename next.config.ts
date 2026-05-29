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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Service detail sub-pages — not built yet
      { source: '/services/:slug',              destination: '/contact', permanent: false },

      // Placeholder articles not written yet — keep both old /blog/ and new
      // /articles/ paths routing to /contact (more specific rules must come
      // before the /blog → /articles catch-all below or they'd be swallowed).
      { source: '/blog/what-does-adhd-feel-like',        destination: '/contact', permanent: false },
      { source: '/blog/finding-the-right-therapist',     destination: '/contact', permanent: false },
      { source: '/articles/what-does-adhd-feel-like',    destination: '/contact', permanent: false },
      { source: '/articles/finding-the-right-therapist', destination: '/contact', permanent: false },

      // Old /blog URL space → /articles. 301 permanent so search engines
      // transfer the old listing/post URLs over.
      { source: '/blog',        destination: '/articles',        permanent: true },
      { source: '/blog/:slug*', destination: '/articles/:slug*', permanent: true },
    ];
  },
};

export default nextConfig;
