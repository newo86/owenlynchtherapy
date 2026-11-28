'use client';

// "How often" for a client with an ongoing series (client record). Picking
// the other rhythm first asks the server what exactly would change and shows
// it ("From Tue 9 Dec, every 2 weeks. Cancels 4 sessions: …"); nothing is
// saved until "Change to every 2 weeks". Google Calendar is updated to match;
// the client isn't emailed. SeriesFrequencyView is presentational (used on
// /admin-demo).
//
// Focus: the confirm box takes focus when it opens; "Keep …" returns it to
// the option that was picked; after a change it moves to the result line.

import { useEffect, useId, useRef, useState } from 'react';
import { adminFetch } from './api';

interface ViewProps {
  interval: number;
  pending: { to: number; summary: string } | null;
  busy: boolean;
  message: { kind: 'ok' | 'alert'; text: string } | null;
  onPick: (to: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const label = (n: number) => (n === 1 ? 'Weekly' : `Every ${n} weeks`);
const lower = (n: number) => (n === 1 ? 'weekly' : `every ${n} weeks`);

export function SeriesFrequencyView({ interval, pending, busy, message, onPick, onConfirm, onCancel }: ViewProps) {
  const labelId = useId();
  const options = [...new Set([1, 2, interval])].sort((a, b) => a - b);
  const optionRefs = useRef(new Map<number, HTMLButtonElement>());
  const confirmRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const picked = useRef<number | null>(null);

  useEffect(() => { if (pending) confirmRef.current?.focus(); }, [pending]);
  useEffect(() => { if (message) msgRef.current?.focus(); }, [message]);

  const keep = () => {
    const back = picked.current;
    onCancel();
    if (back !== null) window.setTimeout(() => optionRefs.current.get(back)?.focus(), 0);
  };

  return (
    <div className="sf-box">
      <div className="sf-head">
        <p className="sf-label" id={labelId}>How often</p>
        <div className="admin-segmented sf-options" role="group" aria-labelledby={labelId}>
          {options.map(n => (
            <button
              key={n}
              ref={el => { if (el) optionRefs.current.set(n, el); else optionRefs.current.delete(n); }}
              type="button"
              className={`admin-segmented-btn${n === interval ? ' is-active' : ''}`}
              aria-pressed={n === interval}
              disabled={busy}
              onClick={() => { if (n !== interval) { picked.current = n; onPick(n); } }}
            >
              {label(n)}
            </button>
          ))}
        </div>
      </div>
      {pending && (
        <div ref={confirmRef} tabIndex={-1} className="sf-confirm" role="group" aria-label={`Change to ${lower(pending.to)}`}>
          <p className="sf-confirm-text">{pending.summary}</p>
          <div className="sf-actions">
            <button type="button" className="admin-btn-primary" disabled={busy} onClick={onConfirm}>
              {busy ? 'Changing…' : `Change to ${lower(pending.to)}`}
            </button>
            <button type="button" className="admin-btn-secondary" disabled={busy} onClick={keep}>Keep {lower(interval)}</button>
          </div>
        </div>
      )}
      {message && (
        <p ref={msgRef} tabIndex={-1} className={`sf-msg${message.kind === 'alert' ? ' is-alert' : ''}`} role={message.kind === 'ok' ? 'status' : 'alert'}>
          {message.text}
        </p>
      )}
    </div>
  );
}

export function SeriesFrequency({ clientId, onChanged }: { clientId: string; onChanged: () => void }) {
  const [series, setSeries] = useState<{ id: string; interval_weeks: number } | null>(null);
  const [pending, setPending] = useState<{ to: number; summary: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'alert'; text: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    adminFetch(`/api/admin/sessions/series?client_id=${encodeURIComponent(clientId)}`)
      .then(r => (r.ok ? r.json() : { series: null }))
      .then(j => { if (alive) setSeries(j.series ?? null); })
      .catch(() => { if (alive) setSeries(null); });
    return () => { alive = false; };
  }, [clientId, reloadKey]);

  if (!series) return null;

  async function send(to: number, confirm: boolean) {
    if (!series) return;
    setBusy(true); setMessage(null);
    try {
      const res = await adminFetch('/api/admin/sessions/series/interval', {
        method: 'POST',
        body: JSON.stringify({ series_id: series.id, interval_weeks: to, from_weeks: series.interval_weeks, confirm }),
      });
      const json = await res.json().catch(() => ({}));
      if (!confirm) {
        if (res.ok && json.ok) setPending({ to, summary: json.summary });
        else setMessage({ kind: 'alert', text: json.message ?? json.error ?? 'Couldn’t work out the change. Nothing was changed.' });
        return;
      }
      setPending(null);
      setMessage({ kind: res.ok && json.ok ? 'ok' : 'alert', text: json.message ?? 'That did not work. Nothing was changed.' });
      setReloadKey(k => k + 1);
      onChanged();
    } catch {
      setMessage({ kind: 'alert', text: 'No connection. Nothing was changed.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SeriesFrequencyView
      interval={series.interval_weeks}
      pending={pending}
      busy={busy}
      message={message}
      onPick={to => void send(to, false)}
      onConfirm={() => { if (pending) void send(pending.to, true); }}
      onCancel={() => setPending(null)}
    />
  );
}
