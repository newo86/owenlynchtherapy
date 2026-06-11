'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Mail, CircleCheck } from 'lucide-react';
import { adminFetch, formatTime, isSameDay, startOfWeek, dedupeSessions } from './api';
import type { ClientRow, SessionRow, CalendarEvent, GcalRef } from './types';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ACCENTS = ['e-sage', 'e-terra', 'e-gold', 'e-lilac'] as const;
type Accent = typeof ACCENTS[number];

function accentForName(name: string): Accent {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function buildClickIso(day: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T17:00`;
}

interface MergedEvent {
  time: string;
  label: string;
  accent: Accent;
  start: string;
  format?: string;
  session?: SessionRow;
  client?: ClientRow;
  gcalId?: string;
  gcalLocation?: string;
}

export interface CalendarWeekGridProps {
  clients: ClientRow[];
  events: CalendarEvent[];
  weekOffset: number;
  onClickSession?: (session: SessionRow, client: ClientRow) => void;
  onScheduleDay?: (iso: string) => void;
  onReload: () => void;
  onReminderSession?: (session: SessionRow, client: ClientRow) => void;
  onEditGcalEvent?: (event: GcalRef) => void;
}

export function CalendarWeekGrid({
  clients, events, weekOffset, onClickSession, onScheduleDay, onReload, onReminderSession, onEditGcalEvent,
}: CalendarWeekGridProps) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);
  // Quick-pay tick: optimistic per-session paid override + a brief confirmation
  // flash, so the tick fills instantly without waiting on the reload round-trip.
  const [paidOverride, setPaidOverride] = useState<Record<string, 'paid' | 'unpaid'>>({});
  const [busyPaidId, setBusyPaidId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; text: string } | null>(null);

  const days = useMemo(() => {
    const monday = startOfWeek(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
    });
  }, [weekOffset]);

  useEffect(() => {
    if (!openCardId) return;
    function handler(e: MouseEvent) {
      const cardEl = document.querySelector(`[data-card-id="${openCardId}"]`);
      if (!cardEl || !cardEl.contains(e.target as Node)) setOpenCardId(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openCardId]);

  async function deleteSession(session: SessionRow) {
    if (!confirm('Delete this session?')) return;
    setBusyDeleteId(session.id);
    setOpenCardId(null);
    try {
      await adminFetch('/api/admin/sessions/delete', {
        method: 'POST',
        body: JSON.stringify({ session_id: session.id }),
      });
      onReload();
    } finally {
      setBusyDeleteId(null);
    }
  }

  async function deleteGcalEvent(gcalId: string) {
    if (!confirm('Delete this event from Google Calendar?')) return;
    setBusyDeleteId(gcalId);
    setOpenCardId(null);
    try {
      await adminFetch('/api/admin/sessions/delete', {
        method: 'POST',
        body: JSON.stringify({ gcal_event_id: gcalId }),
      });
      onReload();
    } finally {
      setBusyDeleteId(null);
    }
  }

  // Effective paid state: prefer the optimistic override while a toggle is in
  // flight (or until the reloaded data agrees), otherwise the stored status.
  function isPaid(s: SessionRow): boolean {
    const o = paidOverride[s.id];
    return o ? o === 'paid' : s.payment_status === 'paid';
  }

  async function togglePaid(session: SessionRow) {
    const next: 'paid' | 'unpaid' = isPaid(session) ? 'unpaid' : 'paid';
    setPaidOverride(prev => ({ ...prev, [session.id]: next }));
    setFlash({ id: session.id, text: next === 'paid' ? 'Marked as paid' : 'Marked as unpaid' });
    setBusyPaidId(session.id);
    try {
      // mark-paid (not sessions/update) so manual payments — e.g. a Revolut
      // transfer — are also logged to / removed from the finance ledger.
      const res = await adminFetch('/api/admin/mark-paid', {
        method: 'POST',
        body: JSON.stringify({
          session_id: session.id,
          action: next === 'paid' ? 'mark' : 'unmark',
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? 'update failed');
      }
      onReload();
    } catch (err) {
      // Revert the optimistic flip and let the user know it didn't take.
      setPaidOverride(prev => ({ ...prev, [session.id]: next === 'paid' ? 'unpaid' : 'paid' }));
      const msg = err instanceof Error && err.message.includes('Stripe')
        ? 'Stripe payment — refund via Stripe'
        : 'Could not update — try again';
      setFlash({ id: session.id, text: msg });
    } finally {
      setBusyPaidId(null);
    }
  }

  // Auto-dismiss the confirmation flash.
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1500);
    return () => clearTimeout(t);
  }, [flash]);

  // Drop overrides once the reloaded data reflects them, so the override never
  // masks a later change made elsewhere.
  useEffect(() => {
    setPaidOverride(prev => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      for (const c of clients) {
        for (const s of c.sessions) {
          if (next[s.id] && (next[s.id] === 'paid') === (s.payment_status === 'paid')) {
            delete next[s.id];
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [clients]);

  function eventsForDay(day: Date): MergedEvent[] {
    const matched = new Set<string>();
    const out: MergedEvent[] = [];

    for (const c of clients) {
      // Collapse duplicate rows (recurring-sync artefact) to the best one —
      // prefers the paid/attended row so a paid session never shows as unpaid.
      for (const s of dedupeSessions(c.sessions)) {
        const d = new Date(s.session_date);
        if (!isSameDay(d, day) || s.status === 'cancelled') continue;
        const ev = events.find(e => {
          if (s.gcal_event_id && s.gcal_event_id === e.id) return true;
          const eStart = new Date(e.start);
          if (!isSameDay(eStart, d)) return false;
          const sameTitle = e.title?.toLowerCase().includes(c.full_name.toLowerCase().split(' ')[0]);
          const closeInTime = Math.abs(eStart.getTime() - d.getTime()) < 30 * 60 * 1000;
          return sameTitle || closeInTime;
        });
        if (ev) matched.add(ev.id);
        out.push({
          time: formatTime(s.session_date),
          label: c.full_name,
          accent: accentForName(c.full_name),
          start: s.session_date,
          format: s.session_format,
          session: s,
          client: c,
        });
      }
    }

    for (const e of events) {
      if (matched.has(e.id)) continue;
      if (!isSameDay(new Date(e.start), day)) continue;
      out.push({
        time: formatTime(e.start),
        label: e.title || '(no title)',
        accent: 'e-gold',
        start: e.start,
        gcalId: e.id,
        gcalLocation: e.location,
      });
    }

    return out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  const clickable = !!onScheduleDay;
  const gcalEditable = !!onEditGcalEvent;

  return (
    <div className="admin-week-grid">
      {days.map((day, i) => {
        const dayEvents = eventsForDay(day);
        const isToday = isSameDay(day, new Date());
        const handleDayClick = clickable ? () => onScheduleDay!(buildClickIso(day)) : undefined;
        return (
          <div
            key={i}
            className={`admin-day${isToday ? ' is-today' : ''}${clickable ? ' admin-day-clickable' : ''}`}
            onClick={handleDayClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? e => { if (e.key === 'Enter' || e.key === ' ') handleDayClick!(); } : undefined}
            title={clickable ? `Schedule a session on ${day.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })}` : undefined}
          >
            <div className="admin-day-head">
              <div className="admin-day-name">{DAY_NAMES[i]}</div>
              <div className="admin-day-num">{day.getDate()}</div>
            </div>
            {dayEvents.length === 0 ? (
              <div className="admin-event-empty">{clickable ? '+ Add session' : 'No sessions'}</div>
            ) : (
              dayEvents.map((e, idx) => {
                const isSession = !!e.session && !!e.client;
                const isGcalOnly = !isSession && !!e.gcalId;
                const cardId = isSession ? e.session!.id : e.gcalId;
                const isOpen = !!cardId && openCardId === cardId;
                const isClickable = isSession || (isGcalOnly && gcalEditable);
                return (
                  <div
                    key={idx}
                    data-card-id={cardId}
                    className={`admin-event ${e.accent}${isClickable ? ' admin-event-clickable' : ''}${isOpen ? ' is-reveal-open' : ''}`}
                    onClick={isClickable
                      ? ev => { ev.stopPropagation(); setOpenCardId(prev => prev === cardId ? null : cardId!); }
                      : undefined}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={isClickable
                      ? ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.stopPropagation(); setOpenCardId(prev => prev === cardId ? null : cardId!); } }
                      : undefined}
                    title={isClickable && !isOpen ? `${e.label} — click for actions` : undefined}
                  >
                    <div className="admin-event-time">{e.time}</div>
                    <div className="admin-event-name">{e.label}</div>
                    {e.format === 'online' && (
                      <a
                        href="https://doxy.me/owenlynchtherapy"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={ev => ev.stopPropagation()}
                        style={{ fontSize: 9, opacity: 0.9, display: 'block', marginTop: 2, color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 1 }}
                      >↗ doxy.me</a>
                    )}

                    {flash && flash.id === cardId && (
                      <div className="admin-event-flash" role="status">{flash.text}</div>
                    )}

                    {isSession && (
                      <div className={`admin-event-actions${isOpen ? ' is-open' : ''}`}>
                        {onClickSession && (
                          <button
                            className="admin-event-action-btn"
                            onClick={ev => { ev.stopPropagation(); setOpenCardId(null); onClickSession(e.session!, e.client!); }}
                            title="Edit session"
                          >
                            <Pencil size={12} strokeWidth={2} />
                          </button>
                        )}
                        <button
                          className="admin-event-action-btn"
                          onClick={ev => { ev.stopPropagation(); void deleteSession(e.session!); }}
                          disabled={busyDeleteId === e.session!.id}
                          title="Delete session"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                        {onReminderSession && (
                          <button
                            className="admin-event-action-btn"
                            onClick={ev => { ev.stopPropagation(); setOpenCardId(null); onReminderSession(e.session!, e.client!); }}
                            title="Send reminder"
                          >
                            <Mail size={12} strokeWidth={2} />
                          </button>
                        )}
                        <button
                          className={`admin-event-action-btn${isPaid(e.session!) ? ' is-paid' : ''}`}
                          onClick={ev => { ev.stopPropagation(); void togglePaid(e.session!); }}
                          disabled={busyPaidId === e.session!.id}
                          title={isPaid(e.session!) ? 'Paid — click to mark unpaid' : 'Mark as paid'}
                        >
                          <CircleCheck size={13} strokeWidth={2.2} />
                        </button>
                      </div>
                    )}

                    {isGcalOnly && gcalEditable && (
                      <div className={`admin-event-actions${isOpen ? ' is-open' : ''}`}>
                        <button
                          className="admin-event-action-btn"
                          onClick={ev => {
                            ev.stopPropagation();
                            setOpenCardId(null);
                            onEditGcalEvent!({ id: e.gcalId!, title: e.label, start: e.start, location: e.gcalLocation });
                          }}
                          title="Edit event"
                        >
                          <Pencil size={12} strokeWidth={2} />
                        </button>
                        <button
                          className="admin-event-action-btn"
                          onClick={ev => { ev.stopPropagation(); void deleteGcalEvent(e.gcalId!); }}
                          disabled={busyDeleteId === e.gcalId}
                          title="Delete event"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
