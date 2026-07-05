import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfkit', 'sharp'],
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        // Article images still served from the old Sanity CDN — keep until
        // they are localised into /public/images/articles (needs an env with
        // network access to cdn.sanity.io). Do NOT delete the Sanity project
        // before that happens.
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

    // Baseline CSP for the whole site (incl. marketing pages). More permissive
    // than adminCsp because the public pages load Google Tag Manager, Google
    // Maps embeds, the Psychology Today badge, Cloudflare Turnstile and Vercel
    // Analytics. 'unsafe-inline' is required for GTM, JSON-LD, the PT badge and
    // Next's inline hydration scripts; img-src is broad so analytics pixels and
    // CMS images aren't blocked. The stricter adminCsp is ALSO applied to
    // /admin/* (browsers enforce both policies there).
    const siteCsp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://va.vercel-scripts.com https://challenges.cloudflare.com https://member.psychologytoday.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://stats.g.doubleclick.net https://va.vercel-scripts.com https://vitals.vercel-insights.com https://challenges.cloudflare.com https://*.psychologytoday.com",
      "frame-src 'self' https://challenges.cloudflare.com https://www.google.com https://maps.google.com https://www.googletagmanager.com",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; ');


    return [
      {
        // Non-CSP security headers for every route.
        source: '/(.*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: siteCsp },
          { key: 'X-Frame-Options', value: 'DENY' },
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
      // High-intent legacy Wix URLs (catch trailing-slash variants too).
      {
        source: '/f{/}?',
        destination: '/faq',
        permanent: true,
      },
      {
        source: '/book-online{/}?',
        destination: '/services', // Change to /contact if you prefer them to go straight to the form
        permanent: true,
      },
      {
        source: '/service-page/online-therapy{/}?',
        destination: '/services',
        permanent: true,
      },

      // Legacy Wix URLs indexed by Google — 301 to canonical clean routes
      { source: '/about-5',   destination: '/about',   permanent: true },
      { source: '/contact-3', destination: '/contact', permanent: true },

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
