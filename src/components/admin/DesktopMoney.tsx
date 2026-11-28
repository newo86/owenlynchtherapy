'use client';

// Desktop Money (Sage Diary), built to the prototype's `money()` view: three
// numbers, "Not paid yet" rows with Mark paid (opens the session panel on the
// payment), and "How people paid". Methods come from the sessions themselves:
// Stripe when a card payment is recorded, Cash for low-cost clients, anything
// else is a bank transfer or similar (what the payments ledger calls
// "manual"). There is no year-statement PDF in the app (statements are per
// client, on each client's record), so the right column points to the
// existing income report and accountant CSV, which stay in full underneath
// together with the monthly chart and the Revolut statement import.

import { useMemo, useState, type ReactNode } from 'react';
import { dedupeSessions } from './api';
import { DesktopPage } from './DesktopPage';
import { DtDisclosure } from './DtDisclosure';
import { clockTime, dublinYmd, shortDay } from './desktopToday';
import type { PanelOption } from './SessionPanel';
import type { ClientRow, SessionRow } from './types';

interface Props {
  clients: ClientRow[];
  onOpenPanel: (sessionId: string, option?: PanelOption | null) => void;
  /** The existing Revenue page and statement import, kept under the summary. */
  fullMoney: ReactNode;
}

// Sessions before this date predate proper payment tracking (as in Revenue).
const OUTSTANDING_FLOOR = new Date('2026-06-01');
const FIRST_ROWS = 6;

/** Whole euros with a thousands separator: €1,140. */
const eur = (cents: number) => `€${Math.round(cents / 100).toLocaleString('en-IE')}`;
const monthOf = (iso: string) => dublinYmd(iso).slice(0, 7);

export function DesktopMoney({ clients, onOpenPanel, fullMoney }: Props) {
  const [showAll, setShowAll] = useState(false);
  const now = new Date();
  const thisMonth = dublinYmd(now.toISOString()).slice(0, 7);
  const monthName = now.toLocaleDateString('en-IE', { month: 'long', timeZone: 'Europe/Dublin' });

  const all = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    for (const c of clients) for (const s of dedupeSessions(c.sessions)) if (s.status !== 'cancelled') out.push({ s, c });
    return out;
  }, [clients]);

  const paidNow = all.filter(({ s }) => s.payment_status === 'paid' && monthOf(s.session_date) === thisMonth);
  const paidCents = paidNow.reduce((n, { s }) => n + (s.fee ?? 0), 0);
  const unpaid = all
    .filter(({ s }) => s.payment_status !== 'paid' && s.payment_status !== 'refunded'
      && new Date(s.session_date) <= now && new Date(s.session_date) >= OUTSTANDING_FLOOR)
    .sort((a, b) => new Date(b.s.session_date).getTime() - new Date(a.s.session_date).getTime());
  const unpaidCents = unpaid.reduce((n, { s }) => n + (s.fee ?? 0), 0);

  const methods = [
    { label: 'Cash', cents: paidNow.filter(({ s, c }) => !s.stripe_payment_intent_id && c.is_low_cost).reduce((n, { s }) => n + s.fee, 0) },
    { label: 'Card (Stripe)', cents: paidNow.filter(({ s }) => s.stripe_payment_intent_id).reduce((n, { s }) => n + s.fee, 0) },
    { label: 'Revolut or bank transfer', cents: paidNow.filter(({ s, c }) => !s.stripe_payment_intent_id && !c.is_low_cost).reduce((n, { s }) => n + s.fee, 0) },
  ].filter(m => m.cents > 0);
  const total = methods.reduce((n, m) => n + m.cents, 0) || 1;
  const rows = showAll ? unpaid : unpaid.slice(0, FIRST_ROWS);

  const openDetail = () => {
    const el = document.getElementById('money-detail') as HTMLDetailsElement | null;
    if (!el) return;
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.querySelector<HTMLElement>('summary')?.focus();
  };

  return (
    <DesktopPage title="Money" subtitle={`${monthName} so far`}>
      <div className="dt-stack">
        <div className="dt-stats">
          <div className="dt-stat"><b>{eur(paidCents)}</b><span>Paid</span></div>
          <div className="dt-stat"><b>{eur(unpaidCents)}</b><span>Not paid yet</span></div>
          <div className="dt-stat"><b>{paidNow.length}</b><span>Sessions paid</span></div>
        </div>

        <div className="dt-cols dt-cols-money">
          <div className="dt-group">
            <h2 className="dt-h">Not paid yet</h2>
            <div className="dt-card">
              {unpaid.length === 0 && <p className="dt-hint dt-empty">Everything is paid.</p>}
              {rows.map(({ s, c }) => (
                <div key={s.id} className="dt-lrow dt-lrow-static">
                  <div className="dt-grow">
                    <b className="pii">{c.full_name}</b>
                    <div className="dt-soft">{shortDay(dublinYmd(s.session_date))}, {clockTime(s.session_date)}</div>
                  </div>
                  <span className="dt-amt">{eur(s.fee)}</span>
                  <button type="button" className="dt-btn" aria-label={`Mark paid: ${c.full_name}, ${shortDay(dublinYmd(s.session_date))}`}
                    onClick={() => onOpenPanel(s.id, 'paid')}>
                    Mark paid
                  </button>
                </div>
              ))}
            </div>
            {unpaid.length > FIRST_ROWS && (
              <button type="button" className="dt-link" aria-expanded={showAll} onClick={() => setShowAll(a => !a)}>
                {showAll ? 'Show fewer' : `Show all (${unpaid.length})`}
              </button>
            )}
          </div>

          <div className="dt-stack">
            <div className="dt-group">
              <h2 className="dt-h">How people paid <small>{monthName}</small></h2>
              <div className="dt-card dt-pad">
                {methods.length === 0 && <p className="dt-hint">Nothing paid yet this month.</p>}
                {methods.map(m => (
                  <div key={m.label}>
                    <div className="dt-bar-row"><span>{m.label}</span><b className="dt-amt">{eur(m.cents)}</b></div>
                    <div className="dt-bar" role="img" aria-label={`${m.label}: ${Math.round((m.cents / total) * 100)}% of what was paid`}>
                      <i style={{ width: `${(m.cents / total) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <button type="button" className="dt-btn" onClick={openDetail}>Income report and accountant CSV</button>
            </div>
          </div>
        </div>

        <DtDisclosure id="money-detail" title="Income report, monthly chart and statement import"
          sub="The full income report, the CSV for your accountant, the weekly report email and the Revolut statement import">
          {fullMoney}
        </DtDisclosure>
      </div>
    </DesktopPage>
  );
}
