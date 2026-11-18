'use client';

import { Analytics } from '@vercel/analytics/next';

// Vercel Web Analytics records the page URL. Pages reached from a private
// link (intake, questionnaires, unsubscribe) carry a live token in the query
// string, and a visit to them reveals someone is a client, so they are not
// recorded at all. Keep this list in step with the GTM exclusion in
// src/app/layout.tsx.
const PRIVATE_PATH = /^\/(admin|intake|unsubscribe|values|preferences)(\/|$)/;

export default function PrivateAnalytics() {
  return (
    <Analytics
      beforeSend={event => {
        try {
          const url = new URL(event.url);
          if (PRIVATE_PATH.test(url.pathname)) return null;
          url.searchParams.delete('token');
          return { ...event, url: url.toString() };
        } catch {
          return null;
        }
      }}
    />
  );
}
