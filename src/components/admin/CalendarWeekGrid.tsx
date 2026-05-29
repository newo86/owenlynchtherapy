'use client';

import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, Mail } from 'lucide-react';
import { adminFetch, formatTime, isSameDay, startOfWeek } from './api';
import type { ClientRow, SessionRow, CalendarEvent } from './types';

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
  gcalEvent?: CalendarEvent;
}

/** Build throwaway client/session objects from a standalone Google Calendar
 *  event so the existing SendReminderModal (which only reads full_name and
 *  session_date) can be reused for unlinked events. */
function syntheticReminderTargets(label: string, startIso: string): { session: SessionRow; client: ClientRow } {
  const client = { id: '', full_name: label, email: '' } as unknown as ClientRow;
  const session = { id: '', session_date: startIso } as unknown as SessionRow;
  return { session, client };
}

export interface CalendarWeekGridProps {
  clients: ClientRow[];
  events: CalendarEvent[];
  weekOffset: number;
  onClickSession?: (session: SessionRow, client: ClientRow) => void;
  onScheduleDay?: (iso: string) => void;
  onReload: () => void;
  onReminderSession?: (session: SessionRow, client: ClientRow) => void;
  /** Opens the edit modal for an unlinked Google Calendar event. */
  onEditGcalEvent?: (event: CalendarEvent) => void;
}

export function CalendarWeekGrid({
  clients, events, weekOffset, onClickSession, onScheduleDay, onReload, onReminderSession, onEditGcalEvent,
}: CalendarWeekGridProps) {
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [busyDeleteId, setBusyDeleteId] = useState<string | null>(null);

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
    if (!confirm('Delete this event? It will be removed from Google Calendar.')) return;
    setBusyDeleteId(gcalId);
    setOpenCardId(null);
    try {
      await adminFetch('/api/admin/calendar/event', {
        method: 'DELETE',
        body: JSON.stringify({ gcal_event_id: gcalId }),
      });
      onReload();
    } finally {
      setBusyDeleteId(null);
    }
  }

  function eventsForDay(day: Date): MergedEvent[] {
    const matched = new Set<string>();
    const out: MergedEvent[] = [];

    for (const c of clients) {
      for (const s of c.sessions) {
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
        gcalEvent: e,
      });
    }

    return out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  const clickable = !!onScheduleDay;

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
                // Every card — linked session or standalone GCal event — opens
                // the same slide reveal with edit / delete / reminder actions.
                const isClickable = isSession || isGcalOnly;
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

                    {(isSession || isGcalOnly) && (
                      <div className={`admin-event-actions${isOpen ? ' is-open' : ''}`}>
                        {/* Edit — session edit modal for linked sessions, the
                            standalone-event edit modal for unlinked GCal events. */}
                        {((isSession && onClickSession) || (isGcalOnly && onEditGcalEvent)) && (
                          <button
                            className="admin-event-action-btn"
                            onClick={ev => {
                              ev.stopPropagation();
                              setOpenCardId(null);
                              if (isSession) onClickSession!(e.session!, e.client!);
                              else onEditGcalEvent!(e.gcalEvent!);
                            }}
                            title="Edit"
                          >
                            <Pencil size={12} strokeWidth={2} />
                          </button>
                        )}
                        {/* Delete — from Supabase + GCal for linked sessions,
                            from GCal (and Supabase if a row exists) for events. */}
                        <button
                          className="admin-event-action-btn"
                          onClick={ev => {
                            ev.stopPropagation();
                            if (isSession) void deleteSession(e.session!);
                            else void deleteGcalEvent(e.gcalId!);
                          }}
                          disabled={busyDeleteId === (isSession ? e.session!.id : e.gcalId)}
                          title="Delete"
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                        {/* Send reminder — works for both; unlinked events use a
                            synthetic target built from the event. */}
                        {onReminderSession && (
                          <button
                            className="admin-event-action-btn"
                            onClick={ev => {
                              ev.stopPropagation();
                              setOpenCardId(null);
                              if (isSession) {
                                onReminderSession(e.session!, e.client!);
                              } else {
                                const t = syntheticReminderTargets(e.label, e.start);
                                onReminderSession(t.session, t.client);
                              }
                            }}
                            title="Send reminder"
                          >
                            <Mail size={12} strokeWidth={2} />
                          </button>
                        )}
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
