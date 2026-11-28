'use client';

// Desktop session panel (Sage Diary stage 2): opens on the right when a client
// is clicked on Today, so the diary stays in view. It shows where the session
// stands (reminder, payment, receipt) and offers what Owen does with it: Session
// done, send the reminder, mark paid, email the receipt, move or edit, open the
// client's page. It reuses the existing routes (mark-attended, mark-paid,
// send-receipt) and components (SessionDoneOptions, SendReminderModal); the
// session editor stays the existing SessionEditModal, opened from here.
//
// Nothing is emailed by opening this panel or by any one tap here except the
// buttons that say so ("Send receipt", and the reminder's own preview/confirm).
// Keyboard: focus moves in on open, Tab stays inside, Escape closes (the caller
// returns focus to the row).

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Bell, Receipt, Video, Wallet } from 'lucide-react';
import { PRACTICE } from '@/practice.config';
import { adminFetch, displayFee } from './api';
import { SessionDoneOptions, type SessionDoneChoice } from './SessionDoneOptions';
import { SendReminderModal } from './SendReminderModal';
import { IconChart, IconClose, IconDone, IconMail, IconMoney, IconMove } from './sage';
import { clockTime, dublinYmd, firstName, shortDay } from './desktopToday';
import type { ClientRow, SessionRow } from './types';

export type PanelOption = 'done' | 'paid' | 'receipt';

interface Props {
  session: SessionRow;
  client: ClientRow;
  /** Which option to open first (a row's quick action). */
  initialOption: PanelOption | null;
  onClose: () => void;
  /** Move or edit: the existing SessionEditModal. The panel closes first. */
  onEdit: () => void;
  onOpenClient: () => void;
  /** Refresh the dashboard data after a change. */
  onChanged: () => void;
}

// 24-hour, like the rest of Today ("Tue 24 Nov, 16:00").
const when = (iso: string) => new Date(iso).toLocaleString('en-IE', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  timeZone: 'Europe/Dublin',
});

function Opt({ id, icon, title, sub, open, onToggle, children, optRef }: {
  id: string; icon: ReactNode; title: string; sub: string; open: boolean;
  onToggle: () => void; children: ReactNode; optRef?: (el: HTMLButtonElement | null) => void;
}) {
  const bodyId = `${useId()}-${id}`;
  return (
    <div className={`dt-opt${open ? ' is-open' : ''}`}>
      <button type="button" className="dt-opt-head" aria-expanded={open} aria-controls={bodyId} onClick={onToggle} ref={optRef}>
        <span className="dt-opt-ic" aria-hidden>{icon}</span>
        <span className="dt-opt-txt"><b>{title}</b><span>{sub}</span></span>
      </button>
      <div className="dt-opt-body" id={bodyId} hidden={!open}>{children}</div>
    </div>
  );
}

export function SessionPanel({ session, client, initialOption, onClose, onEdit, onOpenClient, onChanged }: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const [openOpt, setOpenOpt] = useState<PanelOption | null>(initialOption);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const reminderTile = useRef<HTMLButtonElement>(null);

  const paid = session.payment_status === 'paid';
  const viaStripe = paid && Boolean(session.stripe_payment_intent_id);
  const scheduled = session.status === 'scheduled';
  const attended = session.status === 'attended';
  const lowCost = Boolean(client.is_low_cost);
  const online = session.session_format === 'online';
  const first = firstName(client.full_name);
  const firstReminder = session.session_reminders?.map(r => r.sent_at).sort()[0] ?? null;
  const upcoming = scheduled && new Date(session.session_date) > new Date(Date.now() - 60 * 60_000);
  const optedOut = Boolean(client.reminders_opted_out);

  // Focus: into the panel on open (the option a quick action asked for, else
  // the close button, as in the prototype).
  useEffect(() => {
    const target = initialOption ? optionRefs.current.get(initialOption) : null;
    (target ?? closeRef.current)?.focus();
    // once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes (unless the reminder pop-up above is open, which handles its
  // own); Tab stays inside the panel.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (reminderOpen) {
        // The reminder pop-up is on top: Escape closes just that, and focus comes back to its tile.
        if (e.key === 'Escape') { e.preventDefault(); setReminderOpen(false); window.setTimeout(() => reminderTile.current?.focus(), 0); }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current(); return; }
      if (e.key !== 'Tab') return;
      const els = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [])
        .filter(el => el.offsetParent !== null);
      if (els.length === 0) return;
      const firstEl = els[0], lastEl = els[els.length - 1];
      const active = document.activeElement;
      if (!panelRef.current?.contains(active)) { e.preventDefault(); firstEl.focus(); }
      else if (e.shiftKey && active === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && active === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reminderOpen]);

  const toggle = (o: PanelOption) => { setMsg(null); setOpenOpt(cur => (cur === o ? null : o)); };

  async function post(path: string, body: Record<string, unknown>) {
    const res = await adminFetch(path, { method: 'POST', body: JSON.stringify(body) });
    return { res, json: await res.json().catch(() => ({})) as Record<string, unknown> };
  }

  async function done(choice: SessionDoneChoice) {
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/mark-attended', { session_id: session.id, ...choice });
      if (!res.ok) { setMsg({ ok: false, text: (json.error as string) ?? 'That did not work. Nothing was changed.' }); return; }
      const parts = ['Marked attended'];
      if (choice.record_payment && json.paid) parts.push('payment recorded');
      if (json.receipt_sent) parts.push('receipt emailed');
      setMsg({ ok: true, text: parts.join(', ') + '.' });
      setOpenOpt(null);
      onChanged();
    } catch { setMsg({ ok: false, text: 'No connection. Nothing was changed.' }); }
    finally { setBusy(false); }
  }

  async function markPaid() {
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/mark-paid', { session_id: session.id });
      if (!res.ok) { setMsg({ ok: false, text: (json.error as string) ?? 'That did not work. Nothing was changed.' }); return; }
      setMsg({ ok: true, text: lowCost ? 'Cash payment recorded. No receipt was emailed.' : 'Marked paid. No receipt was emailed.' });
      setOpenOpt(null);
      onChanged();
    } catch { setMsg({ ok: false, text: 'No connection. Nothing was changed.' }); }
    finally { setBusy(false); }
  }

  async function sendReceipt(force = false): Promise<void> {
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/send-receipt', { session_id: session.id, force });
      if (res.status === 409 && typeof json.already_sent_at === 'string') {
        if (confirm(`A receipt for this session was already emailed on ${when(json.already_sent_at)}. Send it again?`)) {
          setBusy(false);
          return sendReceipt(true);
        }
        setMsg({ ok: false, text: 'Not sent: a receipt already went out.' });
        return;
      }
      if (!res.ok) { setMsg({ ok: false, text: (json.error as string) ?? 'The receipt could not be sent.' }); return; }
      setMsg({ ok: true, text: 'Receipt emailed.' });
      setOpenOpt(null);
      onChanged();
    } catch { setMsg({ ok: false, text: 'No connection. Nothing was sent.' }); }
    finally { setBusy(false); }
  }

  const local = `${dublinYmd(session.session_date)}T${clockTime(session.session_date)}`;
  const reg = useCallback((k: string) => (el: HTMLButtonElement | null) => {
    if (el) optionRefs.current.set(k, el); else optionRefs.current.delete(k);
  }, []);

  const reminderLine = optedOut
    ? 'Reminders are turned off for this client'
    : firstReminder ? `Reminder sent ${when(firstReminder)}`
      : upcoming ? 'No reminder sent yet' : 'No reminder was sent';

  return (
    <>
      <div className="dt-scrim" onClick={onClose} aria-hidden />
      <aside className="dt-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef}>
        <div className="dt-panel-head">
          <div>
            <h2 id={titleId} className="pii">{client.full_name}</h2>
            <p>{shortDay(local)}, {clockTime(session.session_date)} · {online ? 'Online' : 'In person'}</p>
          </div>
          <button type="button" className="dt-close" onClick={onClose} aria-label="Close" ref={closeRef}><IconClose /></button>
        </div>

        <div className="dt-panel-body">
          {msg && <p className={`dt-msg${msg.ok ? '' : ' is-error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}

          <section className="dt-opt dt-status" aria-label="Where this session stands">
            <ul>
              <li className={firstReminder ? 'is-ok' : ''}><Bell size={16} aria-hidden /> {reminderLine}</li>
              <li className={paid ? 'is-ok' : ''}>
                <Wallet size={16} aria-hidden /> {paid ? (viaStripe ? 'Paid by Stripe' : 'Paid') : `Not paid yet · ${displayFee(session.fee)}`}
              </li>
              {paid && (
                <li className={session.receipt_sent_at ? 'is-ok' : ''}>
                  <Receipt size={16} aria-hidden /> {session.receipt_sent_at ? `Receipt sent ${when(session.receipt_sent_at)}` : 'No receipt sent'}
                </li>
              )}
              {attended && <li className="is-ok"><IconDone /> Attended</li>}
              {online && PRACTICE.telehealthUrl && (
                <li><Video size={16} aria-hidden /> <a href={PRACTICE.telehealthUrl} target="_blank" rel="noopener noreferrer">Open video room</a></li>
              )}
            </ul>
          </section>

          <div className="dt-opt">
            <button type="button" className="dt-opt-head" onClick={onOpenClient}>
              <span className="dt-opt-ic" aria-hidden><IconChart /></span>
              <span className="dt-opt-txt"><b><span className="pii">{first}</span>&rsquo;s page</b><span>Progress, sessions and payments</span></span>
            </button>
          </div>

          {scheduled && (
            <Opt id="done" icon={<IconDone />} title="Session done" sub="Then choose payment and receipt"
              open={openOpt === 'done'} onToggle={() => toggle('done')} optRef={reg('done')}>
              <SessionDoneOptions variant="panel" session={session} client={client} busy={busy}
                onChoose={c => void done(c)} onCancel={() => setOpenOpt(null)} />
            </Opt>
          )}

          {upcoming && !optedOut && (
            <div className="dt-opt">
              <button type="button" className="dt-opt-head" ref={reminderTile} onClick={() => setReminderOpen(true)}>
                <span className="dt-opt-ic" aria-hidden><IconMail /></span>
                <span className="dt-opt-txt"><b>{firstReminder ? 'Resend reminder' : 'Send reminder'}</b><span>You see it before it&rsquo;s sent</span></span>
              </button>
            </div>
          )}

          {!paid && session.status !== 'cancelled' && (
            <Opt id="paid" icon={<IconMoney />} title={lowCost ? 'Cash received' : 'Mark as paid'} sub={`${displayFee(session.fee)} · no receipt is emailed`}
              open={openOpt === 'paid'} onToggle={() => toggle('paid')} optRef={reg('paid')}>
              <p className="dt-hint">{lowCost ? 'Records the cash you were given.' : 'Records that this session was paid.'} No email goes to <span className="pii">{first}</span>.</p>
              <button type="button" className="dt-btn is-main" disabled={busy} onClick={() => void markPaid()}>
                {busy ? 'Saving…' : lowCost ? 'Cash received' : 'Mark as paid'}
              </button>
            </Opt>
          )}

          {paid && (
            <Opt id="receipt" icon={<IconMail />} title={session.receipt_sent_at ? 'Resend receipt' : 'Email receipt'}
              sub={session.receipt_sent_at ? `Last sent ${when(session.receipt_sent_at)}` : 'Not sent yet'}
              open={openOpt === 'receipt'} onToggle={() => toggle('receipt')} optRef={reg('receipt')}>
              <p className="dt-hint">
                Email a receipt for {displayFee(session.fee)} to <span className="pii">{client.email}</span>?
              </p>
              <button type="button" className="dt-btn is-main" disabled={busy || !client.email} onClick={() => void sendReceipt()}>
                {busy ? 'Sending…' : session.receipt_sent_at ? 'Send it again' : 'Send receipt'}
              </button>
            </Opt>
          )}

          <div className="dt-opt">
            <button type="button" className="dt-opt-head" onClick={onEdit}>
              <span className="dt-opt-ic" aria-hidden><IconMove /></span>
              <span className="dt-opt-txt"><b>Move or edit</b><span>Opens the session editor</span></span>
            </button>
          </div>
        </div>
      </aside>

      {reminderOpen && (
        <SendReminderModal session={session} client={client}
        onClose={() => { setReminderOpen(false); window.setTimeout(() => reminderTile.current?.focus(), 0); }}
        onSessionChanged={onChanged} />
      )}
    </>
  );
}
