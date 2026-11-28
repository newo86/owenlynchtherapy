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
import { createPortal } from 'react-dom';
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
  /** Desktop "Needs a decision": no card of its own, a smaller heading. */
  bare?: boolean;
  /** Desktop: open the session panel for a prompt's session. */
  onOpenSession?: (sessionId: string) => void;
  /** Desktop: show at most this many prompts. */
  limit?: number;
}

/** "Tue 2 Dec, 16:00" in Dublin time (same text on server and browser). */
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

/** Bottom sheet (phone): same pattern as the booking sheet. Rendered into
 *  .admin-root (not inside the card, whose backdrop-filter would trap a
 *  position:fixed child), and only after mount. Focus moves in, Tab is kept
 *  inside, Escape closes. */
function PromptSheet({ p, root, onClose, children }: { p: PaymentPromptItem; root: Element; onClose: () => void; children: React.ReactNode }) {
  const sheet = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });
  useEffect(() => {
    const focusables = () => Array.from(sheet.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    // A deep link opens straight on the confirm step, which has already taken focus.
    if (!sheet.current?.contains(document.activeElement)) {
      (sheet.current?.querySelector<HTMLElement>('[data-choice]') ?? focusables()[0])?.focus();
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0], last = els[els.length - 1];
      const active = document.activeElement;
      if (!sheet.current?.contains(active)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, []);
  const titleId = `pp-sheet-${p.session_id}`;
  return createPortal(
    <div className="m-scrim" onClick={onClose}>
      <div className="m-sheet" ref={sheet} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()}>
        <div className="m-sheet-head">
          <h2 className="admin-h2" id={titleId}>Did they pay?</h2>
          <button type="button" className="m-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <p className="pp-sheet-who"><span className="pii">{p.label}</span> · {formatShortWhen(p.session_date)}</p>
        {children}
      </div>
    </div>,
    root,
  );
}

export function PaymentPromptsCard({ prompts, onChoose, busy = null, initialConfirm = null, compact = false, bare = false, onOpenSession, limit }: Props) {
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
  const sectionRef = useRef<HTMLElement>(null);
  const refocus = useRef<string | null>(null);
  // Where the sheet is portalled; known only after mount.
  const [sheetRoot, setSheetRoot] = useState<Element | null>(null);
  useEffect(() => {
    setSheetRoot(sectionRef.current?.closest('.admin-root') ?? document.body);
  }, []);

  // Arriving from the email link: bring that row into view once.
  const focusId = initialConfirm?.sessionId;
  useEffect(() => {
    if (!focusId) return;
    rowRefs.current.get(focusId)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [focusId]);

  // Back from a "Not yet" confirm returns focus to that notice's link.
  useEffect(() => {
    if (confirm === null && refocus.current) {
      const id = refocus.current; refocus.current = null;
      window.setTimeout(() => document.querySelector<HTMLElement>(`[data-notice-link="${id}"]`)?.focus(), 0);
    }
  }, [confirm]);

  if (prompts.length === 0) return null;
  // A prompt that is open for confirming (e.g. from the email link) always shows.
  const shownPrompts = limit === undefined ? prompts : prompts.filter((p, i) => i < limit || p.session_id === confirm?.sessionId);

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
    <section ref={sectionRef} className={bare ? 'pp-card is-bare' : 'admin-card pp-card'}
      aria-labelledby={bare ? undefined : 'pp-heading'} aria-label={bare ? 'Did they pay?' : undefined}>
      {bare ? null : (
        <div className="admin-card-head">
          <h2 className="admin-h2" id="pp-heading">Did they pay?</h2>
        </div>
      )}
      {!bare && <p className="pp-note">Bank transfers don&apos;t show up here, so tick them off yourself. Nothing is sent to anyone unless you confirm.</p>}
      <ul className="pp-list">
        {shownPrompts.map(p => (bare && confirm?.sessionId !== p.session_id && !p.receipt_failed && onOpenSession ? (
          <li key={p.session_id} id={`payprompt-${p.session_id}`} className="pp-row is-notice"
            ref={el => { if (el) rowRefs.current.set(p.session_id, el); else rowRefs.current.delete(p.session_id); }}>
            <span className="dt-ndot" aria-hidden />
            <div className="dt-notice-body">
              <p className="dt-notice-line"><b className="pii">{p.label}</b> hasn&apos;t paid for {formatShortDay(p.session_date)}.</p>
              <p className="dt-notice-hint">{displayFee(p.fee)} · reminders don&apos;t chase payment{p.snoozed ? ' · Reminding you tomorrow' : ''}</p>
              {busy === p.session_id ? <p className="pp-saving" role="status">Saving…</p> : (
                <div className="dt-notice-actions">
                  <button type="button" className="dt-btn" aria-label={`Open session: ${p.label}, ${formatShortDay(p.session_date)}`}
                    onClick={() => onOpenSession(p.session_id)}>Open session</button>
                  <button type="button" className="dt-link" data-notice-link={p.session_id}
                    aria-label={`Ask me tomorrow: ${p.label}, ${formatShortDay(p.session_date)}`}
                    onClick={() => { refocus.current = p.session_id; setConfirm({ sessionId: p.session_id, choice: 'remind_tomorrow' }); }}>
                    Ask me tomorrow
                  </button>
                </div>
              )}
            </div>
          </li>
        ) : (
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
                  <span className="pp-when">&nbsp;· {formatShortWhen(p.session_date)}</span>
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
        )))}
      </ul>
      {compact && sheetPrompt && sheetRoot && (
        <PromptSheet p={sheetPrompt} root={sheetRoot} onClose={closeSheet}>
          {actionsFor(sheetPrompt)}
        </PromptSheet>
      )}
    </section>
  );
}
