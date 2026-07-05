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

type FollowUpCadence = 'none' | 'weekly' | 'fortnightly' | 'monthly';

/** Convert a UTC ISO string from Supabase into "YYYY-MM-DDTHH:MM" in Dublin time. */
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

/** Advance a "YYYY-MM-DDTHH:MM" wall-clock string by one interval. */
function addInterval(wallClock: string, cadence: 'weekly' | 'fortnightly' | 'monthly'): string {
  const [datePart, timePart = '00:00'] = wallClock.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  let dt: Date;
  if (cadence === 'monthly') {
    dt = new Date(Date.UTC(y, mo - 1 + 1, d));
  } else {
    dt = new Date(Date.UTC(y, mo - 1, d + (cadence === 'weekly' ? 7 : 14)));
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${timePart}`;
}

const COUNT_PRESETS = [4, 6, 8, 10, 12];

export function SessionEditModal({ session, client, onClose, onSuccess }: Props) {
  const [clientName, setClientName]       = useState(client.full_name);
  const [clientEmail, setClientEmail]     = useState(client.email ?? '');
  const [clientPhone, setClientPhone]     = useState(client.phone ?? '');
  const [sessionDate, setSessionDate]     = useState(toDatetimeLocal(session.session_date));
  const [fee, setFee]                     = useState(String(Math.round(session.fee / 100)));
  const [format, setFormat]               = useState<'in_person' | 'online'>(
    session.session_format === 'online' ? 'online' : 'in_person'
  );
  const [applyFormatToAll, setApplyFormatToAll] = useState(false);
  const [isLowCost, setIsLowCost]               = useState(client.is_low_cost ?? false);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'refunded'>(
    session.payment_status === 'paid' ? 'paid'
    : session.payment_status === 'refunded' ? 'refunded'
    : 'unpaid'
  );
  const [status, setStatus] = useState<'scheduled' | 'attended' | 'cancelled' | 'no_show'>(
    (['scheduled', 'attended', 'cancelled', 'no_show'] as const).includes(session.status as 'scheduled')
      ? session.status as 'scheduled' | 'attended' | 'cancelled' | 'no_show'
      : 'scheduled'
  );
  const [notes, setNotes]                 = useState(session.notes ?? '');
  const [followUpCadence, setFollowUpCadence]     = useState<FollowUpCadence>('none');
  const [followUpCount, setFollowUpCount]         = useState(6);
  const [followUpContinuous, setFollowUpContinuous] = useState(false);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');
  const [saved, setSaved]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [deletingSession, setDeletingSession] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) { setError('Client name is required.'); return; }
    if (!sessionDate)        { setError('Session date and time is required.'); return; }
    if (!fee || Number(fee) <= 0) { setError('Fee must be a positive number.'); return; }

    setBusy(true);
    setError('');
    try {
      // 1 — Update the current session and client details.
      const res = await adminFetch('/api/admin/sessions/update', {
        method: 'POST',
        body: JSON.stringify({
          session_id:          session.id,
          client_id:           client.id,
          client_name:         clientName,
          client_email:        clientEmail,
          phone:               clientPhone,
          session_date:        sessionDate,
          fee:                 Number(fee), // sessions/update expects EUROS (converts to cents itself)
          session_format:      format,
          payment_status:      paymentStatus,
          status,
          notes,
          apply_format_to_all: applyFormatToAll,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to save changes.'); return; }

      // 1b — Sync low-cost flag if it changed.
      if (isLowCost !== (client.is_low_cost ?? false)) {
        await adminFetch('/api/admin/clients/update', {
          method: 'POST',
          body: JSON.stringify({ client_id: client.id, is_low_cost: isLowCost }),
        });
      }

      // 2 — Optionally schedule follow-up sessions starting from the next occurrence.
      if (followUpCadence !== 'none') {
        const nextDate = addInterval(sessionDate, followUpCadence);
        const apiCadence = followUpCadence === 'fortnightly' ? 'biweekly' : followUpCadence;
        const fuRes = await adminFetch('/api/admin/sessions', {
          method: 'POST',
          body: JSON.stringify({
            client_id:        client.id,
            session_date:     nextDate,
            session_format:   format,
            fee:              Number(fee) * 100, // sessions (create) expects CENTS
            recurrence:       apiCadence,
            occurrence_count: followUpContinuous ? 52 : followUpCount,
            continuous:       followUpContinuous,
          }),
        });
        if (!fuRes.ok) {
          const fuJson = await fuRes.json().catch(() => ({}));
          setError(`Session saved, but follow-ups failed: ${fuJson.error ?? 'unknown error'}`);
          onSuccess();
          setTimeout(() => onClose(), 1800);
          return;
        }
      }

      setSaved(true);
      onSuccess();
      setTimeout(() => onClose(), 900);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteSession() {
    setDeletingSession(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/sessions/delete', {
        method: 'POST',
        body: JSON.stringify({ session_id: session.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to delete session.'); setDeletingSession(false); return; }
      onSuccess();
      onClose();
    } catch {
      setError('Network error. Please try again.');
      setDeletingSession(false);
    }
  }

  async function deleteClient() {
    setDeleting(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/clients/delete', {
        method: 'POST',
        body: JSON.stringify({ client_id: client.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to delete client.'); setDeleting(false); return; }
      onSuccess();
      onClose();
    } catch {
      setError('Network error. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(42, 77, 60, 0.32)',
          zIndex: 500,
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
        zIndex: 510,
        width: 'min(560px, 92vw)',
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
        <form onSubmit={save} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>

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
            <div>
              <label className="admin-label">Phone</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="admin-input"
                placeholder="+353 87 000 0000"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 13, color: 'var(--forest-deep)',
                paddingTop: 20,
              }}>
                <input
                  type="checkbox"
                  checked={isLowCost}
                  onChange={e => setIsLowCost(e.target.checked)}
                  style={{ accentColor: 'var(--terracotta)', width: 15, height: 15 }}
                />
                Low cost session
              </label>
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
            {format !== session.session_format && (
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                marginTop: 10, cursor: 'pointer', fontSize: 13, color: 'var(--forest-deep)',
              }}>
                <input
                  type="checkbox"
                  checked={applyFormatToAll}
                  onChange={e => setApplyFormatToAll(e.target.checked)}
                  style={{ accentColor: 'var(--terracotta)', width: 15, height: 15 }}
                />
                Apply format change to all of {clientName.split(' ')[0]}&apos;s sessions
              </label>
            )}
          </div>

          {/* Session status */}
          <div>
            <label className="admin-label">Session status</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {([
                { id: 'scheduled',  label: 'Scheduled' },
                { id: 'attended',   label: 'Attended' },
                { id: 'cancelled',  label: 'Cancelled' },
                { id: 'no_show',    label: 'No Show' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatus(opt.id)}
                  className={`admin-segmented-btn${status === opt.id ? ' is-active' : ''}`}
                  style={{ padding: '8px 14px' }}
                >
                  {opt.label}
                </button>
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

          {/* Notes */}
          <div>
            <label className="admin-label">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="admin-input"
              rows={3}
              placeholder="Private session notes…"
              style={{ resize: 'vertical', minHeight: 72 }}
            />
          </div>

          {/* Follow-up sessions */}
          <div style={{
            borderTop: '1px solid rgba(42,77,60,0.1)',
            paddingTop: 16,
          }}>
            <label className="admin-label" style={{ marginBottom: 8, display: 'block' }}>
              Schedule follow-up sessions
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([
                { id: 'none',        label: 'None' },
                { id: 'weekly',      label: 'Weekly' },
                { id: 'fortnightly', label: 'Fortnightly' },
                { id: 'monthly',     label: 'Monthly' },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setFollowUpCadence(opt.id); if (opt.id === 'none') setFollowUpContinuous(false); }}
                  className={`admin-segmented-btn${followUpCadence === opt.id ? ' is-active' : ''}`}
                  style={{ padding: '8px 14px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {followUpCadence !== 'none' && (
              <div style={{ marginTop: 12 }}>
                <label className="admin-label">Number of follow-up sessions</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setFollowUpContinuous(true)}
                    className={`admin-segmented-btn${followUpContinuous ? ' is-active' : ''}`}
                    style={{ padding: '8px 14px' }}
                  >Continuous</button>
                  {COUNT_PRESETS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setFollowUpContinuous(false); setFollowUpCount(n); }}
                      className={`admin-segmented-btn${!followUpContinuous && followUpCount === n ? ' is-active' : ''}`}
                      style={{ padding: '8px 14px' }}
                    >{n}</button>
                  ))}
                  {!followUpContinuous && (
                    <input
                      type="number" min={1} max={200} step={1}
                      value={followUpCount}
                      onChange={e => setFollowUpCount(Math.max(1, Math.min(200, Number(e.target.value) || 6)))}
                      className="admin-input"
                      style={{ width: 80 }}
                      aria-label="Custom number of follow-up sessions"
                    />
                  )}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>
                  {followUpContinuous
                    ? `Schedules about a year of ${followUpCadence} sessions (52). Extend or cancel any time.`
                    : `Creates ${followUpCount} ${followUpCadence} sessions starting the ${followUpCadence === 'weekly' ? 'next week' : followUpCadence === 'fortnightly' ? 'next fortnight' : 'next month'}.`
                  }
                </p>
              </div>
            )}
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

          {/* Delete this session */}
          <div style={{
            borderTop: '1px solid rgba(200,90,26,0.15)',
            paddingTop: 16,
            marginTop: 4,
          }}>
            {confirmDeleteSession ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta)', fontWeight: 500 }}>
                  Delete this single session? This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={deletingSession}
                    onClick={deleteSession}
                    style={{
                      background: 'var(--terracotta)', color: 'white',
                      border: 'none', borderRadius: 8, padding: '8px 16px',
                      fontSize: 13, fontWeight: 600, cursor: deletingSession ? 'wait' : 'pointer',
                    }}
                  >
                    {deletingSession ? 'Deleting…' : 'Yes, delete session'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteSession(false)}
                    className="admin-btn-secondary"
                    style={{ fontSize: 13, padding: '8px 14px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDeleteSession(true)}
                style={{
                  background: 'none', border: '1px solid rgba(200,90,26,0.35)',
                  borderRadius: 8, padding: '7px 14px',
                  fontSize: 12, color: 'var(--terracotta)',
                  cursor: 'pointer', letterSpacing: '0.3px',
                }}
              >
                Delete this session
              </button>
            )}
          </div>

          {/* Delete client */}
          <div style={{
            borderTop: '1px solid rgba(200,90,26,0.15)',
            paddingTop: 16,
            marginTop: 4,
          }}>
            {confirmDelete ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta)', fontWeight: 500 }}>
                  Permanently delete {clientName.trim()} and all their sessions? This cannot be undone.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={deleteClient}
                    style={{
                      background: 'var(--terracotta)', color: 'white',
                      border: 'none', borderRadius: 8, padding: '8px 16px',
                      fontSize: 13, fontWeight: 600, cursor: deleting ? 'wait' : 'pointer',
                    }}
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete client'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="admin-btn-secondary"
                    style={{ fontSize: 13, padding: '8px 14px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                style={{
                  background: 'none', border: '1px solid rgba(200,90,26,0.35)',
                  borderRadius: 8, padding: '7px 14px',
                  fontSize: 12, color: 'var(--terracotta)',
                  cursor: 'pointer', letterSpacing: '0.3px',
                }}
              >
                Delete client &amp; all sessions
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
