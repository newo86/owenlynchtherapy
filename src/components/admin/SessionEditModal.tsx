'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { adminFetch } from './api';
import type { ClientRow, SessionRow } from './types';

interface Props {
  session: SessionRow;
  client: ClientRow;
  onClose: () => void;
  onSuccess: () => void;
}

/** Convert a UTC ISO string from Supabase into a "YYYY-MM-DDTHH:MM" string
 *  in the Europe/Dublin timezone, suitable for a datetime-local input. */
function toDatetimeLocal(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';
  const h = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}`;
}

export function SessionEditModal({ session, client, onClose, onSuccess }: Props) {
  const [clientName, setClientName]       = useState(client.full_name);
  const [clientEmail, setClientEmail]     = useState(client.email ?? '');
  const [sessionDate, setSessionDate]     = useState(toDatetimeLocal(session.session_date));
  const [fee, setFee]                     = useState(String(Math.round(session.fee / 100)));
  const [format, setFormat]               = useState<'in_person' | 'online'>(
    session.session_format === 'online' ? 'online' : 'in_person'
  );
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'refunded'>(
    session.payment_status === 'paid' ? 'paid'
    : session.payment_status === 'refunded' ? 'refunded'
    : 'unpaid'
  );
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) { setError('Client name is required.'); return; }
    if (!sessionDate)        { setError('Session date and time is required.'); return; }
    if (!fee || Number(fee) <= 0) { setError('Fee must be a positive number.'); return; }

    setBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/sessions/update', {
        method: 'POST',
        body: JSON.stringify({
          session_id:     session.id,
          client_id:      client.id,
          client_name:    clientName,
          client_email:   clientEmail,
          session_date:   sessionDate,
          fee:            Number(fee),
          session_format: format,
          payment_status: paymentStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to save changes.'); return; }
      setSaved(true);
      onSuccess();
      setTimeout(() => onClose(), 900);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(42, 77, 60, 0.32)',
          zIndex: 110,
          animation: 'admin-fade-in 150ms ease',
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(42, 77, 60, 0.18)',
        zIndex: 120,
        width: 'min(540px, 92vw)',
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'admin-pop-in 180ms ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 26px',
          background: 'var(--forest-deep)',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '18px 18px 0 0',
        }}>
          <div>
            <p style={{
              margin: 0, fontSize: 10, fontWeight: 500,
              letterSpacing: '4px', textTransform: 'uppercase',
              color: 'var(--terracotta-soft)',
            }}>Session</p>
            <h2 style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-montserrat), Avenir, sans-serif',
              fontWeight: 300, fontSize: 22, color: 'white',
            }}>Edit session</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 6 }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={save} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Client details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="admin-label">Client name</label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="admin-input"
                required
              />
            </div>
            <div>
              <label className="admin-label">Client email</label>
              <input
                type="email"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                className="admin-input"
                placeholder="jane@example.com"
              />
            </div>
          </div>

          {/* Date / fee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="admin-label">Date &amp; time (Dublin)</label>
              <input
                type="datetime-local"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="admin-input"
                required
              />
            </div>
            <div>
              <label className="admin-label">Session fee (€)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={fee}
                onChange={e => setFee(e.target.value)}
                className="admin-input"
                required
              />
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="admin-label">Format</label>
            <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
              {(['in_person', 'online'] as const).map(v => (
                <label key={v} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer', fontSize: 14, color: 'var(--forest-deep)',
                }}>
                  <input
                    type="radio"
                    name="editFormat"
                    value={v}
                    checked={format === v}
                    onChange={() => setFormat(v)}
                    style={{ accentColor: 'var(--terracotta)' }}
                  />
                  {v === 'in_person' ? 'In Person' : 'Online'}
                </label>
              ))}
            </div>
          </div>

          {/* Payment status */}
          <div>
            <label className="admin-label">Payment status</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {([
                { id: 'unpaid',   label: 'Unpaid' },
                { id: 'paid',     label: 'Paid' },
                { id: 'refunded', label: 'Refunded' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentStatus(opt.id)}
                  className={`admin-segmented-btn${paymentStatus === opt.id ? ' is-active' : ''}`}
                  style={{ padding: '8px 14px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta)' }}>{error}</p>
          )}
          {saved && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--sage)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} strokeWidth={2.4} /> Saved.
            </p>
          )}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              type="submit"
              disabled={busy || saved}
              className="admin-btn-primary"
            >
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="admin-btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
