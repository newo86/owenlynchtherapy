'use client';

// Month view, the way phone calendars work (Google / Apple): a grid of the
// month with a few coloured dots on days that have something, and the chosen
// day's appointments listed underneath. Tap a day to see it, swipe or use the
// arrows to change month. Sessions come from the dashboard's data; Google
// events for the visible weeks are fetched here as the month changes.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { adminFetch, isSameDay, startOfWeek } from './api';
import { useClock24 } from './clock24';
import { mergedEventsForDay, CalendarLegend, type MergedEvent } from './CalendarWeekGrid';
import type { CalendarEvent, ClientRow, GcalRef, SessionRow } from './types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  clients: ClientRow[];
  onClickSession?: (session: SessionRow, client: ClientRow) => void;
  onScheduleDay?: (iso: string) => void;
  onEditGcalEvent?: (event: GcalRef) => void;
}

/** The weeks that make up a month grid, starting on the Monday on or before the 1st. */
function gridDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = startOfWeek(first);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weeks = Math.ceil(((last.getTime() - start.getTime()) / 86_400_000 + 1) / 7);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function CalendarMonth({ clients, onClickSession, onScheduleDay, onEditGcalEvent }: Props) {
  const h23 = useClock24();
  const [month, setMonth] = useState(() => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), 1); });
  const [selected, setSelected] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const days = useMemo(() => gridDays(month), [month]);
  const gridStartMs = days[0].getTime();
  const weeks = days.length / 7;

  // Google events for the weeks on screen (its own fetch: the dashboard's one
  // follows the Week view, which may be showing a different part of the year).
  useEffect(() => {
    let alive = true;
    const offset = Math.round((gridStartMs - startOfWeek(new Date()).getTime()) / WEEK_MS);
    adminFetch(`/api/admin/calendar?weekOffset=${offset}&weeks=${weeks}`)
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (alive && j) setEvents(j.events ?? []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [gridStartMs, weeks]);

  const byDay = useMemo(() => {
    const m = new Map<string, MergedEvent[]>();
    for (const d of days) m.set(dayKey(d), mergedEventsForDay(clients, events, d, h23));
    return m;
  }, [days, clients, events, h23]);

  const today = new Date();
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();

  function goTo(target: Date) {
    const m = new Date(target.getFullYear(), target.getMonth(), 1);
    setMonth(m);
    const t = new Date();
    setSelected(m.getFullYear() === t.getFullYear() && m.getMonth() === t.getMonth() ? t : m);
  }
  const shift = (n: number) => goTo(new Date(month.getFullYear(), month.getMonth() + n, 1));

  function onTouchEnd(e: React.TouchEvent) {
    const t0 = touch.current; touch.current = null;
    if (!t0) return;
    const dx = e.changedTouches[0].clientX - t0.x;
    const dy = e.changedTouches[0].clientY - t0.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) shift(dx < 0 ? 1 : -1);
  }

  const list = byDay.get(dayKey(selected)) ?? [];
  const scheduleIso = `${selected.getFullYear()}-${pad(selected.getMonth() + 1)}-${pad(selected.getDate())}T17:00`;

  function open(e: MergedEvent) {
    if (e.session && e.client) onClickSession?.(e.session, e.client);
    else if (e.gcalId) onEditGcalEvent?.({ id: e.gcalId, title: e.label, start: e.start, location: e.gcalLocation });
  }

  function meta(e: MergedEvent): string {
    if (e.session) {
      const s = e.session;
      const owed = s.payment_status !== 'paid' && s.payment_status !== 'refunded' && new Date(s.session_date) <= new Date();
      return `${s.session_format === 'online' ? 'Online' : 'In person'} · €${Math.round(s.fee / 100)}${owed ? ' · Not paid' : ''}`;
    }
    return e.gcalLocation || 'Calendar event';
  }

  return (
    <div className="cm-root">
      <div className="cm-head">
        <h2 className="cm-title">{month.toLocaleDateString('en-IE', { month: 'long', year: 'numeric' })}</h2>
        <div className="cm-nav">
          {!isCurrentMonth && <button type="button" className="admin-link" onClick={() => goTo(new Date())}>Today</button>}
          <button type="button" className="admin-btn-secondary" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
          <button type="button" className="admin-btn-secondary" aria-label="Next month" onClick={() => shift(1)}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div
        className="cm-grid"
        onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
        onTouchEnd={onTouchEnd}
      >
        {WEEKDAYS.map(w => <div key={w} className="cm-wd" aria-hidden>{w}</div>)}
        {days.map(d => {
          const ents = byDay.get(dayKey(d)) ?? [];
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = isSameDay(d, today);
          const isSel = isSameDay(d, selected);
          const label = d.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });
          return (
            <button
              key={dayKey(d)}
              type="button"
              className={`cm-day${inMonth ? '' : ' is-out'}${isToday ? ' is-today' : ''}${isSel ? ' is-selected' : ''}`}
              aria-label={`${label}${ents.length ? `, ${ents.length} ${ents.length === 1 ? 'appointment' : 'appointments'}` : ''}`}
              aria-pressed={isSel}
              onClick={() => setSelected(d)}
            >
              <span className="cm-num">{d.getDate()}</span>
              <span className="cm-dots" aria-hidden>
                {ents.slice(0, 3).map((e, i) => <i key={i} className={`cm-dot ${e.accent}`} />)}
              </span>
            </button>
          );
        })}
      </div>

      <section className="cm-agenda" aria-live="polite">
        <div className="cm-agenda-head">
          <h3 className="cm-agenda-title">{selected.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
          {onScheduleDay && (
            <button type="button" className="admin-btn-secondary" onClick={() => onScheduleDay(scheduleIso)}>+ Schedule</button>
          )}
        </div>
        {list.length === 0 ? (
          <p className="admin-empty">Nothing on this day.</p>
        ) : (
          <ul className="cm-list">
            {list.map((e, i) => (
              <li key={`${e.start}-${i}`}>
                <button type="button" className={`cm-item ${e.accent}`} onClick={() => open(e)}>
                  <span className="cm-time">{e.time}</span>
                  <span className="cm-what">
                    <b className="pii">{e.label}</b>
                    <span className="pii">{meta(e)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <CalendarLegend />
    </div>
  );
}
