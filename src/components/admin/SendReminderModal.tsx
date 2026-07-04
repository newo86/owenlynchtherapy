'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X, Mail, Phone, Receipt, Check } from 'lucide-react';
import { adminFetch, formatDateTime } from './api';
import type { SessionRow, ClientRow } from './types';

interface Props {
  session: SessionRow;
  client: ClientRow;
  onClose: () => void;
}

export function SendReminderModal({ session, client, onClose }: Props) {
  const [channel, setChannel] = useState<'email' | null>(null);
  // Mirror of the server-side logic in lib/sendSessionReminder.ts so the
  // practitioner can see what the email will contain before sending.
  const contents = client.is_low_cost
    ? 'Includes the Insight Matters address and a note that payment is cash on the day — no payment link.'
    : session.session_format === 'online'
      ? 'Includes the doxy.me room link and the Stripe payment link for online sessions.'
      : 'Includes the Insight Matters address and the Stripe payment link for in-person sessions.';
  const canSend = session.status === 'scheduled';
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  // Send Receipt reuses the existing /api/admin/send-receipt route untouched.
  const [receiptStatus, setReceiptStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Auto-close 2 s after a successful send.
  useEffect(() => {
    if (feedback?.kind !== 'success') return;
    const t = setTimeout(onClose, 2000);
    return () => clearTimeout(t);
  }, [feedback, onClose]);

  async function send() {
    if (channel !== 'email' || sending) return;
    setSending(true);
    setFeedback(null);
    try {
      const res = await adminFetch('/api/admin/send-reminder', {
        method: 'POST',
        body: JSON.stringify({ session_id: session.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFeedback({ kind: 'error', msg: json.error ?? 'Failed to send reminder.' });
      } else {
        setFeedback({ kind: 'success', msg: `Reminder sent to ${json.email ?? client.email}` });
      }
    } catch {
      setFeedback({ kind: 'error', msg: 'Network error — please try again.' });
    } finally {
      setSending(false);
    }
  }

  const [receiptError, setReceiptError] = useState<string | null>(null);

  async function sendReceipt(force = false) {
    setReceiptStatus('sending');
    setReceiptError(null);
    try {
      const res = await adminFetch('/api/admin/send-receipt', {
        method: 'POST',
        body: JSON.stringify({ session_id: session.id, force }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.already_sent_at) {
        const when = new Date(json.already_sent_at).toLocaleString('en-IE', {
          day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
          timeZone: 'Europe/Dublin',
        });
        if (confirm(`A receipt for this session was already emailed on ${when}. Send it again?`)) {
          await sendReceipt(true);
          return;
        }
        setReceiptStatus('idle');
        return;
      }
      if (!res.ok) {
        setReceiptStatus('error');
        setReceiptError(json.error ?? null);
        return;
      }
      setReceiptStatus('sent');
    } catch {
      setReceiptStatus('error');
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(42,77,60,0.32)',
        backdropFilter: 'blur(3px)',
        zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'admin-fade-in 150ms ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 22,
          padding: '30px 32px',
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          boxShadow: '0 24px 64px rgba(42,77,60,0.18)',
          animation: 'admin-pop-in 180ms ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p className="admin-eyebrow">Reminder</p>
            <h2 className="admin-h3" style={{ margin: '4px 0 6px' }}>Send Reminder</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0 }}>
              {client.full_name} · {formatDateTime(session.session_date)}
            </p>
            <p style={{ fontSize: 12, color: 'var(--sage)', margin: '8px 0 0', lineHeight: 1.5 }}>
              {contents}
            </p>
            {(session.session_reminders?.length ?? 0) > 0 && (
              <p style={{ fontSize: 12, color: 'var(--terracotta)', margin: '6px 0 0', lineHeight: 1.5 }}>
                A reminder was already sent for this session — sending again will email the client twice.
              </p>
            )}
            {!canSend && (
              <p style={{ fontSize: 12, color: 'var(--terracotta)', margin: '6px 0 0' }}>
                This session is {session.status === 'attended' ? 'already attended' : session.status} — reminders only go to scheduled sessions.
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid var(--line)', background: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--ink-muted)', flexShrink: 0,
            }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Channel option cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <ChannelCard
            icon={<Mail size={22} />}
            label="Email"
            description="Send a reminder to the client's email address"
            selected={channel === 'email'}
            onClick={() => setChannel(prev => prev === 'email' ? null : 'email')}
          />
          <ChannelCard
            icon={<Phone size={22} />}
            label="Text"
            description="Coming soon"
            selected={false}
            disabled
            onClick={() => {}}
          />
        </div>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginBottom: 18,
            padding: '12px 16px',
            borderRadius: 10,
            background: feedback.kind === 'success' ? 'rgba(79,138,104,0.10)' : 'rgba(200,90,27,0.10)',
            border: `1px solid ${feedback.kind === 'success' ? 'rgba(79,138,104,0.35)' : 'rgba(200,90,27,0.4)'}`,
            color: feedback.kind === 'success' ? '#2D5A42' : '#A04714',
            fontSize: 13,
          }}>
            {feedback.msg}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={onClose} className="admin-btn-secondary" disabled={sending}>
            Cancel
          </button>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            {/* Send Receipt — wired to the existing /api/admin/send-receipt route. */}
            <button
              onClick={() => void sendReceipt()}
              disabled={receiptStatus === 'sending' || receiptStatus === 'sent'}
              className="admin-btn-secondary is-filled"
              style={{ background: 'var(--sage)', borderColor: 'var(--sage)' }}
              title="Email this session's receipt to the client"
            >
              {receiptStatus === 'sent'
                ? <><Check size={13} /> Receipt sent</>
                : <><Receipt size={13} /> {receiptStatus === 'sending' ? 'Sending…' : 'Send Receipt'}</>}
            </button>
            <button
              onClick={send}
              disabled={channel !== 'email' || sending || !canSend}
              className="admin-btn-primary"
              style={channel !== 'email' || !canSend ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
              {sending ? 'Sending…' : 'Send Reminder'}
            </button>
          </div>
        </div>
        {receiptStatus === 'error' && (
          <p style={{ fontSize: 12, color: 'var(--terracotta)', textAlign: 'right', margin: '10px 0 0' }}>
            {receiptError ?? "Couldn't send the receipt — please try again."}
          </p>
        )}
      </div>
    </div>
  );
}

function ChannelCard({
  icon, label, description, selected, disabled, onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        padding: '18px 16px',
        borderRadius: 16,
        border: `2px solid ${selected ? 'var(--terracotta)' : 'var(--line)'}`,
        background: disabled ? 'var(--cream)' : selected ? 'rgba(200,90,27,0.06)' : 'white',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 150ms ease, background 150ms ease',
        fontFamily: 'inherit',
        width: '100%',
        opacity: disabled ? 0.5 : 1,
      }}
      disabled={disabled}
    >
      <span style={{ color: selected ? 'var(--terracotta)' : 'var(--ink-muted)' }}>
        {icon}
      </span>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--forest-deep)', display: 'block' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: 'var(--ink-muted)', lineHeight: 1.5, display: 'block' }}>
        {description}
      </span>
    </button>
  );
}
