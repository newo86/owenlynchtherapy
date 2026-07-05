import type { MetadataRoute } from 'next';
import { PRACTICE } from '@/practice.config';

// Web app manifest, generated from the practice config so a clone never
// ships another practice's name/colours (replaces the old static
// public/site.webmanifest).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: PRACTICE.businessName,
    short_name: PRACTICE.practitionerName,
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: PRACTICE.brand.forest,
    background_color: PRACTICE.brand.linen,
    display: 'standalone',
  };
}
