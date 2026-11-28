// What the Money screens show (desktop page and phone sub-page): this month's
// paid total, what is still unpaid, and how people paid. Pure, so both layouts
// agree and it is tested.
import { dedupeSessions } from './api';
import { dublinYmd } from './desktopToday';
import { paidByMethod } from './paymentMethods';
import type { ClientRow, SessionRow } from './types';

/** Sessions before this date predate proper payment tracking (as in Revenue). */
export const OUTSTANDING_FLOOR = new Date('2026-06-01');

export interface MoneySummary {
  paidNow: Array<{ s: SessionRow; c: ClientRow }>;
  paidCents: number;
  /** Past, unpaid, not cancelled or refunded; newest first. */
  unpaid: Array<{ s: SessionRow; c: ClientRow }>;
  unpaidCents: number;
  methods: ReturnType<typeof paidByMethod>;
}

export function moneySummary(clients: ClientRow[], now: Date): MoneySummary {
  const thisMonth = dublinYmd(now.toISOString()).slice(0, 7);
  const all: Array<{ s: SessionRow; c: ClientRow }> = [];
  for (const c of clients) for (const s of dedupeSessions(c.sessions)) if (s.status !== 'cancelled') all.push({ s, c });

  const paidNow = all.filter(({ s }) => s.payment_status === 'paid' && dublinYmd(s.session_date).slice(0, 7) === thisMonth);
  const unpaid = all
    .filter(({ s }) => s.payment_status !== 'paid' && s.payment_status !== 'refunded'
      && new Date(s.session_date) <= now && new Date(s.session_date) >= OUTSTANDING_FLOOR)
    .sort((a, b) => new Date(b.s.session_date).getTime() - new Date(a.s.session_date).getTime());
  return {
    paidNow,
    paidCents: paidNow.reduce((n, { s }) => n + (s.fee ?? 0), 0),
    unpaid,
    unpaidCents: unpaid.reduce((n, { s }) => n + (s.fee ?? 0), 0),
    methods: paidByMethod(paidNow),
  };
}
