// "Did they pay?" prompt rules. Pure functions only (no database, no email) so
// the timing and eligibility rules are unit-tested. Used by the hourly cron
// (/api/admin/payment-prompts/run) and the dashboard list
// (/api/admin/payment-prompts).
//
// All instants are UTC; Dublin wall-clock is only used where a human sees it.

import { PRACTICE } from '@/practice.config';
import { localDublinToUtcIso } from '@/lib/dateUtils';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

/** Wait this long after a session ends before asking. */
export const PROMPT_AFTER_END_MINUTES = 15;
/** Only sessions that started within this many days are prompted (no backlog flood). */
export const PROMPT_WINDOW_DAYS = 7;
/** Stop asking after this many prompts for one session. */
export const MAX_PROMPTS_PER_SESSION = 5;
/** An unanswered prompt is repeated no sooner than this, so the hourly cron
 *  asks about the same session roughly once a day, not every hour. */
export const REPROMPT_GAP_HOURS = 18;
/** Emails only go out between these Dublin hours (08:00 inclusive, 22:00 exclusive). */
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 8;

export interface PromptSession {
  id: string;
  session_date: string;
  status: string;
  payment_status: string;
  fee: number | null;
}

export interface PromptRow {
  session_id: string;
  prompt_count: number;
  last_prompted_at?: string | null;
  snoozed_until: string | null;
  resolved_at: string | null;
}

export interface DueOptions {
  /** Dashboard list: also include snoozed prompts, ones at the 5-prompt cap and
   *  ones asked about recently. They are shown there, just not emailed again. */
  forDashboard?: boolean;
}

/**
 * Sessions that need a "Did they pay?" prompt right now.
 * Due when: ended at least 15 min ago; started within the last 7 days; status
 * scheduled or attended; unpaid; fee > 0; prompt not resolved; and the prompt
 * either doesn't exist yet or its snooze has passed. Stops after 5 prompts.
 */
export function sessionsNeedingPrompt<S extends PromptSession>(
  sessions: S[],
  prompts: PromptRow[],
  now: Date,
  opts: DueOptions = {},
): S[] {
  const byId = new Map(prompts.map(p => [p.session_id, p]));
  const nowMs = now.getTime();
  return sessions
    .filter(s => {
      const start = new Date(s.session_date).getTime();
      if (!Number.isFinite(start)) return false;
      const end = start + PRACTICE.sessionMinutes * MIN;
      if (end + PROMPT_AFTER_END_MINUTES * MIN > nowMs) return false;
      if (start < nowMs - PROMPT_WINDOW_DAYS * DAY) return false;
      if (s.status !== 'scheduled' && s.status !== 'attended') return false;
      if (s.payment_status !== 'unpaid') return false;
      if (!s.fee || s.fee <= 0) return false;
      const p = byId.get(s.id);
      if (!p) return true;
      if (p.resolved_at) return false;
      if (opts.forDashboard) return true;
      if (p.prompt_count >= MAX_PROMPTS_PER_SESSION) return false;
      if (p.snoozed_until) {
        // Snoozed: wait for it. Once it has passed the prompt is due again.
        return new Date(p.snoozed_until).getTime() <= nowMs;
      }
      if (p.last_prompted_at && nowMs - new Date(p.last_prompted_at).getTime() < REPROMPT_GAP_HOURS * 60 * MIN) return false;
      return true;
    })
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
}

/** Dublin wall-clock parts of an instant. */
function dublinParts(d: Date): { date: string; hour: number } {
  const date = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' }); // YYYY-MM-DD
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Dublin', hour: '2-digit', hour12: false,
  }).format(d)) % 24;
  return { date, hour };
}

/** 09:00 Europe/Dublin on the next calendar day, as a UTC instant. Correct across clock changes. */
export function nextMorning(now: Date): Date {
  const { date } = dublinParts(now);
  // Noon UTC on the Dublin date, plus a day, always lands on the next Dublin date
  // (Dublin is at most UTC+1), whatever the clock change does.
  const tomorrow = new Date(new Date(`${date}T12:00:00Z`).getTime() + DAY)
    .toISOString().slice(0, 10);
  return new Date(localDublinToUtcIso(`${tomorrow}T09:00`));
}

/** First name + last initial, e.g. "Aoife Example" -> "Aoife E." */
export function promptLabel(client: { full_name: string }): string {
  const parts = client.full_name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A client';
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  return `${parts[0]} ${last[0].toUpperCase()}.`;
}

/** True when emails may be sent: between 08:00 and 22:00 Dublin time. */
export function withinSendingHours(now: Date): boolean {
  const { hour } = dublinParts(now);
  return hour >= QUIET_END_HOUR && hour < QUIET_START_HOUR;
}

export type PromptChoice = 'paid_receipt' | 'paid_no_receipt' | 'remind_tomorrow';
export const PROMPT_CHOICES: readonly PromptChoice[] = ['paid_receipt', 'paid_no_receipt', 'remind_tomorrow'];
export function isPromptChoice(v: unknown): v is PromptChoice {
  return typeof v === 'string' && (PROMPT_CHOICES as readonly string[]).includes(v);
}
