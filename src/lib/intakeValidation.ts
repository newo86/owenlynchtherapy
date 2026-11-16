// Shared by the intake form (browser) and /api/intake/submit (server) so the
// two can never disagree about what a valid name or phone number is.

/** Letters from any alphabet (Łukasz, Seán, Zoë), spaces, hyphens, full stops
 *  and both straight and curly apostrophes — phones type O’Brien with the
 *  curly one, which the old ASCII-only rule rejected. A literal space, not
 *  \s, so newlines and invisible separators never pass. */
export const NAME_RE = /^[\p{L}\p{M} '’.\-]{2,100}$/u;

/** ASCII-only slug of a name for download / attachment filenames. HTTP
 *  headers can't carry characters beyond Latin-1 — "Łukasz" in a
 *  Content-Disposition header throws and takes the download down. */
export function filenameSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return slug || 'client';
}

/** Irish, UK or any international number. Online clients are across Ireland
 *  and the UK, so an Irish-only rule locked UK clients out of the form.
 *  Accepts +<country><number>, 00<country><number>, or a national number
 *  starting with 0 (Irish 01/08x, UK 07xxx …). */
export function isValidPhone(raw: string): boolean {
  const stripped = raw.replace(/[\s\-().]/g, '');
  return /^(\+|00)[1-9]\d{7,14}$/.test(stripped) || /^0[1-9]\d{7,9}$/.test(stripped);
}
