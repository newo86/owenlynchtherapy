'use client';

// The Book sheet (prototype): client, how (In person / Online), repeats, time
// chips, Book. It books through the existing route (POST /api/admin/sessions)
// and keeps the old phone sheet's safety: only free times are offered, a repeat
// that would clash with something is warned about and can't be booked, and a
// time outside working hours ("Other time") is clash-checked against Google
// Calendar before it can be chosen. Nothing is emailed to the client.

import { useEffect, useMemo, useRef, useState } from 'react';
import { adminFetch } from '../api';
import { CADENCE_LABEL, checkTime, type Cadence, type FreeSlot } from '../freeSlots';
import { shortDay, firstName } from '../desktopToday';
import type { FreeTimes } from '../useFreeTimes';
import type { ClientRow } from '../types';
import { lastFormat, REPEAT_LABEL, REPEAT_WORDS, repeatClashes, repeatFor, usualRepeat, type Repeat } from './phoneHelpers';

interface Props {
  clients: ClientRow[];
  free: FreeTimes;
  title: string;
  initialClientId?: string;
  /** A free time to start on ("YYYY-MM-DDTHH:MM"). */
  initialSlot?: string;
  onClose: () => void;
  /** `ok` is false when the session saved but Google Calendar didn't take it. */
  onBooked: (message: string, ok: boolean) => void;
}

const MAX_CHIPS = 8;

export function PhoneBookSheet({ clients, free, title, initialClientId, initialSlot, onClose, onBooked }: Props) {
  const active = useMemo(
    () => clients.filter(c => c.status === 'active' || c.status === 'new').sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [clients],
  );
  const initialClient = active.find(c => c.id === initialClientId);
  const startSlot = initialSlot ? free.slots.find(s => s.local === initialSlot) ?? { local: initialSlot, startMs: 0, cadence: 'once' as Cadence } : free.slots[0];
  const [clientId, setClientId] = useState(initialClient?.id ?? '');
  const [format, setFormat] = useState<'in_person' | 'online'>(initialClient ? lastFormat(initialClient) : 'in_person');
  // Start on a repeat that fits the first free time, so the sheet never opens on a clash.
  const [repeat, setRepeat] = useState<Repeat>(
    startSlot ? repeatFor(startSlot, initialClient ? usualRepeat(initialClient) : 'weekly') : initialClient ? usualRepeat(initialClient) : 'weekly',
  );
  const [slot, setSlot] = useState<FreeSlot | undefined>(startSlot);
  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherDate, setOtherDate] = useState('');
  const [otherTime, setOtherTime] = useState('');
  const [otherError, setOtherError] = useState('');
  const firstField = useRef<HTMLSelectElement>(null);

  const client = active.find(c => c.id === clientId);
  const clash = repeatClashes(slot, repeat);
  const needsFee = Boolean(client && !client.session_fee);
  const feeCents = needsFee ? Math.round(Number(fee) * 100) : client?.session_fee ?? 0;
  const ready = Boolean(client && slot && !clash && feeCents > 0);

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function pickClient(id: string) {
    setClientId(id);
    const c = active.find(x => x.id === id);
    if (!c) return;
    setFormat(lastFormat(c));
    setRepeat(slot ? repeatFor(slot, usualRepeat(c)) : usualRepeat(c));
  }
  function pickSlot(next: FreeSlot) { setSlot(next); setRepeat(r => repeatFor(next, r)); }

  function useOther() {
    if (!otherDate || !otherTime) { setOtherError('Pick a date and a time.'); return; }
    if (!free.checkInput) { setOtherError("Can't check your calendar right now, so this time can't be booked safely."); return; }
    const local = `${otherDate}T${otherTime}`;
    const cadence = checkTime(local, free.checkInput);
    if (!cadence) { setOtherError('That time clashes with something in your calendar, or has passed.'); return; }
    setOtherError(''); setOtherOpen(false);
    pickSlot({ local, startMs: 0, cadence });
  }

  async function book() {
    if (!client || !slot || !ready) return;
    setBusy(true); setError('');
    try {
      const res = await adminFetch('/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          client_id: client.id, session_date: slot.local, session_format: format, fee: feeCents,
          recurrence: repeat, occurrence_count: repeat === 'once' ? 1 : 52, continuous: repeat !== 'once',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'Could not book that. Nothing was saved.'); return; }
      const what = `Booked: ${firstName(client.full_name)}, ${REPEAT_WORDS[repeat]} from ${shortDay(slot.local)}, ${slot.local.slice(11, 16)}.`;
      onBooked(json.calendarAdded ? what : `${what} Saved here, but Google Calendar didn't take it: check the connection.`, Boolean(json.calendarAdded));
    } catch { setError('No connection. Nothing was saved.'); } finally { setBusy(false); }
  }

  // The chosen time stays visible even if it isn't among the first few free ones.
  const chips = free.slots.slice(0, MAX_CHIPS);
  const shown = slot && !chips.some(c => c.local === slot.local) ? [slot, ...chips] : chips;
  const bookLabel = !slot ? 'Book'
    : repeat === 'once' ? `Book ${shortDay(slot.local)}, ${slot.local.slice(11, 16)}`
      : `Book ${REPEAT_WORDS[repeat]} from ${shortDay(slot.local)}, ${slot.local.slice(11, 16)}`;

  return (
    <>
      <button type="button" className="ph-scrim" aria-label="Close the booking sheet" onClick={onClose} tabIndex={-1} />
      <div className="ph-sheet" role="dialog" aria-modal="true" aria-labelledby="ph-book-title">
        <div className="ph-grab" aria-hidden />
        <h2 id="ph-book-title">{title}</h2>

        <label className="ph-field"><span className="ph-hint">Client</span>
          <select className="ph-select pii" ref={firstField} value={clientId} onChange={e => pickClient(e.target.value)}>
            <option value="">Choose a client</option>
            {active.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </label>

        <div className="ph-field"><span className="ph-hint" id="ph-how">How</span>
          <div className="sd-seg" role="radiogroup" aria-labelledby="ph-how">
            {([['in_person', 'In person'], ['online', 'Online']] as const).map(([v, label]) => (
              <button key={v} type="button" role="radio" aria-checked={format === v} onClick={() => setFormat(v)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="ph-field"><span className="ph-hint" id="ph-rep">Repeats</span>
          <div className="sd-seg" role="radiogroup" aria-labelledby="ph-rep">
            {(['once', 'weekly', 'biweekly'] as const).map(r => (
              <button key={r} type="button" role="radio" aria-checked={repeat === r} onClick={() => setRepeat(r)}>{REPEAT_LABEL[r]}</button>
            ))}
          </div>
          {clash && (
            <p className="ph-warn" role="alert">
              {slot?.cadence === 'fortnightly'
                ? 'This time is only free every 2 weeks. Weekly would clash with another booking.'
                : 'This time is only free on this date. Repeating it would clash with another booking.'}
            </p>
          )}
        </div>

        <div className="ph-field"><span className="ph-hint" id="ph-time">Time</span>
          {free.loading ? <p className="ph-note">Checking your calendar…</p>
            : free.unavailable ? <p className="ph-note">Couldn&apos;t read Google Calendar, so free times aren&apos;t shown. Check it&apos;s connected.</p>
              : (
                <div className="ph-chips" role="group" aria-labelledby="ph-time">
                  {shown.length === 0 && <p className="ph-note">No free times in the next four weeks.</p>}
                  {shown.map(s => (
                    <button key={s.local} type="button" className="ph-chip" aria-pressed={slot?.local === s.local}
                      aria-label={`${shortDay(s.local)}, ${s.local.slice(11, 16)}, ${CADENCE_LABEL[s.cadence]}`}
                      onClick={() => pickSlot(s)}>
                      {shortDay(s.local)}, {s.local.slice(11, 16)}
                    </button>
                  ))}
                </div>
              )}
          {slot && <p className="ph-note">{CADENCE_LABEL[slot.cadence]}</p>}
          {otherOpen ? (
            <div className="ph-field">
              <div className="ph-otherrow">
                <input className="ph-input" type="date" aria-label="Date" value={otherDate} onChange={e => setOtherDate(e.target.value)} />
                <input className="ph-input" type="time" aria-label="Time" step={300} value={otherTime} onChange={e => setOtherTime(e.target.value)} />
              </div>
              {otherError && <p className="ph-warn" role="alert">{otherError}</p>}
              <button type="button" className="ph-smallbtn" onClick={useOther}>Use this time</button>
            </div>
          ) : (
            <button type="button" className="ph-linkbtn" onClick={() => setOtherOpen(true)}>Other time, outside your hours</button>
          )}
        </div>

        {needsFee && (
          <label className="ph-field"><span className="ph-hint">Fee (€)</span>
            <input className="ph-input" inputMode="numeric" value={fee} placeholder="80" onChange={e => setFee(e.target.value.replace(/[^\d.]/g, ''))} />
          </label>
        )}

        {error && <p className="ph-warn" role="alert">{error}</p>}
        <button type="button" className="ph-do" disabled={!ready || busy} onClick={() => void book()}>{busy ? 'Booking…' : bookLabel}</button>
      </div>
    </>
  );
}
