'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { adminFetch, displayFee } from './api';
import type { ClientRow } from './types';

interface Props {
  clients: ClientRow[];
  initialIsoDate?: string;    // "YYYY-MM-DDTHH:MM" — pre-fills datetime-local
  onClose: () => void;
  onSuccess: () => void;
  /** Switch to the full new-client flow (intake forms, Stripe, etc.). */
  onNewClient?: () => void;
}

type Recurrence = 'once' | 'weekly' | 'biweekly' | 'monthly';

const COUNT_PRESETS = [4, 6, 8, 10, 12];

export function ScheduleSessionModal({ clients, initialIsoDate, onClose, onSuccess, onNewClient }: Props) {
  // Step 1 is a chooser (New vs Existing client) when onNewClient is wired up;
  // otherwise jump straight to the existing-client form.
  const [mode, setMode] = useState<'choose' | 'existing'>(onNewClient ? 'choose' : 'existing');
  const [clientId, setClientId] = useState('');
  const [sessionDate, setSessionDate] = useState(initialIsoDate ?? '');
  const [sessionFormat, setSessionFormat] = useState<'in_person' | 'online'>('in_person');
  const [fee, setFee] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence>('once');
  const [occurrenceCount, setOccurrenceCount] = useState<number>(6);
  const [continuous, setContinuous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // When a client is picked, prefill the fee from their default if we have one.
  useEffect(() => {
    if (!clientId) return;
    const c = clients.find(x => x.id === clientId);
    if (c?.session_fee) setFee(String(Math.round(c.session_fee / 100)));
  }, [clientId, clients]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) { setError('Pick a client.'); return; }
    if (!sessionDate) { setError('Choose a date and time.'); return; }
    if (!fee || Number(fee) <= 0) { setError('Set a fee.'); return; }

    setBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          client_id:        clientId,
          session_date:     sessionDate,
          session_format:   sessionFormat,
          fee:              Math.round(Number(fee) * 100),
          recurrence,
          occurrence_count: recurrence === 'once' ? 1 : continuous ? 52 : occurrenceCount,
          continuous:       recurrence !== 'once' && continuous,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to schedule session(s).'); return; }
      setDone(true);
      onSuccess();
      setTimeout(() => onClose(), 900);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const activeClients = clients
    .filter(c => c.status === 'active')
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(42, 77, 60, 0.32)',
        zIndex: 90,
        animation: 'admin-fade-in 150ms ease',
      }} />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(42, 77, 60, 0.18)',
        zIndex: 100,
        width: 'min(560px, 92vw)',
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'admin-pop-in 180ms ease',
      }}>
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
            }}>Schedule</p>
            <h2 style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-montserrat), Avenir, sans-serif',
              fontWeight: 300, fontSize: 22, color: 'white', letterSpacing: '0.5px',
            }}>{mode === 'choose' ? 'New session' : 'Existing client'}</h2>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 6 }}>
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {mode === 'choose' ? (
          <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-muted)' }}>
              Who is this session for?
            </p>
            <button
              type="button"
              onClick={() => onNewClient?.()}
              className="admin-choice-btn"
            >
              <span className="admin-choice-title">New client</span>
              <span className="admin-choice-sub">Set up a client, send intake forms &amp; payment link</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('existing')}
              className="admin-choice-btn"
            >
              <span className="admin-choice-title">Existing client</span>
              <span className="admin-choice-sub">Schedule a session for someone already set up</span>
            </button>
          </div>
        ) : (
        <form onSubmit={submit} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="admin-label">Client *</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="admin-input"
              required
            >
              <option value="">— Pick a client —</option>
              {activeClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name} ({displayFee(c.session_fee)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="admin-label">Date &amp; time *</label>
              <input
                type="datetime-local"
                value={sessionDate}
                onChange={e => setSessionDate(e.target.value)}
                className="admin-input"
                required
              />
            </div>
            <div>
              <label className="admin-label">Session fee (€) *</label>
              <input
                type="number" min={1} step={1}
                value={fee}
                onChange={e => setFee(e.target.value)}
                className="admin-input"
                placeholder="e.g. 80"
                required
              />
            </div>
          </div>

          <div>
            <label className="admin-label">Format *</label>
            <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
              {(['in_person', 'online'] as const).map(v => (
                <label key={v} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  fontSize: 14, color: 'var(--forest-deep)',
                }}>
                  <input
                    type="radio"
                    name="sessionFormat"
                    value={v}
                    checked={sessionFormat === v}
                    onChange={() => setSessionFormat(v)}
                    style={{ accentColor: 'var(--terracotta)' }}
                  />
                  {v === 'in_person' ? 'In Person' : 'Online'}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="admin-label">Recurrence</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { id: 'once', label: 'One-off' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'biweekly', label: 'Fortnightly' },
                { id: 'monthly', label: 'Monthly' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setRecurrence(opt.id); if (opt.id === 'once') setContinuous(false); }}
                  className={`admin-segmented-btn${recurrence === opt.id ? ' is-active' : ''}`}
                  style={{ padding: '8px 14px' }}
                >{opt.label}</button>
              ))}
            </div>
          </div>

          {recurrence !== 'once' && (
            <div>
              <label className="admin-label">Number of sessions</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setContinuous(true)}
                  className={`admin-segmented-btn${continuous ? ' is-active' : ''}`}
                  style={{ padding: '8px 14px' }}
                >Continuous</button>
                {COUNT_PRESETS.map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setContinuous(false); setOccurrenceCount(n); }}
                    className={`admin-segmented-btn${!continuous && occurrenceCount === n ? ' is-active' : ''}`}
                    style={{ padding: '8px 14px' }}
                  >{n}</button>
                ))}
                {!continuous && (
                  <input
                    type="number" min={2} max={200} step={1}
                    value={occurrenceCount}
                    onChange={e => setOccurrenceCount(Math.max(2, Math.min(200, Number(e.target.value) || 6)))}
                    className="admin-input"
                    style={{ width: 90 }}
                    aria-label="Custom number of sessions"
                  />
                )}
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>
                {continuous
                  ? 'Schedules about a year of sessions (52). Extend or cancel any time.'
                  : `Creates ${occurrenceCount} sessions and a recurring event on Google Calendar.`
                }
              </p>
            </div>
          )}

          {error && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta)' }}>{error}</p>
          )}

          {done && (
            <p style={{
              margin: 0, fontSize: 13, color: 'var(--sage)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Check size={14} strokeWidth={2.4} /> Scheduled.
            </p>
          )}

          <button type="submit" disabled={busy || done} className="admin-btn-primary" style={{ alignSelf: 'flex-start' }}>
            {busy ? 'Scheduling…' : 'Schedule session'}
          </button>
        </form>
        )}
      </div>
    </>
  );
}
