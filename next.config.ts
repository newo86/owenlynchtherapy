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
    // Content-Security-Policy for the admin dashboard only. The admin area holds
    // the clinical data and the session secret, and — unlike the marketing
    // pages — loads no Google Maps embed, Psychology Today badge, Stripe.js or
    // Turnstile, so a strict policy here is safe. It allowlists only what the
    // dashboard actually uses: same-origin code, Google Tag Manager, and Vercel
    // Analytics. 'unsafe-inline' is required because the app uses inline styles
    // and Next.js injects inline hydration scripts (a future nonce-based setup
    // could drop it). A marketing-wide CSP is deliberately left for a separate,
    // verified rollout because of those third-party widgets.
    const adminCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
      "frame-src 'self' https://www.googletagmanager.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');

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
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: adminCsp },
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
