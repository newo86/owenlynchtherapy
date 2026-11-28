'use client';

// The full-screen session page (prototype modal): opens when a client is tapped
// or a swipe action is chosen. It reuses the existing routes and components:
// sessions/update (move), questionnaires/send (forms), mark-paid and
// mark-attended (with how they paid), SendReminderModal (its own preview and
// confirm), send-receipt, sessions/delete (the record is kept, status cancelled).
// Every email to a client waits for an explicit tap that names the address;
// opening a page or choosing an option emails nobody.

import { useEffect, useId, useRef, useState } from 'react';
import { Bell, Receipt, Video, Wallet } from 'lucide-react';
import { PRACTICE } from '@/practice.config';
import { formatClock24 } from '@/lib/dateUtils';
import { adminFetch, displayFee } from '../api';
import { SessionDoneOptions, type SessionDoneChoice } from '../SessionDoneOptions';
import { SendReminderModal } from '../SendReminderModal';
import { PayHow } from '../PayHow';
import { defaultPayChoice, type PayChoice } from '../paymentMethods';
import { clockTime, dublinYmd, firstName, longDay, shortDay } from '../desktopToday';
import { IconChart, IconClose, IconDone, IconForms, IconMail, IconMoney, IconMove, IconTrash } from '../sage';
import type { FreeTimes } from '../useFreeTimes';
import type { ClientRow, SessionRow } from '../types';
import { PhoneOpt } from './PhoneOpt';
import type { PhoneOption } from './SwipeRow';
import { cancelSentence } from './phoneHelpers';

interface Props {
  session: SessionRow;
  client: ClientRow;
  initialOption: PhoneOption | null;
  free: FreeTimes;
  onClose: () => void;
  /** Refresh the dashboard data after a change. */
  onChanged: () => void;
  onToast: (text: string, undo?: () => void | Promise<void>, error?: boolean) => void;
  onOpenClientPage: () => void;
  /** The full session editor (SessionEditModal): other times and every detail. */
  onEditSession: () => void;
}

const PAY_LABEL: Record<PayChoice, string> = { revolut: 'Revolut', cash: 'Cash', card: 'Card' };
const when = (iso: string) => `${new Date(iso).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' })}, ${formatClock24(iso)}`;

export function PhoneSessionPage({ session, client, initialOption, free, onClose, onChanged, onToast, onOpenClientPage, onEditSession }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const heads = useRef(new Map<string, HTMLButtonElement>());
  const reminderTile = useRef<HTMLButtonElement>(null);
  const [openOpt, setOpenOpt] = useState<PhoneOption | null>(initialOption);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [payVia, setPayVia] = useState<PayChoice>(() => defaultPayChoice(client));
  const [slot, setSlot] = useState<string | null>(null);
  const [forms, setForms] = useState<{ values: boolean; cnip: boolean }>({ values: false, cnip: false });
  const [confirmForms, setConfirmForms] = useState(false);

  const paid = session.payment_status === 'paid';
  const viaStripe = paid && Boolean(session.stripe_payment_intent_id);
  const scheduled = session.status === 'scheduled';
  const cancelled = session.status === 'cancelled';
  const attended = session.status === 'attended';
  const online = session.session_format === 'online';
  const first = firstName(client.full_name);
  const ymd = dublinYmd(session.session_date);
  const firstReminder = session.session_reminders?.map(r => r.sent_at).sort()[0] ?? null;
  const upcoming = scheduled && new Date(session.session_date) > new Date(Date.now() - 60 * 60_000);
  const optedOut = Boolean(client.reminders_opted_out);
  const fee = displayFee(session.fee);

  // Free times to move to: from now on, soonest first, not the session's own time.
  const ownLocal = `${ymd}T${clockTime(session.session_date)}`;
  const slots = free.slots.filter(f => f.local !== ownLocal).slice(0, 6);
  const chosen = slot ?? slots[0]?.local ?? null;
  const chosenSlot = chosen ?? '';

  // Focus: into the page (the option a swipe action asked for, else the close button).
  useEffect(() => {
    const target = initialOption ? heads.current.get(initialOption) : null;
    (target ?? closeRef.current)?.focus();
    // once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes the page (the reminder preview above handles its own).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || reminderOpen) return;
      e.preventDefault();
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [reminderOpen]);

  const toggle = (o: PhoneOption) => { setMsg(null); setConfirmForms(false); setOpenOpt(cur => (cur === o ? null : o)); };
  const reg = (k: string) => (el: HTMLButtonElement | null) => { if (el) heads.current.set(k, el); else heads.current.delete(k); };

  async function post(path: string, body: Record<string, unknown>) {
    const res = await adminFetch(path, { method: 'POST', body: JSON.stringify(body) });
    return { res, json: await res.json().catch(() => ({})) as Record<string, unknown> };
  }
  const fail = (json: Record<string, unknown>, fallback = 'That did not work. Nothing was changed.') =>
    setMsg({ ok: false, text: (json.error as string) ?? fallback });
  const offline = () => setMsg({ ok: false, text: 'No connection. Nothing was changed.' });

  async function move() {
    if (!chosen) return;
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/sessions/update', { session_id: session.id, client_id: client.id, session_date: chosen });
      if (!res.ok) { fail(json); return; }
      onChanged();
      onToast(`Moved: ${first} to ${shortDay(chosen)}, ${chosen.slice(11, 16)}`, async () => {
        await post('/api/admin/sessions/update', { session_id: session.id, client_id: client.id, session_date: ownLocal });
        onChanged();
      });
      onClose();
    } catch { offline(); } finally { setBusy(false); }
  }

  async function sendForms() {
    const kind = forms.values && forms.cnip ? 'both' : forms.values ? 'values' : 'cnip';
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/questionnaires/send', { client_id: client.id, kind, email: true });
      if (!res.ok) { fail(json, 'Could not send. Nothing was emailed.'); return; }
      if (json.emailed) { onToast(`Forms emailed to ${first}`); onClose(); }
      else setMsg({ ok: false, text: typeof json.email_error === 'string' ? `Not emailed: ${json.email_error}` : 'Not emailed. Emails may be switched off.' });
    } catch { offline(); } finally { setBusy(false); setConfirmForms(false); }
  }

  async function markPaid() {
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/mark-paid', { session_id: session.id, paid_via: payVia });
      if (!res.ok) { fail(json); return; }
      onChanged();
      onToast(`Marked paid (${PAY_LABEL[payVia]}): ${first}. No receipt emailed.`, async () => {
        await post('/api/admin/mark-paid', { session_id: session.id, action: 'unmark' });
        onChanged();
      });
      onClose();
    } catch { offline(); } finally { setBusy(false); }
  }

  async function markUnpaid() {
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/mark-paid', { session_id: session.id, action: 'unmark' });
      if (!res.ok) { fail(json); return; }
      onChanged();
      onToast(`Marked not paid: ${first}`);
      onClose();
    } catch { offline(); } finally { setBusy(false); }
  }

  async function done(choice: SessionDoneChoice) {
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/mark-attended', {
        session_id: session.id, ...choice, ...(choice.record_payment && !paid ? { paid_via: payVia } : {}),
      });
      if (!res.ok) { fail(json); return; }
      const parts = ['Marked attended'];
      if (choice.record_payment && json.paid) parts.push('payment recorded');
      if (json.receipt_sent) parts.push('receipt emailed');
      onChanged();
      onToast(`${parts.join(', ')}: ${first}.`);
      onClose();
    } catch { offline(); } finally { setBusy(false); }
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
      if (!res.ok) { fail(json, 'The receipt could not be sent.'); return; }
      onChanged();
      onToast(`Receipt emailed to ${first}.`);
      onClose();
    } catch { setMsg({ ok: false, text: 'No connection. Nothing was sent.' }); } finally { setBusy(false); }
  }

  async function cancelSession() {
    setBusy(true); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/sessions/delete', { session_id: session.id });
      if (!res.ok) { fail(json, 'That did not work. The session is still booked.'); return; }
      onChanged();
      onToast(`Cancelled ${first}’s ${shortDay(ymd)} session. The record is kept.`);
      onClose();
    } catch { setMsg({ ok: false, text: 'No connection. The session is still booked.' }); } finally { setBusy(false); }
  }

  const formCount = Number(forms.values) + Number(forms.cnip);
  const formNames = [forms.values && 'the Values questionnaire', forms.cnip && 'the Therapy preferences questionnaire'].filter(Boolean).join(' and ');
  const reminderLine = optedOut ? 'Reminders are turned off for this client'
    : firstReminder ? `Reminder sent ${when(firstReminder)}`
      : upcoming ? 'No reminder sent yet' : 'No reminder was sent';

  return (
    <>
      <div className="ph-layer is-session" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="ph-layer-head">
          <div>
            <h2 id={titleId} className="pii">{client.full_name}</h2>
            <p>{longDay(ymd)}, {clockTime(session.session_date)} · {online ? 'Online' : 'In person'}</p>
          </div>
          <button type="button" className="ph-close" ref={closeRef} onClick={onClose} aria-label="Close and go back"><IconClose /></button>
        </div>

        <div className="ph-layer-body">
          {msg && <p className={`ph-msg${msg.ok ? '' : ' is-error'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}

          <section className="ph-card" aria-label="Where this session stands">
            <ul className="ph-status">
              <li className={firstReminder ? 'is-ok' : ''}><Bell aria-hidden /> {reminderLine}</li>
              <li className={paid ? 'is-ok' : ''}><Wallet aria-hidden /> {paid ? (viaStripe ? 'Paid by Stripe' : 'Paid') : cancelled ? 'Cancelled' : `Not paid yet · ${fee}`}</li>
              {paid && <li className={session.receipt_sent_at ? 'is-ok' : ''}><Receipt aria-hidden /> {session.receipt_sent_at ? `Receipt sent ${when(session.receipt_sent_at)}` : 'No receipt sent'}</li>}
              {attended && <li className="is-ok"><IconDone /> Attended</li>}
              {online && PRACTICE.telehealthUrl && <li><Video aria-hidden /> <a href={PRACTICE.telehealthUrl} target="_blank" rel="noopener noreferrer">Open video room</a></li>}
            </ul>
          </section>

          <div className="ph-card">
            <button type="button" className="ph-navrow" onClick={onOpenClientPage}>
              <span className="ph-ic" aria-hidden><IconChart /></span>
              <span className="ph-txt"><b><span className="pii">{first}</span>&rsquo;s page</b><span>Progress, sessions and payments</span></span>
              <svg className="ph-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>

          {scheduled && (
            <PhoneOpt icon={<IconMove />} title="Reschedule" sub="Pick a new free time" open={openOpt === 'reschedule'} onToggle={() => toggle('reschedule')} headRef={reg('reschedule')}>
              <p className="ph-label">Free times</p>
              {free.loading ? <p className="ph-note">Checking your calendar…</p>
                : free.unavailable ? <p className="ph-note">Couldn&apos;t read Google Calendar, so free times aren&apos;t shown.</p>
                  : slots.length === 0 ? <p className="ph-note">No free times in the next four weeks.</p>
                    : (
                      <div className="ph-chips">
                        {slots.map(f => (
                          <button key={f.local} type="button" className="ph-chip" aria-pressed={f.local === chosen} onClick={() => setSlot(f.local)}>
                            {shortDay(f.local)}, {f.local.slice(11, 16)}
                          </button>
                        ))}
                      </div>
                    )}
              {chosen && <button type="button" className="ph-do" disabled={busy} onClick={() => void move()}>{busy ? 'Moving…' : `Move to ${shortDay(chosenSlot)}, ${chosenSlot.slice(11, 16)}`}</button>}
              <p className="ph-note">No email goes to <span className="pii">{first}</span>; let them know yourself.</p>
              <button type="button" className="ph-linkbtn" onClick={onEditSession}>Other time, or edit details</button>
            </PhoneOpt>
          )}

          {!cancelled && (
            <PhoneOpt icon={<IconForms />} title="Send forms" sub="Questionnaires by email" open={openOpt === 'forms'} onToggle={() => toggle('forms')} headRef={reg('forms')}>
              <label className="ph-check"><input type="checkbox" checked={forms.values} onChange={e => { setForms(f => ({ ...f, values: e.target.checked })); setConfirmForms(false); }} /> Values questionnaire</label>
              <label className="ph-check"><input type="checkbox" checked={forms.cnip} onChange={e => { setForms(f => ({ ...f, cnip: e.target.checked })); setConfirmForms(false); }} /> Therapy preferences (C–NIP–2)</label>
              <p className="ph-note">The intake form and agreement go out when a client is added, from Add a client.</p>
              {!client.email ? <p className="ph-note">No email on record for <span className="pii">{first}</span>.</p>
                : confirmForms ? (
                  <div className="ph-confirm" role="group" aria-label="Confirm the email">
                    <p>Email {formNames} to <span className="pii">{client.email}</span>?</p>
                    <button type="button" className="ph-do" disabled={busy} onClick={() => void sendForms()}>{busy ? 'Sending…' : 'Yes, email it'}</button>
                    <button type="button" className="ph-quiet" disabled={busy} onClick={() => setConfirmForms(false)}>Back</button>
                  </div>
                ) : (
                  <button type="button" className="ph-do" disabled={formCount === 0} onClick={() => setConfirmForms(true)}>
                    {formCount ? `Email ${formCount} form${formCount > 1 ? 's' : ''} to ${first}` : 'Choose a form'}
                  </button>
                )}
            </PhoneOpt>
          )}

          {paid ? (
            <PhoneOpt icon={<IconMoney />} title="Paid" sub="Already marked paid" open={openOpt === 'paid'} onToggle={() => toggle('paid')} headRef={reg('paid')}>
              <p className="ph-note">This session is paid{viaStripe ? ' by Stripe' : ''}.</p>
              {!viaStripe && <button type="button" className="ph-quiet" disabled={busy} onClick={() => void markUnpaid()}>Mark as not paid</button>}
            </PhoneOpt>
          ) : !cancelled && (
            <PhoneOpt icon={<IconMoney />} title="Mark as paid" sub={`${fee} · no receipt is emailed`} open={openOpt === 'paid'} onToggle={() => toggle('paid')} headRef={reg('paid')}>
              <PayHow value={payVia} onChange={setPayVia} disabled={busy} />
              <button type="button" className="ph-do" disabled={busy} onClick={() => void markPaid()}>{busy ? 'Saving…' : `Mark ${fee} as paid`}</button>
              <p className="ph-note">No email goes to <span className="pii">{first}</span>.</p>
            </PhoneOpt>
          )}

          {upcoming && !optedOut && (
            <div className="ph-opt">
              <button type="button" className="ph-opt-head" ref={reminderTile} onClick={() => setReminderOpen(true)}>
                <span className="ph-ic" aria-hidden><IconMail /></span>
                <span className="ph-txt"><b>{firstReminder ? 'Resend reminder' : 'Send reminder'}</b><span>You see it before it&rsquo;s sent</span></span>
                <svg className="ph-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          )}

          {scheduled && (
            <PhoneOpt icon={<IconDone />} title="Session done" sub="Then choose payment and receipt" open={openOpt === 'done'} onToggle={() => toggle('done')} headRef={reg('done')}>
              {!paid && <PayHow value={payVia} onChange={setPayVia} disabled={busy} label="If they paid, how?" />}
              <SessionDoneOptions variant="panel" session={session} client={client} busy={busy} onChoose={c => void done(c)} onCancel={() => setOpenOpt(null)} />
            </PhoneOpt>
          )}

          {paid && (
            <PhoneOpt icon={<IconMail />} title={session.receipt_sent_at ? 'Resend receipt' : 'Email receipt'}
              sub={session.receipt_sent_at ? `Last sent ${when(session.receipt_sent_at)}` : 'Not sent yet'}
              open={openOpt === 'receipt'} onToggle={() => toggle('receipt')} headRef={reg('receipt')}>
              <p className="ph-note">Email a receipt for {fee} to <span className="pii">{client.email}</span>?</p>
              <button type="button" className="ph-do" disabled={busy || !client.email} onClick={() => void sendReceipt()}>
                {busy ? 'Sending…' : session.receipt_sent_at ? 'Send it again' : 'Send receipt'}
              </button>
            </PhoneOpt>
          )}

          {scheduled && (
            <PhoneOpt danger icon={<IconTrash />} title="Cancel session" sub="Removes it from your diary, keeps the record" open={openOpt === 'cancel'} onToggle={() => toggle('cancel')} headRef={reg('cancel')}>
              <p className="ph-note"><CancelText first={first} text={cancelSentence(client, session)} /></p>
              <p className="ph-note">It is removed from Google Calendar too. No email goes to <span className="pii">{first}</span>.</p>
              <button type="button" className="ph-do is-danger" disabled={busy} onClick={() => void cancelSession()}>{busy ? 'Cancelling…' : 'Cancel this session'}</button>
            </PhoneOpt>
          )}
        </div>
      </div>

      {reminderOpen && (
        <SendReminderModal session={session} client={client}
          onClose={() => { setReminderOpen(false); window.setTimeout(() => reminderTile.current?.focus(), 0); }}
          onSessionChanged={onChanged} />
      )}
    </>
  );
}

/** "Cancel Aoife's Tue 1 Dec session? Their other sessions stay." with the name blurred in privacy mode. */
function CancelText({ first, text }: { first: string; text: string }) {
  const i = text.indexOf(first);
  return <>{text.slice(0, i)}<span className="pii">{first}</span>{text.slice(i + first.length)}</>;
}
