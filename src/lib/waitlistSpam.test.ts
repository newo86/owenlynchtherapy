import { describe, expect, it } from 'vitest';
import { looksLikeSalesPitch } from './waitlistSpam';

// Real pitches received through the form (Jul–Nov 2026). The sender address is
// replaced with a neutral one so these test the wording, not just the domain.
const PITCHES = [
  "We can place your company ahead of competitors in search - and you'll see it live within 24 hours. Do you want to get on board?",
  "We place your business right where people are already searching for your services - setup usually takes less than 24 hours. Are you interested?",
  "Imagine your brand appearing first when customers search online. That's exactly what we do - and we can launch it within a day. Are you interested?",
  "We make it easy to capture customers at the exact moment they're searching online. Our system places your brand at the top of search results.",
  "We specialize in putting businesses like yours right at the top of search results. Setup is fast and effortless. Is this something you'd like?",
  "Most businesses struggle to get noticed online. We solve that by putting your brand above the competition on major search pages for the exact terms.",
  "Hello, I came across your website and really liked what you're doing. While browsing, I had a few ideas on how the design could be improved. Would you like me to send them?",
];

// Real people must never be flagged, even when they mention the website or
// searching.
const PEOPLE = [
  "Im struggling with what i think are relationship OCD intrusive toughts for 20 years and need some help. I've tried counselling recently but it didn't help.",
  "Hi Owen! I’m at my wits end with looking at therapists and you’re the only one who I felt like I connected with on the entire website.",
  "I found you searching online for an ADHD therapist in Dublin. My GP suggested I look for someone.",
  "Looking for help with anxiety and panic attacks, ideally online in the evenings.",
  "",
  "I saw your website and would like to know if you have space for a new client in January.",
];

describe('waiting-list sales-pitch filter', () => {
  it.each(PITCHES)('flags pitch: %s', reason => {
    expect(looksLikeSalesPitch({ email: 'someone@gmail.com', reason })).toBe(true);
  });

  it.each(PEOPLE)('lets through: %s', reason => {
    expect(looksLikeSalesPitch({ email: 'someone@gmail.com', reason })).toBe(false);
  });

  it('flags the known throwaway domain even with a bland note', () => {
    expect(looksLikeSalesPitch({ email: 'x@jmailservice.com', reason: 'Hello there' })).toBe(true);
  });
});
