'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X, Mail, Phone } from 'lucide-react';
import { adminFetch, formatDateTime } from './api';
import type { SessionRow, ClientRow } from './types';

interface Props {
  session: SessionRow;
  client: ClientRow;
  onClose: () => void;
}

export function SendReminderModal({ session, client, onClose }: Props) {
  const [channel, setChannel] = useState<'email' | null>(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

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
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="admin-btn-secondary" disabled={sending}>
            Cancel
          </button>
          <button
            onClick={send}
            disabled={channel !== 'email' || sending}
            className="admin-btn-primary"
            style={channel !== 'email' ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
          >
            {sending ? 'Sending…' : 'Send Reminder'}
          </button>
        </div>
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
