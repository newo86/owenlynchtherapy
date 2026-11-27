'use client';

// "Did they pay?" card. Purely presentational: it takes the open prompts and
// reports the practitioner's choice, so it can render with fake data (see the
// dev-only /admin-demo page). Fetching and saving live in PaymentPromptsPanel.
// Nothing here emails anyone: "Paid - email receipt" first asks for an explicit
// confirmation that names the amount, date, client and address.

import { useEffect, useRef, useState } from 'react';
import { displayFee } from './api';

export type PaymentChoice = 'paid_receipt' | 'paid_no_receipt' | 'remind_tomorrow';

export interface PaymentPromptItem {
  session_id: string;
  /** UTC ISO instant. */
  session_date: string;
  /** cents */
  fee: number;
  /** "Aoife E." */
  label: string;
  client_name: string;
  client_email: string | null;
  receipt_sent_at: string | null;
  snoozed: boolean;
}

export interface PendingChoice { sessionId: string; choice: PaymentChoice }

interface Props {
  prompts: PaymentPromptItem[];
  /** Called only after any needed confirmation. */
  onChoose: (sessionId: string, choice: PaymentChoice) => void;
  /** Session id currently being saved, if any. */
  busy?: string | null;
  /** Open this confirmation on first render (email link / demo). */
  initialConfirm?: PendingChoice | null;
}

/** "Tue 2 Dec, 4:00pm" in Dublin time. */
export function promptWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' }).replace(',', '');
  const time = d.toLocaleTimeString('en-IE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin' })
    .replace(/\s/g, '').toLowerCase();
  return `${day}, ${time}`;
}
/** "Tue 2 Dec" */
function promptDay(iso: string): string {
  return promptWhen(iso).split(',')[0];
}

export function PaymentPromptsCard({ prompts, onChoose, busy = null, initialConfirm = null }: Props) {
  const [confirm, setConfirm] = useState<PendingChoice | null>(initialConfirm);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  // Arriving from the email link: bring that row into view once.
  const focusId = initialConfirm?.sessionId;
  useEffect(() => {
    if (!focusId) return;
    rowRefs.current.get(focusId)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [focusId]);

  if (prompts.length === 0) return null;

  return (
    <section className="admin-card pp-card" aria-labelledby="pp-heading">
      <div className="admin-card-head">
        <h2 className="admin-h2" id="pp-heading">Did they pay?</h2>
      </div>
      <p className="pp-note">Most clients pay by transfer, which only you can see. Nothing is sent to anyone unless you confirm it.</p>
      <ul className="pp-list">
        {prompts.map(p => {
          const open = confirm?.sessionId === p.session_id ? confirm.choice : null;
          const isBusy = busy === p.session_id;
          const amount = displayFee(p.fee);
          const day = promptDay(p.session_date);
          const canReceipt = !p.receipt_sent_at;
          return (
            <li
              key={p.session_id}
              id={`payprompt-${p.session_id}`}
              className="pp-row"
              ref={el => { if (el) rowRefs.current.set(p.session_id, el); else rowRefs.current.delete(p.session_id); }}
            >
              <div className="pp-line">
                <span className="pp-who pii">{p.label}</span>
                <span className="pp-when">{promptWhen(p.session_date)}</span>
                <span className="pp-amount">{amount}</span>
                {p.snoozed && <span className="pp-snoozed">Reminding you tomorrow</span>}
              </div>

              {open === null ? (
                <div className="pp-actions" role="group" aria-label={`Did ${p.label} pay for ${promptWhen(p.session_date)}?`}>
                  {canReceipt && (
                    <button type="button" className="admin-btn-primary pp-btn" disabled={isBusy}
                      aria-label={`Paid, email receipt: ${p.label}, ${day}, ${amount}`}
                      onClick={() => setConfirm({ sessionId: p.session_id, choice: 'paid_receipt' })}>
                      Paid – email receipt
                    </button>
                  )}
                  <button type="button" className="admin-btn-secondary pp-btn" disabled={isBusy}
                    aria-label={`Paid, no receipt: ${p.label}, ${day}, ${amount}`}
                    onClick={() => setConfirm({ sessionId: p.session_id, choice: 'paid_no_receipt' })}>
                    Paid – no receipt
                  </button>
                  <button type="button" className="admin-btn-secondary pp-btn" disabled={isBusy}
                    aria-label={`Not yet, remind me tomorrow: ${p.label}, ${day}`}
                    onClick={() => setConfirm({ sessionId: p.session_id, choice: 'remind_tomorrow' })}>
                    Not yet – remind me tomorrow
                  </button>
                </div>
              ) : (
                <div className="pp-confirm" role="alertdialog" aria-label="Confirm your choice">
                  <p className="pp-confirm-text">
                    {open === 'paid_receipt' && (
                      p.client_email
                        ? <>Email a receipt for {amount} ({day}) to <span className="pii">{p.client_name}</span> at <span className="pii">{p.client_email}</span>?</>
                        : <>There&apos;s no email address for <span className="pii">{p.client_name}</span>, so a receipt can&apos;t be sent. Mark it as paid without one instead.</>
                    )}
                    {open === 'paid_no_receipt' && <>Mark {amount} ({day}) as paid by <span className="pii">{p.client_name}</span>? No receipt will be sent.</>}
                    {open === 'remind_tomorrow' && <>Ask you again about <span className="pii">{p.label}</span>&apos;s {day} session tomorrow morning?</>}
                  </p>
                  <div className="pp-actions">
                    {!(open === 'paid_receipt' && !p.client_email) && (
                      <button type="button" className="admin-btn-primary pp-btn" disabled={isBusy}
                        onClick={() => { setConfirm(null); onChoose(p.session_id, open); }}>
                        {open === 'paid_receipt' ? 'Send receipt' : open === 'paid_no_receipt' ? 'Mark paid' : 'Remind me tomorrow'}
                      </button>
                    )}
                    <button type="button" className="admin-btn-secondary pp-btn" disabled={isBusy}
                      onClick={() => setConfirm(null)}>
                      Back
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
