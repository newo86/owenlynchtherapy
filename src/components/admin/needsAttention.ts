// The "Needs attention" counts the old dashboard showed, now compact notices
// inside "Needs a decision" (desktop Today and phone Today). Pure, so the rules
// are unit tested. Only notices with a count above zero are returned.
//
//  - unpaid: past sessions not marked paid and OLDER than the "Did they pay?"
//    window (the newer ones already get a prompt, so counting them twice would
//    just be noise).
//  - receipts: past sessions that are paid but whose receipt was never emailed.
//  - forms: intake forms sent, not returned, still valid.
//  - unlinked: Google Calendar events that match no client session.
import { PROMPT_WINDOW_DAYS } from '@/lib/paymentPrompts';
import { dedupeSessions, displayFee, isSameDay } from './api';
import type { CalendarEvent, ClientRow, TokenRow } from './types';

export type AttentionKey = 'unpaid' | 'receipts' | 'forms' | 'unlinked';

export interface AttentionNotice {
  key: AttentionKey;
  count: number;
  /** One short sentence, no em dashes. */
  line: string;
  hint: string;
  /** Button label (the place it leads to). */
  action: string;
}

/** Sessions before this date predate proper payment tracking (as on Money). */
const FLOOR = new Date('2026-06-01');
const DAY = 86_400_000;

/** Calendar events that match no client session: not linked by id, and no session on the
 *  same day within 30 minutes (or naming the client's first name). All-day and "free"
 *  events never are sessions, so they are left out. */
export function unlinkedEvents(clients: ClientRow[], events: CalendarEvent[]): CalendarEvent[] {
  const linkedIds = new Set<string>();
  const sessions: Array<{ date: Date; first: string }> = [];
  for (const c of clients) {
    for (const s of c.sessions) {
      if (s.status === 'cancelled') continue;
      if (s.gcal_event_id) linkedIds.add(s.gcal_event_id);
      sessions.push({ date: new Date(s.session_date), first: c.full_name.toLowerCase().split(' ')[0] });
    }
  }
  return events.filter(e => {
    if (e.allDay || e.free) return false;
    if (linkedIds.has(e.id)) return false;
    const eStart = new Date(e.start);
    const looksLinked = sessions.some(s =>
      isSameDay(s.date, eStart)
      && (Math.abs(s.date.getTime() - eStart.getTime()) < 30 * 60 * 1000
        || (e.title ?? '').toLowerCase().includes(s.first)),
    );
    return !looksLinked;
  });
}

export function attentionNotices(
  clients: ClientRow[], tokens: TokenRow[], events: CalendarEvent[], now: Date,
): AttentionNotice[] {
  const all = clients.flatMap(c => dedupeSessions(c.sessions));
  const nowMs = now.getTime();
  const past = all.filter(s => s.status !== 'cancelled' && new Date(s.session_date).getTime() <= nowMs && new Date(s.session_date) >= FLOOR);

  const unpaid = past.filter(s =>
    s.payment_status !== 'paid' && s.payment_status !== 'refunded'
    && new Date(s.session_date).getTime() < nowMs - PROMPT_WINDOW_DAYS * DAY);
  const unpaidCents = unpaid.reduce((n, s) => n + (s.fee ?? 0), 0);

  const receipts = past.filter(s => s.payment_status === 'paid' && !s.receipt_sent_at);
  const forms = tokens.filter(t => !t.is_used && new Date(t.expires_at) > now);
  const unlinked = unlinkedEvents(clients, events);

  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const out: AttentionNotice[] = [];
  if (unpaid.length > 0) out.push({
    key: 'unpaid', count: unpaid.length, action: 'Open Money',
    line: `${unpaid.length} past ${plural(unpaid.length, 'session', 'sessions')} not marked paid.`,
    hint: `${displayFee(unpaidCents)} in all · older than a week, so no prompt is coming`,
  });
  if (receipts.length > 0) out.push({
    key: 'receipts', count: receipts.length, action: 'Review',
    line: `${receipts.length} paid ${plural(receipts.length, 'session', 'sessions')} without a receipt sent.`,
    hint: 'Nothing is emailed until you choose to',
  });
  if (forms.length > 0) out.push({
    key: 'forms', count: forms.length, action: 'Open Forms',
    line: `${forms.length} intake ${plural(forms.length, 'form', 'forms')} sent, not returned yet.`,
    hint: 'The link stays valid for a week',
  });
  if (unlinked.length > 0) out.push({
    key: 'unlinked', count: unlinked.length, action: 'Open Calendar',
    line: `${unlinked.length} Google Calendar ${plural(unlinked.length, 'event', 'events')} not linked to a client.`,
    hint: 'Link them to a client, or leave them as they are',
  });
  return out;
}
