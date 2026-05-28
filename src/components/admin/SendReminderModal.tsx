'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { X, Mail, Phone } from 'lucide-react';
import { formatDateTime } from './api';
import type { SessionRow, ClientRow } from './types';

interface Props {
  session: SessionRow;
  client: ClientRow;
  onClose: () => void;
}

export function SendReminderModal({ session, client, onClose }: Props) {
  const [channel, setChannel] = useState<'email' | 'sms' | null>(null);
  const [message, setMessage] = useState('');

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
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
            description="Send an SMS reminder to the client's number"
            selected={channel === 'sms'}
            onClick={() => setChannel(prev => prev === 'sms' ? null : 'sms')}
          />
        </div>

        {/* Optional message */}
        <div style={{ marginBottom: 24 }}>
          <label className="admin-label">Message (optional)</label>
          <textarea
            className="admin-textarea"
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Add a personal note to your reminder..."
            style={{ minHeight: 80 }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="admin-btn-secondary">
            Cancel
          </button>
          {/* Disabled with tooltip — wired up to Resend/Twilio later */}
          <span
            title="Coming soon — this will send automatically once connected"
            style={{ display: 'inline-block' }}
          >
            <button
              disabled
              className="admin-btn-primary"
              style={{ opacity: 0.4, cursor: 'not-allowed', pointerEvents: 'none' }}
            >
              Send Reminder
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

function ChannelCard({
  icon, label, description, selected, onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '18px 16px',
        borderRadius: 16,
        border: `2px solid ${selected ? 'var(--terracotta)' : 'var(--line)'}`,
        background: selected ? 'rgba(200,90,27,0.06)' : 'white',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        transition: 'border-color 150ms ease, background 150ms ease',
        fontFamily: 'inherit',
        width: '100%',
      }}
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
