'use client';

import { useMemo, useRef, useState } from 'react';
import { X, Check, Search } from 'lucide-react';
import { adminFetch, gcalIsoToDublinLocal } from './api';
import type { CalendarEvent, ClientRow } from './types';

interface Props {
  event: CalendarEvent;
  clients: ClientRow[];
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Edit modal for a Google Calendar event that has no linked Supabase client
 * (or where linking is optional). Lets the admin rename, reschedule, optionally
 * set a format/fee, and optionally connect the event to an existing client.
 * Saving writes to both Google Calendar and — when a client is linked —
 * Supabase. Leaving the client blank keeps it a standalone calendar entry.
 */
export function GcalEventEditModal({ event, clients, onClose, onSuccess }: Props) {
  const [title, setTitle]             = useState(event.title ?? '');
  // gcalIsoToDublinLocal renders the event's UTC start as Dublin wall-clock
  // so the datetime-local input shows the same time the admin sees on GCal.
  const [sessionDate, setSessionDate] = useState(gcalIsoToDublinLocal(event.start));
  const [format, setFormat]           = useState<'' | 'in_person' | 'online'>('');
  const [fee, setFee]                 = useState('');
  const [clientId, setClientId]       = useState('');
  const [clientQuery, setClientQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortedClients = useMemo(
    () => clients.slice().sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [clients],
  );
  const selectedClient = sortedClients.find(c => c.id === clientId) ?? null;
  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return sortedClients;
    return sortedClients.filter(c =>
      c.full_name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q),
    );
  }, [sortedClients, clientQuery]);

  function pickClient(c: ClientRow) {
    setClientId(c.id);
    setClientQuery('');
    setDropdownOpen(false);
    // Prefill fee from the client's default if not already set.
    if (!fee && c.session_fee) setFee(String(Math.round(c.session_fee / 100)));
  }

  function clearClient() {
    setClientId('');
    setClientQuery('');
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Event title is required.'); return; }
    if (!sessionDate)  { setError('Date and time is required.'); return; }

    setBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/calendar/event', {
        method: 'POST',
        body: JSON.stringify({
          gcal_event_id: event.id,
          title:         title.trim(),
          session_date:  sessionDate,
          session_format: format || undefined,
          fee:            fee ? Number(fee) : undefined,
          client_id:      clientId || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
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
        width: 'min(520px, 92vw)',
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
            }}>Calendar event</p>
            <h2 style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-montserrat), Avenir, sans-serif',
              fontWeight: 300, fontSize: 22, color: 'white',
            }}>Edit event</h2>
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
          {/* Title */}
          <div>
            <label className="admin-label">Event title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="admin-input"
              required
            />
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
              <label className="admin-label">Fee (€) <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>· optional</span></label>
              <input
                type="number"
                min={0}
                step={1}
                value={fee}
                onChange={e => setFee(e.target.value)}
                className="admin-input"
                placeholder="e.g. 80"
              />
            </div>
          </div>

          {/* Format (optional) */}
          <div>
            <label className="admin-label">Format <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>· optional</span></label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              {([
                { id: '',          label: 'Leave as is' },
                { id: 'in_person', label: 'In Person' },
                { id: 'online',    label: 'Online' },
              ] as const).map(opt => (
                <button
                  key={opt.id || 'none'}
                  type="button"
                  onClick={() => setFormat(opt.id)}
                  className={`admin-segmented-btn${format === opt.id ? ' is-active' : ''}`}
                  style={{ padding: '8px 14px' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Link to client (optional searchable dropdown) */}
          <div style={{ position: 'relative' }}>
            <label className="admin-label">
              Link to client <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>· optional</span>
            </label>

            {selectedClient ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 10, marginTop: 6,
                padding: '10px 14px', borderRadius: 10,
                border: '1px solid var(--line)', background: 'rgba(79,138,104,0.08)',
              }}>
                <span style={{ fontSize: 14, color: 'var(--forest-deep)' }}>
                  {selectedClient.full_name}
                  {selectedClient.email && (
                    <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}> · {selectedClient.email}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={clearClient}
                  className="admin-btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px' }}
                >
                  Clear
                </button>
              </div>
            ) : (
              <>
                <div style={{ position: 'relative', marginTop: 6 }}>
                  <Search
                    size={15}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)', pointerEvents: 'none' }}
                  />
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={e => { setClientQuery(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    onBlur={() => { blurTimer.current = setTimeout(() => setDropdownOpen(false), 150); }}
                    className="admin-input"
                    placeholder="Search clients…"
                    style={{ paddingLeft: 34 }}
                    autoComplete="off"
                  />
                </div>
                {dropdownOpen && (
                  <div
                    onMouseDown={() => { if (blurTimer.current) clearTimeout(blurTimer.current); }}
                    style={{
                      position: 'absolute', left: 0, right: 0, zIndex: 5,
                      marginTop: 4, maxHeight: 220, overflowY: 'auto',
                      background: 'white', border: '1px solid var(--line)',
                      borderRadius: 10, boxShadow: '0 12px 32px rgba(42,77,60,0.14)',
                    }}
                  >
                    {filteredClients.length === 0 ? (
                      <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink-muted)' }}>
                        No matching clients.
                      </div>
                    ) : (
                      filteredClients.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => pickClient(c)}
                          style={{
                            display: 'block', width: '100%', textAlign: 'left',
                            padding: '10px 14px', background: 'none', border: 'none',
                            cursor: 'pointer', fontSize: 14, color: 'var(--forest-deep)',
                            fontFamily: 'inherit',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,138,104,0.10)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          {c.full_name}
                          {c.email && <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}> · {c.email}</span>}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--ink-muted)' }}>
              Leave blank to keep this as a standalone Google Calendar event.
            </p>
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
            <button type="submit" disabled={busy || saved} className="admin-btn-primary">
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" onClick={onClose} className="admin-btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
