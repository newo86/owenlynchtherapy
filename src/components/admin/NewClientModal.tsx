'use client';

import { useState } from 'react';
import { X, Check, Copy } from 'lucide-react';
import { colors, fonts, shadows, input as inputStyle, label as labelStyle } from './theme';
import { adminFetch } from './api';

interface Props {
  asModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface Generated {
  url: string;
  paymentLinkUrl: string;
  clientEmail: string;
}

export function NewClientModal({ asModal = false, onClose, onSuccess }: Props) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionFormat, setSessionFormat] = useState<'in_person' | 'online'>('in_person');
  const [sessionFee, setSessionFee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(c => (c === key ? null : c)), 1500);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setGenerated(null);
    try {
      const res = await adminFetch('/api/intake/generate-token', {
        method: 'POST',
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          session_date: sessionDate,
          session_format: sessionFormat,
          session_fee: Number(sessionFee),
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to generate link.'); return; }
      setGenerated({
        url: json.url,
        paymentLinkUrl: json.payment_link_url ?? '',
        clientEmail,
      });
      setClientName(''); setClientEmail(''); setSessionDate(''); setSessionFee(''); setSessionFormat('in_person');
      onSuccess?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Client name *</label>
          <input type="text" required placeholder="e.g. Jane Smith"
            value={clientName} onChange={e => setClientName(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Client email *</label>
          <input type="email" required placeholder="jane@example.com"
            value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label style={labelStyle}>Session date & time *</label>
          <input type="datetime-local" required value={sessionDate}
            onChange={e => setSessionDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Session fee (€) *</label>
          <input type="number" required placeholder="e.g. 80" min="1" step="1"
            value={sessionFee} onChange={e => setSessionFee(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Session format *</label>
        <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
          {(['in_person', 'online'] as const).map(v => (
            <label key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              fontFamily: fonts.sans, fontSize: 14, color: colors.text,
            }}>
              <input
                type="radio"
                name="sessionFormat"
                value={v}
                checked={sessionFormat === v}
                onChange={() => setSessionFormat(v)}
                style={{ accentColor: colors.terracotta }}
              />
              {v === 'in_person' ? 'In Person' : 'Online'}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontFamily: fonts.sans, fontSize: 13, color: colors.terracottaDark }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={busy || !clientName.trim() || !clientEmail.trim() || !sessionDate || !sessionFee}
        className="admin-btn-primary"
        style={{ alignSelf: 'flex-start' }}
      >
        {busy ? 'Generating PDFs & sending email…' : 'Generate & Send Welcome Email'}
      </button>
      {busy && (
        <p style={{ margin: '4px 0 0', fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>
          This can take up to ~10 s the first time; subsequent sends are faster.
        </p>
      )}

      {generated && (
        <div style={{
          marginTop: 8,
          padding: 18,
          background: `${colors.sage}15`,
          border: `1px solid ${colors.sage}`,
          borderRadius: 6,
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Check size={16} strokeWidth={2.4} color={colors.sageDark} />
            <span style={{ fontFamily: fonts.sans, fontSize: 13, fontWeight: 600, color: colors.sageDark }}>
              Link generated · welcome email sent to {generated.clientEmail}
            </span>
          </div>

          <LinkRow
            label="Intake form link"
            value={generated.url}
            copied={copiedKey === 'intake'}
            onCopy={() => copy(generated.url, 'intake')}
          />
          {generated.paymentLinkUrl && (
            <LinkRow
              label="Stripe payment link"
              value={generated.paymentLinkUrl}
              copied={copiedKey === 'pay'}
              onCopy={() => copy(generated.paymentLinkUrl, 'pay')}
            />
          )}
        </div>
      )}
    </form>
  );

  if (!asModal) {
    return (
      <div style={{
        background: colors.white,
        borderRadius: 8,
        borderTop: `3px solid ${colors.gold}`,
        boxShadow: shadows.card,
        padding: 28,
        maxWidth: 720,
      }}>
        {form}
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(42,77,60,0.32)', zIndex: 90,
        animation: 'fadeIn 150ms ease',
      }} />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: colors.linen,
        borderRadius: 10,
        boxShadow: shadows.panel,
        zIndex: 100,
        width: 'min(640px, 92vw)',
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'popIn 180ms ease',
      }}>
        <div style={{
          padding: '18px 24px',
          background: colors.forest,
          color: colors.white,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '10px 10px 0 0',
        }}>
          <h2 style={{ margin: 0, fontFamily: fonts.display, fontWeight: 300, fontSize: 22 }}>New client</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: colors.white, cursor: 'pointer', padding: 6 }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>
        <div style={{ padding: 28 }}>{form}</div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { transform: translate(-50%, -50%) scale(0.96); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
      `}</style>
    </>
  );
}

function LinkRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontFamily: fonts.sans,
        fontSize: 10, fontWeight: 500,
        letterSpacing: '2px', textTransform: 'uppercase',
        color: colors.forest,
        marginBottom: 4,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <code style={{
          flex: 1,
          fontFamily: 'SF Mono, Menlo, monospace',
          fontSize: 12,
          color: colors.text,
          background: colors.white,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
          padding: '6px 10px',
          wordBreak: 'break-all',
        }}>{value}</code>
        <button
          onClick={onCopy}
          style={{
            display: 'inline-flex',
            alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: copied ? colors.sageDark : 'transparent',
            color: copied ? colors.white : colors.forest,
            border: `1px solid ${copied ? colors.sageDark : colors.border}`,
            borderRadius: 4,
            fontFamily: fonts.sans, fontSize: 11, fontWeight: 500,
            letterSpacing: '1px', textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'background 150ms ease, color 150ms ease',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
