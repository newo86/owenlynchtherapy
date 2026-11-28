'use client';

// Phone home screen. Built for the end of a session: standing, one hand,
// thirty seconds. It shows only what that moment needs: who is in today (and
// whether their next session is booked), one button to schedule, and the free
// times, each saying whether it is free every week, every two weeks, or once.
// Money, hours and forms live behind the tab bar, not here.

import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, X, Check } from 'lucide-react';
import { PRACTICE } from '@/practice.config';
import { utcToDublinLocal } from '@/lib/dateUtils';
import { adminFetch, startOfWeek, dedupeSessions } from './api';
import { findFreeSlots, checkTime, CADENCE_LABEL, type Cadence, type FreeSlot, type OpeningHours } from './freeSlots';
import { PaymentPromptsPanel } from './PaymentPromptsPanel';
import { FollowedFromGooglePanel } from './FollowedFromGooglePanel';
import type { CalendarEvent, ClientRow, SessionRow } from './types';

const WEEKS_AHEAD = 8;
const LIST_DAYS = 14;

type Repeat = 'once' | 'weekly' | 'biweekly';
const REPEAT_LABEL: Record<Repeat, string> = { once: 'Once', weekly: 'Every week', biweekly: 'Every 2 weeks' };

const fmtDay = (local: string) => {
  const [y, m, d] = local.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};
const fmtTime = (local: string) => {
  const [h, m] = local.slice(11, 16).split(':').map(Number);
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}` : `${hh}${h < 12 ? 'am' : 'pm'}`;
};
const fmtWhen = (local: string) => `${fmtDay(local)}, ${fmtTime(local)}`;
const firstName = (full: string) => full.split(/\s+/)[0];

/** Weekly vs fortnightly, read from the client's two most recent sessions. */
function usualRepeat(c: ClientRow): Repeat {
  const dates = dedupeSessions(c.sessions)
    .filter(s => s.status !== 'cancelled')
    .map(s => new Date(s.session_date).getTime())
    .sort((a, b) => b - a);
  if (dates.length < 2) return 'weekly';
  const days = Math.round((dates[0] - dates[1]) / 86_400_000);
  return days >= 12 && days <= 16 ? 'biweekly' : 'weekly';
}

function lastFormat(c: ClientRow): 'in_person' | 'online' {
  const s = dedupeSessions(c.sessions)
    .filter(x => x.status !== 'cancelled')
    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];
  return s?.session_format === 'online' ? 'online' : 'in_person';
}

interface CalendarLoad { events: CalendarEvent[]; error: boolean; at: number }

async function fetchCalendar(): Promise<CalendarLoad> {
  try {
    const res = await adminFetch(`/api/admin/calendar?weekOffset=0&weeks=${WEEKS_AHEAD}`);
    const json = await res.json();
    const error = !res.ok || json.connected === false;
    return { events: error ? [] : (json.events ?? []), error, at: Date.now() };
  } catch {
    return { events: [], error: true, at: Date.now() };
  }
}

async function fetchHours(): Promise<{ open: OpeningHours[]; minutes: number } | null> {
  try {
    const res = await adminFetch('/api/admin/settings');
    if (!res.ok) return null;
    const { settings } = await res.json();
    return Array.isArray(settings?.openingHours) && Number(settings.sessionMinutes) > 0
      ? { open: settings.openingHours, minutes: Number(settings.sessionMinutes) }
      : null;
  } catch { return null; }
}

type CheckInput = Parameters<typeof checkTime>[1];

interface Props {
  clients: ClientRow[];
  todaySessions: Array<{ s: SessionRow; c: ClientRow }>;
  onOpenSession: (s: SessionRow, c: ClientRow) => void;
  onBooked: () => void;
}

export function MobileHome({ clients, todaySessions, onOpenSession, onBooked }: Props) {
  const [cal, setCal] = useState<CalendarLoad | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [sheet, setSheet] = useState<{ clientId?: string; slot?: FreeSlot } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Working hours as set on the Settings page (falls back to the config).
  const [hours, setHours] = useState<{ open: OpeningHours[]; minutes: number }>({
    open: [...PRACTICE.openingHours], minutes: PRACTICE.sessionMinutes,
  });
  useEffect(() => {
    let alive = true;
    fetchHours().then(h => { if (alive && h) setHours(h); });
    return () => { alive = false; };
  }, []);

  // Its own fetch, always from this week: the shared one follows whichever
  // week the Calendar tab last showed, and free times must never come from
  // the wrong weeks.
  useEffect(() => {
    let alive = true;
    fetchCalendar().then(r => { if (alive) setCal(r); });
    return () => { alive = false; };
  }, [reloadKey]);

  const events = cal?.events ?? null;
  const calError = cal?.error ?? false;
  const nowMs = cal?.at ?? 0;

  // Everything a clash check needs; shared by the free-time list and the
  // sheet's "Other time".
  const checkInput = useMemo(() => {
    if (!cal || cal.error) return null;
    const now = new Date(cal.at);
    const knownUntil = startOfWeek(now);
    knownUntil.setDate(knownUntil.getDate() + WEEKS_AHEAD * 7);
    return {
      sessionMinutes: hours.minutes,
      sessions: clients.flatMap(c => dedupeSessions(c.sessions)),
      events: cal.events,
      now,
      knownUntil,
    };
  }, [cal, clients, hours.minutes]);

  const slots = useMemo(
    () => checkInput ? findFreeSlots({ ...checkInput, hours: hours.open, days: LIST_DAYS }) : [],
    [checkInput, hours.open],
  );

  const byDay = useMemo(() => {
    const m = new Map<string, FreeSlot[]>();
    for (const s of slots) {
      const k = s.local.slice(0, 10);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return [...m.entries()];
  }, [slots]);

  const nextBooked = (c: ClientRow, after: string) => dedupeSessions(c.sessions)
    .filter(s => s.status === 'scheduled' && new Date(s.session_date).getTime() > Math.max(nowMs, new Date(after).getTime()))
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[0];

  const today = new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Dublin' });

  return (
    <div className="m-home">
      <header className="m-head">
        <h1 className="admin-h1">Today</h1>
        <p className="admin-subline">{today}</p>
      </header>

      {toast && <div className="admin-banner is-ok" role="status">{toast}</div>}

      <section className="m-today" aria-label="Today's clients">
        {todaySessions.length === 0 ? (
          <p className="admin-empty">No clients today.</p>
        ) : todaySessions.map(({ s, c }) => {
          const next = nextBooked(c, s.session_date);
          return (
            <div key={s.id} className="m-today-row">
              <button type="button" className="m-today-who" onClick={() => onOpenSession(s, c)}>
                <span className="m-time">{fmtTime(utcToDublinLocal(s.session_date))}</span>
                <span className="m-name pii">{c.full_name}</span>
                <span className="m-meta">
                  {next ? `Next: ${fmtWhen(utcToDublinLocal(next.session_date))}` : 'Next session not booked'}
                </span>
              </button>
              {!next && (
                <button type="button" className="m-book-next" onClick={() => setSheet({ clientId: c.id })}>
                  Book next
                </button>
              )}
            </div>
          );
        })}
      </section>

      <button type="button" className="m-schedule" onClick={() => setSheet({})}>
        <CalendarPlus size={20} strokeWidth={1.8} aria-hidden /> Schedule a client
      </button>

      <PaymentPromptsPanel onChanged={onBooked} compact />

      <FollowedFromGooglePanel onChanged={onBooked} />

      <section className="m-free" aria-label="Free times">
        <h2 className="admin-h2">Free times</h2>
        <p className="m-note">Next two weeks, from your working hours and Google Calendar. Tap one to book it.</p>
        {events === null && <p className="admin-empty">Checking your calendar…</p>}
        {calError && <p className="admin-empty">Couldn&apos;t read Google Calendar, so free times aren&apos;t shown. Check it&apos;s connected.</p>}
        {events !== null && !calError && byDay.length === 0 && <p className="admin-empty">No free times in the next two weeks.</p>}
        {byDay.map(([day, list]) => (
          <div key={day} className="m-day">
            <h3 className="m-day-label">{fmtDay(day)}</h3>
            <div className="m-slots">
              {list.map(slot => (
                <button key={slot.local} type="button" className={`m-slot is-${slot.cadence}`} onClick={() => setSheet({ slot })}>
                  <span className="m-slot-time">{fmtTime(slot.local)}</span>
                  <span className="m-slot-tag">{CADENCE_LABEL[slot.cadence]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {sheet && (
        <BookSheet
          clients={clients}
          slots={slots}
          checkInput={checkInput}
          initialClientId={sheet.clientId}
          initialSlot={sheet.slot}
          onClose={() => setSheet(null)}
          onBooked={msg => {
            setSheet(null);
            setToast(msg);
            window.setTimeout(() => setToast(null), 6000);
            onBooked();
            setReloadKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}

// ── Booking sheet ──────────────────────────────────────────────────────────

interface SheetProps {
  clients: ClientRow[];
  slots: FreeSlot[];
  checkInput: CheckInput | null;
  initialClientId?: string;
  initialSlot?: FreeSlot;
  onClose: () => void;
  onBooked: (msg: string) => void;
}

function BookSheet({ clients, slots, checkInput, initialClientId, initialSlot, onClose, onBooked }: SheetProps) {
  const active = useMemo(
    () => clients.filter(c => c.status === 'active' || c.status === 'new')
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [clients],
  );
  const initialClient = active.find(c => c.id === initialClientId);
  const [clientId, setClientId] = useState(initialClientId ?? '');
  const [query, setQuery] = useState('');
  const [slot, setSlot] = useState<FreeSlot | undefined>(initialSlot);
  // "Other time": any date and time, e.g. a lunchtime one-off outside working
  // hours. Still checked against the calendar before it can be chosen.
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherDate, setOtherDate] = useState('');
  const [otherTime, setOtherTime] = useState('');
  const [otherError, setOtherError] = useState('');
  function applyOtherTime() {
    if (!otherDate || !otherTime) { setOtherError('Pick a date and a time.'); return; }
    if (!checkInput) { setOtherError("Can't check your calendar right now, so this time can't be booked safely."); return; }
    const local = `${otherDate}T${otherTime}`;
    const cadence: Cadence | null = checkTime(local, checkInput);
    if (!cadence) { setOtherError('That time clashes with something in your calendar, or has passed.'); return; }
    setOtherError('');
    setOtherOpen(false);
    pickSlot({ local, startMs: 0, cadence });
  }
  const [format, setFormat] = useState<'in_person' | 'online'>(initialClient ? lastFormat(initialClient) : 'in_person');
  const [repeat, setRepeat] = useState<Repeat>(
    initialClient ? usualRepeat(initialClient)
      : initialSlot ? (initialSlot.cadence === 'fortnightly' ? 'biweekly' : initialSlot.cadence === 'once' ? 'once' : 'weekly')
        : 'weekly',
  );
  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const client = active.find(c => c.id === clientId);

  // Escape closes; the page behind doesn't scroll.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // Picking a time fits the repeat to it: a time free only every 2 weeks
  // books every 2 weeks, a one-off books once. The warning below is only for
  // when Owen then changes it to something that would clash.
  function pickSlot(next: FreeSlot) {
    setSlot(next);
    if (next.cadence === 'once') setRepeat('once');
    else if (next.cadence === 'fortnightly' && repeat === 'weekly') setRepeat('biweekly');
  }

  function pickClient(c: ClientRow) {
    setClientId(c.id);
    setFormat(lastFormat(c));
    if (!initialSlot) setRepeat(usualRepeat(c));
  }

  // Never book over something: weekly needs a time free every week, every
  // 2 weeks needs it free every other week.
  const clash = slot && (
    (repeat === 'weekly' && slot.cadence !== 'weekly')
    || (repeat === 'biweekly' && slot.cadence === 'once')
  );
  const needsFee = client && !client.session_fee;
  const feeCents = needsFee ? Math.round(Number(fee) * 100) : client?.session_fee ?? 0;
  const ready = client && slot && !clash && feeCents > 0;

  const matches = query.trim()
    ? active.filter(c => c.full_name.toLowerCase().includes(query.trim().toLowerCase()))
    : active;

  async function book() {
    if (!client || !slot || !ready) return;
    setBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/sessions', {
        method: 'POST',
        body: JSON.stringify({
          client_id: client.id,
          session_date: slot.local,
          session_format: format,
          fee: feeCents,
          recurrence: repeat,
          occurrence_count: repeat === 'once' ? 1 : 52,
          continuous: repeat !== 'once',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'Could not book that. Nothing was saved.'); return; }
      const what = `${firstName(client.full_name)} booked ${fmtWhen(slot.local)}${repeat === 'once' ? '' : `, ${REPEAT_LABEL[repeat].toLowerCase()}`}.`;
      onBooked(json.calendarAdded
        ? `${what} Added to Google Calendar.`
        : `${what} Saved here, but Google Calendar didn't take it: check the connection.`);
    } catch {
      setError('No connection. Nothing was saved.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="m-scrim" onClick={onClose}>
      <div className="m-sheet" role="dialog" aria-modal="true" aria-label="Book a session" onClick={e => e.stopPropagation()}>
        <div className="m-sheet-head">
          <h2 className="admin-h2">Book a session</h2>
          <button type="button" className="m-close" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>

        <div className="m-field">
          <span className="m-label">Client</span>
          {client ? (
            <div className="m-chosen">
              <span className="pii">{client.full_name}</span>
              <button type="button" className="admin-link" onClick={() => { setClientId(''); setQuery(''); }}>Change</button>
            </div>
          ) : (
            <>
              <input className="admin-input" placeholder="Type a name" value={query}
                onChange={e => setQuery(e.target.value)} autoComplete="off" />
              <div className="m-client-list">
                {matches.map(c => (
                  <button key={c.id} type="button" className="m-client" onClick={() => pickClient(c)}>
                    <span className="pii">{c.full_name}</span>
                  </button>
                ))}
                {matches.length === 0 && <p className="admin-empty">No client by that name.</p>}
              </div>
            </>
          )}
        </div>

        <div className="m-field">
          <span className="m-label">Time</span>
          {slot ? (
            <div className="m-chosen">
              <span>{fmtWhen(slot.local)} <small>· {CADENCE_LABEL[slot.cadence]}</small></span>
              <button type="button" className="admin-link" onClick={() => setSlot(undefined)}>Change</button>
            </div>
          ) : (
            <div className="m-slot-picker">
              {slots.length === 0 && <p className="admin-empty">No free times in the next two weeks.</p>}
              {slots.map(s => (
                <button key={s.local} type="button" className={`m-slot is-${s.cadence}`} onClick={() => pickSlot(s)}>
                  <span className="m-slot-time">{fmtWhen(s.local)}</span>
                  <span className="m-slot-tag">{CADENCE_LABEL[s.cadence]}</span>
                </button>
              ))}
            </div>
          )}
          {!slot && (otherOpen ? (
            <div className="m-other">
              <div className="m-other-row">
                <input className="admin-input" type="date" aria-label="Date" value={otherDate} onChange={e => setOtherDate(e.target.value)} />
                <input className="admin-input" type="time" aria-label="Time" step={300} value={otherTime} onChange={e => setOtherTime(e.target.value)} />
              </div>
              {otherError && <p className="m-warn" role="alert">{otherError}</p>}
              <button type="button" className="m-other-use" onClick={applyOtherTime}>Use this time</button>
            </div>
          ) : (
            <button type="button" className="admin-link m-other-open" onClick={() => setOtherOpen(true)}>
              Other time, outside your hours
            </button>
          ))}
        </div>

        <div className="m-field">
          <span className="m-label">Where</span>
          <div className="m-seg" role="radiogroup" aria-label="Format">
            {(['in_person', 'online'] as const).map(f => (
              <button key={f} type="button" role="radio" aria-checked={format === f}
                className={format === f ? 'is-on' : ''} onClick={() => setFormat(f)}>
                {f === 'in_person' ? 'In person' : 'Online'}
              </button>
            ))}
          </div>
        </div>

        <div className="m-field">
          <span className="m-label">Repeats</span>
          <div className="m-seg" role="radiogroup" aria-label="Repeats">
            {(['once', 'weekly', 'biweekly'] as const).map(r => (
              <button key={r} type="button" role="radio" aria-checked={repeat === r}
                className={repeat === r ? 'is-on' : ''} onClick={() => setRepeat(r)}>
                {REPEAT_LABEL[r]}
              </button>
            ))}
          </div>
          {clash && (
            <p className="m-warn" role="alert">
              {slot?.cadence === 'fortnightly'
                ? 'This time is only free every 2 weeks. Weekly would clash with another booking.'
                : 'This time is only free on this date. Repeating it would clash with another booking.'}
            </p>
          )}
        </div>

        {needsFee && (
          <div className="m-field">
            <span className="m-label">Fee (€)</span>
            <input className="admin-input" inputMode="numeric" value={fee} onChange={e => setFee(e.target.value.replace(/[^\d.]/g, ''))} placeholder="80" />
          </div>
        )}

        {error && <p className="m-warn" role="alert">{error}</p>}

        <button type="button" className="m-book" disabled={!ready || busy} onClick={() => void book()}>
          {busy ? 'Booking…' : <><Check size={18} aria-hidden /> {slot && client ? `Book ${fmtWhen(slot.local)}` : 'Book'}</>}
        </button>
      </div>
    </div>
  );
}
