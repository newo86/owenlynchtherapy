'use client';

// The three things a therapist most often needs for one session, at the top of
// the session pop-up: has the reminder gone, send it now, mark it paid, email
// the receipt. Each action says what happened in words. Nothing is emailed
// without a tap, and re-sending something already sent asks first.

import { useState } from 'react';
import { Bell, Check, Mail, Receipt, Wallet } from 'lucide-react';
import { adminFetch } from './api';
import type { ClientRow, SessionRow } from './types';

interface Props {
  session: SessionRow;
  client: ClientRow;
  /** Called after a change, so the calendar and lists refresh. */
  onChanged: () => void;
}

const when = (iso: string) => new Date(iso).toLocaleString('en-IE', {
  weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  timeZone: 'Europe/Dublin',
});

export function SessionQuickActions({ session, client, onChanged }: Props) {
  const firstReminder = session.session_reminders?.map(r => r.sent_at).sort()[0] ?? null;
  const [reminderAt, setReminderAt] = useState<string | null>(firstReminder);
  const [paid, setPaid] = useState(session.payment_status === 'paid');
  const [receiptAt, setReceiptAt] = useState<string | null>(session.receipt_sent_at);
  const [busy, setBusy] = useState<null | 'reminder' | 'paid' | 'receipt'>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; email?: string } | null>(null);

  const live = session.status === 'scheduled' || session.status === 'attended';
  const upcoming = session.status === 'scheduled' && new Date(session.session_date) > new Date(Date.now() - 60 * 60_000);
  const optedOut = Boolean(client.reminders_opted_out);

  async function post(path: string, body: Record<string, unknown>) {
    const res = await adminFetch(path, { method: 'POST', body: JSON.stringify(body) });
    return { res, json: await res.json().catch(() => ({})) as Record<string, unknown> };
  }

  async function sendReminder(force = false) {
    setBusy('reminder'); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/send-reminder', { session_id: session.id, force });
      if (res.status === 409) {
        const at = typeof json.already_sent_at === 'string' ? when(json.already_sent_at) : 'earlier';
        if (confirm(`A reminder for this session already went out (${at}). Send it again?`)) return sendReminder(true);
        setMsg({ ok: false, text: 'Not sent: a reminder already went out.' });
      } else if (!res.ok) {
        setMsg({ ok: false, text: (json.error as string) ?? 'The reminder could not be sent.' });
      } else {
        setReminderAt(new Date().toISOString());
        setMsg({ ok: true, text: 'Reminder sent to', email: (json.email as string) ?? client.email ?? '' });
        onChanged();
      }
    } catch { setMsg({ ok: false, text: 'No connection. Please try again.' }); }
    finally { setBusy(null); }
  }

  async function markPaid() {
    setBusy('paid'); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/mark-paid', { session_id: session.id });
      if (!res.ok) { setMsg({ ok: false, text: (json.error as string) ?? 'Could not mark it paid.' }); return; }
      setPaid(true);
      setMsg({ ok: true, text: client.is_low_cost ? 'Cash payment recorded. No receipt was emailed.' : 'Marked paid. No receipt was emailed.' });
      onChanged();
    } catch { setMsg({ ok: false, text: 'No connection. Please try again.' }); }
    finally { setBusy(null); }
  }

  async function sendReceipt(force = false) {
    setBusy('receipt'); setMsg(null);
    try {
      const { res, json } = await post('/api/admin/send-receipt', { session_id: session.id, force });
      if (res.status === 409 && typeof json.already_sent_at === 'string') {
        if (confirm(`A receipt for this session was already emailed (${when(json.already_sent_at)}). Send it again?`)) return sendReceipt(true);
        return;
      }
      if (!res.ok) { setMsg({ ok: false, text: (json.error as string) ?? 'The receipt could not be sent.' }); return; }
      setReceiptAt(new Date().toISOString());
      setMsg({ ok: true, text: 'Receipt emailed to', email: client.email ?? '' });
      onChanged();
    } catch { setMsg({ ok: false, text: 'No connection. Please try again.' }); }
    finally { setBusy(null); }
  }

  const reminderLine = optedOut
    ? 'Reminders are turned off for this client.'
    : reminderAt
      ? `Reminder sent ${when(reminderAt)}`
      : upcoming ? 'No reminder sent yet' : 'No reminder was sent';

  return (
    <section className="sqa" aria-label="Reminder and payment">
      <ul className="sqa-status">
        <li className={reminderAt ? 'is-ok' : ''}><Bell size={15} aria-hidden /> {reminderLine}</li>
        <li className={paid ? 'is-ok' : ''}><Wallet size={15} aria-hidden /> {paid ? 'Paid' : 'Not paid yet'}</li>
        {paid && (
          <li className={receiptAt ? 'is-ok' : ''}><Receipt size={15} aria-hidden /> {receiptAt ? `Receipt sent ${when(receiptAt)}` : 'No receipt sent'}</li>
        )}
      </ul>

      {live && (
        <div className="sqa-actions">
          {upcoming && !optedOut && (
            <button type="button" className="admin-btn-secondary" disabled={busy !== null} onClick={() => sendReminder()}>
              <Mail size={15} aria-hidden /> {busy === 'reminder' ? 'Sending…' : reminderAt ? 'Resend reminder' : 'Send reminder'}
            </button>
          )}
          {!paid && (
            <button type="button" className="admin-btn-secondary" disabled={busy !== null} onClick={markPaid}>
              <Check size={15} aria-hidden /> {busy === 'paid' ? 'Saving…' : 'Mark as paid'}
            </button>
          )}
          {paid && (
            <button type="button" className="admin-btn-secondary" disabled={busy !== null} onClick={() => sendReceipt()}>
              <Receipt size={15} aria-hidden /> {busy === 'receipt' ? 'Sending…' : receiptAt ? 'Resend receipt' : 'Send receipt'}
            </button>
          )}
        </div>
      )}

      {msg && <p className={`sqa-msg${msg.ok ? ' is-ok' : ' is-error'}`} role="status">{msg.text}{msg.email !== undefined && <> <span className="pii">{msg.email}</span>.</>}</p>}
    </section>
  );
}
