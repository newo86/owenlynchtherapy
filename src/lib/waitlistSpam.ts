// Spots sales pitches sent through the waiting-list form ("we can put your
// business at the top of search…"). A flagged entry is still stored, under
// status 'spam', so a real person can never be lost: it's shown in its own
// collapsed section of the dashboard with a "Not spam" button, and no
// notification email goes out for it.
//
// Scored, not keyword-matched: real clients sometimes mention "the website"
// or "searching for a therapist", so one word is never enough.

/** Throwaway domains seen sending pitches. Add to this as new ones appear. */
const SPAM_DOMAINS = new Set(['jmailservice.com']);

const SIGNALS: Array<[RegExp, number]> = [
  // Addressed to a business, not about the writer.
  [/\b(your|ur) (business|company|brand|website|site|practice|clinic|page|online presence)\b/i, 2],
  [/\bbusinesses like yours\b/i, 2],
  [/\bcame across your (website|site|page|profile)\b/i, 2],
  // What they sell.
  [/\b(seo|search engines?|search results|search pages|top of (google|search)|google ads?|backlinks?|web ?design|redesign|marketing|lead generation|more (clients|customers|leads|traffic))\b/i, 2],
  [/\b(competitors?|the competition)\b/i, 1],
  [/\b(customers|clients) (are )?(already )?searching\b/i, 1],
  // How they sell it.
  [/\b(are you interested|interested\?|get on board|is this something you'?d|would you like (to|me to)|can i send|shall i send|free (audit|quote|consultation))\b/i, 2],
  [/\b(within (24 hours|a day|one day)|setup (is|usually)|set-up|launch it)\b/i, 1],
  [/\bwe (specialize|specialise|solve|make it easy|place|can place|offer|help businesses)\b/i, 2],
  [/https?:\/\/|www\./i, 1],
];

// Words a person looking for therapy uses about themselves.
const PERSONAL = /\b(therap|counsell?|anxi|ocd|depress|trauma|adhd|autis|grief|panic|struggl|feel|felt|relationship|intrusive|stress|cope|coping|mental health|my (partner|wife|husband|mum|mom|dad|family)|i'?m (at|struggling|looking|finding))/i;

export const SPAM_THRESHOLD = 4;

export function waitlistSpamScore(entry: { email: string; reason?: string | null; full_name?: string }): number {
  const text = `${entry.reason ?? ''}`;
  let score = 0;
  const domain = entry.email.split('@')[1]?.toLowerCase().trim() ?? '';
  if (SPAM_DOMAINS.has(domain)) score += 4;
  for (const [re, weight] of SIGNALS) if (re.test(text)) score += weight;
  if (PERSONAL.test(text)) score -= 3;
  return score;
}

export function looksLikeSalesPitch(entry: { email: string; reason?: string | null; full_name?: string }): boolean {
  return waitlistSpamScore(entry) >= SPAM_THRESHOLD;
}
