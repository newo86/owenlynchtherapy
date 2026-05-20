export function sanitiseInput(value: string): string {
  return value
    .replace(/\0/g, '')        // remove null bytes
    .replace(/<[^>]*>/g, '')   // strip HTML tags
    .replace(/\s+/g, ' ')      // normalise whitespace
    .trim();
}
