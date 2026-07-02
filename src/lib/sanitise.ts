export function sanitiseInput(value: string): string {
  return value
    .replace(/\0/g, '')        // remove null bytes
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/\s+/g, ' ')      // normalise whitespace
    .trim();
}

// Escape a user-supplied string for safe interpolation into HTML (email
// bodies, etc.). Unlike sanitiseInput this preserves the content exactly —
// use it whenever user text is placed inside markup.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
