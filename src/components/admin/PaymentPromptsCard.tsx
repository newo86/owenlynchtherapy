'use client';

// "Did they pay?" card. Purely presentational: it takes the open prompts and
// reports the practitioner's choice, so it can render with fake data (see the
// dev-only /admin-demo page). Fetching and saving live in PaymentPromptsPanel.
// Nothing here emails anyone: "Paid, email receipt" first asks for an explicit
// confirmation that names the amount, date, client and address.
//
// Desktop: each row carries the three choices. Phone (`compact`): each row is
// one line plus one "Did they pay?" button that opens a bottom sheet holding
// the choices and the confirm step. The amount only appears in the confirm.

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { formatShortWhen, formatShortDay } from '@/lib/dateUtils';
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
  /** Already marked paid and a receipt was asked for, but it didn't go out. */
  receipt_failed?: boolean;
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
  /** Phone layout: one compact line per prompt, choices in a bottom sheet. */
  compact?: boolean;
}

/** "Tue 2 Dec, 4:00pm" in Dublin time (same text on server and browser). */
export const promptWhen = formatShortWhen;

const canReceiptFor = (p: PaymentPromptItem) => !p.receipt_sent_at && !!p.client_email;

/** The confirmation a deep link should open, or null for none. A link asking
 *  for a receipt that already went opens "paid, no receipt" instead. */
function effectiveChoice(p: PaymentPromptItem, choice: PaymentChoice): PaymentChoice | null {
  if (p.receipt_failed) return choice === 'paid_receipt' && canReceiptFor({ ...p, receipt_sent_at: null }) ? 'paid_receipt' : null;
  if (choice !== 'paid_receipt') return choice;
  if (p.receipt_sent_at) return 'paid_no_receipt';
  return p.client_email ? 'paid_receipt' : null;
}

interface ActionsProps {
  p: PaymentPromptItem;
  open: PaymentChoice | null;
  isBusy: boolean;
  onOpen: (c: PaymentChoice) => void;
  onBack: () => void;
  onConfirm: (c: PaymentChoice) => void;
}

/** The three choices, or the confirm step once one is picked. */
function PromptActions({ p, open, isBusy, onOpen, onBack, onConfirm }: ActionsProps) {
  const amount = displayFee(p.fee);
  const day = formatShortDay(p.session_date);
  const canReceipt = canReceiptFor(p);
  const wrap = useRef<HTMLDivElement>(null);
  const lastOpener = useRef<string | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);
  const restore = useRef<string | null>(null);
  const textId = `pp-confirm-${p.session_id}`;

  // Opening the confirm moves focus into it; Back returns it to the button
  // that opened it.
  useEffect(() => {
    if (open) { confirmBtn.current?.focus(); return; }
    if (restore.current) {
      const keys = [restore.current, 'paid_receipt', 'paid_no_receipt', 'remind_tomorrow'];
      for (const k of keys) {
        const el = wrap.current?.querySelector<HTMLButtonElement>(`[data-choice="${k}"]`);
        if (el) { el.focus(); break; }
      }
      restore.current = null;
    }
  }, [open]);

  if (isBusy) {
    return <p className="pp-saving" role="status">Saving…</p>;
  }

  const pick = (choice: PaymentChoice) => { lastOpener.current = choice; onOpen(choice); };

  if (open === null) {
    const quiet = !p.receipt_sent_at && !p.client_email;
    return (
      <div ref={wrap}>
        <div className="pp-actions" role="group" aria-label={`Did ${p.label} pay for ${formatShortWhen(p.session_date)}?`}>
          {p.receipt_failed ? (
            canReceipt && (
              <button type="button" data-choice="paid_receipt" className="admin-btn-secondary pp-btn"
                aria-label={`Send receipt: ${p.label}, ${day}, ${amount}`}
                onClick={() => pick('paid_receipt')}>
                Send receipt
              </button>
            )
          ) : (
            <>
              {canReceipt && (
                <button type="button" data-choice="paid_receipt" className="admin-btn-secondary pp-btn"
                  aria-label={`Paid, email receipt: ${p.label}, ${day}, ${amount}`}
                  onClick={() => pick('paid_receipt')}>
                  Paid, email receipt
                </button>
              )}
              <button type="button" data-choice="paid_no_receipt" className="admin-btn-secondary pp-btn"
                aria-label={`Paid, no receipt: ${p.label}, ${day}, ${amount}`}
                onClick={() => pick('paid_no_receipt')}>
                Paid, no receipt
              </button>
              <button type="button" data-choice="remind_tomorrow" className="admin-btn-secondary pp-btn"
                aria-label={`Not yet, ask me tomorrow: ${p.label}, ${day}`}
                onClick={() => pick('remind_tomorrow')}>
                Not yet, ask me tomorrow
              </button>
            </>
          )}
        </div>
        {quiet && <p className="pp-quiet">No email address on file, so no receipt can be sent.</p>}
      </div>
    );
  }

  const confirmLabel = open === 'paid_receipt' ? 'Send receipt' : open === 'paid_no_receipt' ? 'Mark paid' : 'Ask me tomorrow';
  return (
    <div className="pp-confirm" role="group" aria-labelledby={textId}>
      <p className="pp-confirm-text" id={textId}>
        {open === 'paid_receipt' && <>Email a receipt for {amount} ({day}) to <span className="pii">{p.client_name}</span> at <span className="pii">{p.client_email}</span>?</>}
        {open === 'paid_no_receipt' && (
          <>
            Mark {amount} ({day}) as paid by <span className="pii">{p.client_name}</span>? No receipt will be sent.
            {p.receipt_sent_at && <> A receipt already went on {formatShortDay(p.receipt_sent_at)}.</>}
          </>
        )}
        {open === 'remind_tomorrow' && <>Ask you again about <span className="pii">{p.label}</span>&apos;s {day} session tomorrow morning?</>}
      </p>
      <div className="pp-actions">
        <button type="button" ref={confirmBtn} className="admin-btn-primary pp-btn" disabled={isBusy}
          onClick={() => onConfirm(open)}>
          {confirmLabel}
        </button>
        <button type="button" className="admin-btn-secondary pp-btn" disabled={isBusy}
          onClick={() => { restore.current = lastOpener.current ?? open; onBack(); }}>
          Back
        </button>
      </div>
    </div>
  );
}

/** Bottom sheet (phone): same pattern as the booking sheet. */
function PromptSheet({ p, onClose, children }: { p: PaymentPromptItem; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const titleId = `pp-sheet-${p.session_id}`;
  return (
    <div className="m-scrim" onClick={onClose}>
      <div className="m-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()}>
        <div className="m-sheet-head">
          <h2 className="admin-h2" id={titleId}>Did they pay?</h2>
          <button type="button" className="m-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <p className="pp-sheet-who"><span className="pii">{p.label}</span> · {formatShortWhen(p.session_date)}</p>
        {children}
      </div>
    </div>
  );
}

export function PaymentPromptsCard({ prompts, onChoose, busy = null, initialConfirm = null, compact = false }: Props) {
  const [confirm, setConfirm] = useState<PendingChoice | null>(() => {
    if (!initialConfirm) return null;
    const p = prompts.find(x => x.session_id === initialConfirm.sessionId);
    const choice = p ? effectiveChoice(p, initialConfirm.choice) : null;
    return choice ? { sessionId: initialConfirm.sessionId, choice } : null;
  });
  // Phone: which prompt's sheet is open (a deep link opens its confirm directly).
  const [sheetId, setSheetId] = useState<string | null>(compact ? confirm?.sessionId ?? null : null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const sheetOpener = useRef<HTMLButtonElement | null>(null);

  // Arriving from the email link: bring that row into view once.
  const focusId = initialConfirm?.sessionId;
  useEffect(() => {
    if (!focusId) return;
    rowRefs.current.get(focusId)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [focusId]);

  if (prompts.length === 0) return null;

  const closeSheet = () => {
    setSheetId(null); setConfirm(null);
    window.setTimeout(() => sheetOpener.current?.focus(), 0);
  };

  const actionsFor = (p: PaymentPromptItem) => (
    <PromptActions
      p={p}
      open={confirm?.sessionId === p.session_id ? confirm.choice : null}
      isBusy={busy === p.session_id}
      onOpen={choice => setConfirm({ sessionId: p.session_id, choice })}
      onBack={() => setConfirm(null)}
      onConfirm={choice => {
        setConfirm(null); setSheetId(null);
        onChoose(p.session_id, choice);
      }}
    />
  );

  const sheetPrompt = sheetId ? prompts.find(p => p.session_id === sheetId) : undefined;

  return (
    <section className="admin-card pp-card" aria-labelledby="pp-heading">
      <div className="admin-card-head">
        <h2 className="admin-h2" id="pp-heading">Did they pay?</h2>
      </div>
      <p className="pp-note">Bank transfers don&apos;t show up here, so tick them off yourself. Nothing is sent to anyone unless you confirm.</p>
      <ul className="pp-list">
        {prompts.map(p => (
          <li
            key={p.session_id}
            id={`payprompt-${p.session_id}`}
            className={`pp-row${compact ? ' is-compact' : ''}`}
            ref={el => { if (el) rowRefs.current.set(p.session_id, el); else rowRefs.current.delete(p.session_id); }}
          >
            {compact ? (
              <div className="pp-compact-line">
                <div className="pp-compact-text">
                  <span className="pp-who pii">{p.label}</span>
                  <span className="pp-when"> · {formatShortWhen(p.session_date)}</span>
                  {p.snoozed && <span className="pp-snoozed">Reminding you tomorrow</span>}
                  {p.receipt_failed && <span className="pp-failed">Receipt not sent</span>}
                </div>
                {busy === p.session_id ? (
                  <p className="pp-saving" role="status">Saving…</p>
                ) : (
                  <button type="button" className="admin-btn-secondary pp-btn pp-open"
                    onClick={e => { sheetOpener.current = e.currentTarget; setSheetId(p.session_id); }}>
                    {p.receipt_failed ? 'Send receipt' : 'Did they pay?'}
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="pp-line">
                  <span className="pp-who pii">{p.label}</span>
                  <span className="pp-when">{formatShortWhen(p.session_date)}</span>
                  <span className="pp-amount">{displayFee(p.fee)}</span>
                  {p.snoozed && <span className="pp-snoozed">Reminding you tomorrow</span>}
                  {p.receipt_failed && <span className="pp-failed">Receipt not sent</span>}
                </div>
                {actionsFor(p)}
              </>
            )}
          </li>
        ))}
      </ul>
      {compact && sheetPrompt && (
        <PromptSheet p={sheetPrompt} onClose={closeSheet}>
          {actionsFor(sheetPrompt)}
        </PromptSheet>
      )}
    </section>
  );
}
