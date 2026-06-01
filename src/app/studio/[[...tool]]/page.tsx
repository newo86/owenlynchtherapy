/**
 * This route is responsible for the built-in authoring environment using Sanity Studio.
 * All routes under your studio path is handled by this file using Next.js' catch-all routes:
 * https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes
 *
 * You can learn more about the next-sanity package here:
 * https://github.com/sanity-io/next-sanity
 */

export const dynamic = 'force-static'

export { metadata, viewport } from 'next-sanity/studio'

// Rendering is delegated to StudioClient so that sanity.config.ts and all
// Sanity plugin modules (which call React.createContext at import time) are
// only ever evaluated in the client bundle, never during server-side rendering.
export { default } from './StudioClient'
