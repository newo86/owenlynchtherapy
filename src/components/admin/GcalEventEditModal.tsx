'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, Check } from 'lucide-react';
import { adminFetch, gcalIsoToDublinLocal } from './api';
import type { ClientRow, GcalRef } from './types';

interface Props {
  gcalEvent: GcalRef;
  clients: ClientRow[];
  onClose: () => void;
  onSuccess: () => void;
}

function extractInitialFormat(location?: string): 'in_person' | 'online' {
  return location?.toLowerCase().includes('doxy') ? 'online' : 'in_person';
}

export function GcalEventEditModal({ gcalEvent, clients, onClose, onSuccess }: Props) {
  // Convert GCal RFC 3339 start → Dublin wall-clock "YYYY-MM-DDTHH:MM"
  const initialDate = gcalIsoToDublinLocal(gcalEvent.start);

  const [title, setTitle]         = useState(gcalEvent.title);
  const [sessionDate, setDate]    = useState(initialDate);
  const [format, setFormat]       = useState<'in_person' | 'online'>(extractInitialFormat(gcalEvent.location));
  const [fee, setFee]             = useState('');
  const [clientSearch, setSearch] = useState('');
  const [selectedId, setSelected] = useState('');
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState('');
  const [saved, setSaved]         = useState(false);

  // Pre-fill fee from the selected client's default rate.
  useEffect(() => {
    if (!selectedId) return;
    const c = clients.find(x => x.id === selectedId);
    if (c?.session_fee) setFee(String(Math.round(c.session_fee / 100)));
  }, [selectedId, clients]);

  const sorted = useMemo(
    () => [...clients].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [clients],
  );
  const filtered = useMemo(
    () => clientSearch.trim()
      ? sorted.filter(c => c.full_name.toLowerCase().includes(clientSearch.toLowerCase().trim()))
      : sorted,
    [sorted, clientSearch],
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())  { setError('Event title is required.'); return; }
    if (!sessionDate)   { setError('Date and time is required.'); return; }

    setBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/gcal-event/update', {
        method: 'POST',
        body: JSON.stringify({
          gcal_event_id:  gcalEvent.id,
          title:          title.trim(),
          session_date:   sessionDate,
          session_format: format,
          // fee in cents — only relevant when client_id is present
          fee:            fee ? Math.round(Number(fee) * 100) : undefined,
          client_id:      selectedId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Failed to save.'); return; }
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
          background: 'rgba(42,77,60,0.32)',
          zIndex: 90,
          animation: 'admin-fade-in 150ms ease',
        }}
      />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(42,77,60,0.18)',
        zIndex: 100,
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
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          borderRadius: '18px 18px 0 0',
        }}>
          <div>
            <p style={{
              margin: 0, fontSize: 10, fontWeight: 500,
              letterSpacing: '4px', textTransform: 'uppercase',
              color: 'var(--terracotta-soft)',
            }}>Google Calendar</p>
            <h2 style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-montserrat), Avenir, sans-serif',
              fontWeight: 300, fontSize: 22, color: 'white', letterSpacing: '0.5px',
            }}>Edit event</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 6, flexShrink: 0 }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <form onSubmit={save} style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Title */}
          <div>
            <label className="admin-label">Event title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="admin-input"
              required
              autoFocus
            />
          </div>

          {/* Date / time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="admin-label">Date &amp; time (Dublin)</label>
              <input
                type="datetime-local"
                value={sessionDate}
                onChange={e => setDate(e.target.value)}
                className="admin-input"
                required
              />
            </div>
            <div>
              <label className="admin-label">Format</label>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                {(['in_person', 'online'] as const).map(v => (
                  <label key={v} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    cursor: 'pointer', fontSize: 13, color: 'var(--forest-deep)',
                  }}>
                    <input
                      type="radio"
                      name="gcalFormat"
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
          </div>

          {/* Optional client link */}
          <div style={{ borderTop: '1px solid rgba(42,77,60,0.1)', paddingTop: 16 }}>
            <label className="admin-label" style={{ marginBottom: 6, display: 'block' }}>
              Link to client <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(optional)</span>
            </label>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
              If you select a client, a session record will be created so you can track payment and attendance.
              Leave blank to keep this as a standalone calendar event.
            </p>
            <input
              type="text"
              className="admin-input"
              placeholder="Search clients…"
              value={clientSearch}
              onChange={e => { setSearch(e.target.value); setSelected(''); setFee(''); }}
            />
            {clientSearch.trim().length > 0 && (
              <div style={{
                marginTop: 6,
                border: '1px solid var(--line)',
                borderRadius: 10,
                overflow: 'hidden',
                maxHeight: 200,
                overflowY: 'auto',
              }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink-muted)' }}>
                    No clients match &ldquo;{clientSearch}&rdquo;
                  </div>
                ) : (
                  filtered.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setSelected(c.id); setSearch(c.full_name); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '10px 14px',
                        background: selectedId === c.id ? 'rgba(79,138,104,0.10)' : 'white',
                        border: 'none', borderBottom: '1px solid var(--line)',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--forest-deep)' }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                          {c.email ?? '—'} · {c.sessions.length} session{c.sessions.length === 1 ? '' : 's'}
                        </div>
                      </div>
                      {selectedId === c.id && (
                        <span style={{ color: 'var(--sage)', fontSize: 13, fontWeight: 600 }}>✓</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Fee — only relevant when a client is linked */}
          {selectedId && (
            <div>
              <label className="admin-label">Session fee (€)</label>
              <input
                type="number"
                min={1}
                step={1}
                value={fee}
                onChange={e => setFee(e.target.value)}
                className="admin-input"
                placeholder="e.g. 80"
              />
            </div>
          )}

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
