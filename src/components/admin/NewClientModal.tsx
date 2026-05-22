'use client';

import { useState } from 'react';
import { X, Check, Copy } from 'lucide-react';
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
          <label className="admin-label">Client name *</label>
          <input type="text" required placeholder="e.g. Jane Smith"
            value={clientName} onChange={e => setClientName(e.target.value)} className="admin-input" />
        </div>
        <div>
          <label className="admin-label">Client email *</label>
          <input type="email" required placeholder="jane@example.com"
            value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="admin-input" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label className="admin-label">Session date &amp; time *</label>
          <input type="datetime-local" required value={sessionDate}
            onChange={e => setSessionDate(e.target.value)} className="admin-input" />
        </div>
        <div>
          <label className="admin-label">Session fee (€) *</label>
          <input type="number" required placeholder="e.g. 80" min="1" step="1"
            value={sessionFee} onChange={e => setSessionFee(e.target.value)} className="admin-input" />
        </div>
      </div>
      <div>
        <label className="admin-label">Session format *</label>
        <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
          {(['in_person', 'online'] as const).map(v => (
            <label key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              fontSize: 14, color: 'rgba(255,255,255,0.85)',
            }}>
              <input
                type="radio"
                name="sessionFormat"
                value={v}
                checked={sessionFormat === v}
                onChange={() => setSessionFormat(v)}
                style={{ accentColor: '#C85A1A' }}
              />
              {v === 'in_person' ? 'In Person' : 'Online'}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: '#F4956A' }}>{error}</p>
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
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>
          This can take up to ~10 s the first time; subsequent sends are faster.
        </p>
      )}

      {generated && (
        <div style={{
          marginTop: 8, padding: 18,
          background: 'rgba(79,138,104,0.15)',
          border: '1px solid rgba(79,138,104,0.4)',
          borderRadius: 10,
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Check size={16} strokeWidth={2.4} color="#A6E3BD" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#A6E3BD' }}>
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
      <div className="admin-glass" style={{ padding: 28, maxWidth: 720 }}>
        {form}
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        zIndex: 90,
        animation: 'admin-fade-in 150ms ease',
      }} />
      <div className="admin-glass" style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(30, 61, 47, 0.92)',
        borderRadius: 16,
        zIndex: 100,
        width: 'min(640px, 92vw)',
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'admin-pop-in 180ms ease',
      }}>
        <div style={{
          padding: '18px 24px',
          background: 'rgba(0,0,0,0.25)',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h2 style={{
            margin: 0,
            fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
            fontWeight: 300, fontSize: 22,
          }}>New client</h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 6 }}>
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>
        <div style={{ padding: 28 }}>{form}</div>
      </div>
    </>
  );
}

function LinkRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 10, fontWeight: 500,
        letterSpacing: '2px', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.55)',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <code style={{
          flex: 1,
          fontFamily: 'SF Mono, Menlo, monospace',
          fontSize: 12,
          color: 'rgba(255,255,255,0.88)',
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '6px 10px',
          wordBreak: 'break-all',
        }}>{value}</code>
        <button onClick={onCopy} className={copied ? 'admin-btn-primary' : 'admin-btn-secondary'}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
