'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pencil, Trash2, Mail, CircleCheck } from 'lucide-react';
import { adminFetch, formatTime, isSameDay, startOfWeek, dedupeSessions } from './api';
import type { ClientRow, SessionRow, CalendarEvent, GcalRef } from './types';
import { PRACTICE } from '@/practice.config';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ACCENTS = ['e-sage', 'e-terra', 'e-gold', 'e-lilac', 'e-online'] as const;
type Accent = typeof ACCENTS[number];

/** Colour = what kind of appointment it is, so the week reads at a glance:
 *  in person sage, online blue, low cost gold, other calendar events lilac. */
function accentForSession(s: SessionRow, c: ClientRow): Accent {
  if (c.is_low_cost) return 'e-gold';
  return s.session_format === 'online' ? 'e-online' : 'e-sage';
}

const TYPE_LABEL: Record<string, string> = { 'e-sage': 'In person', 'e-online': 'Online', 'e-gold': 'Low cost', 'e-lilac': 'Calendar event' };

/** Unpaid only once the session has started: future sessions are always
 *  "unpaid" in the data and that isn't money owed yet. */
function isOwed(s: SessionRow): boolean {
  return s.payment_status !== 'paid' && s.payment_status !== 'refunded' && new Date(s.session_date) <= new Date();
}

export function CalendarLegend() {
  return (
    <div className="admin-cal-legend" aria-label="Calendar key">
      <span><i className="sw e-sage" />In person</span>
      <span><i className="sw e-online" />Online</span>
      <span><i className="sw e-gold" />Low cost</span>
      <span><i className="sw e-lilac" />Other calendar events</span>
      <span><i className="dot" style={{ background: '#4F8A68' }} />Reminder sent</span>
      <span><i className="dot" style={{ background: 'var(--terracotta)' }} />Not paid</span>
    </div>
  );
}

/** Most recent reminder timestamp for a session, or null if none logged. */
function lastReminderAt(s: SessionRow): string | null {
  const rows = s.session_reminders ?? [];
  let latest: string | null = null;
  for (const r of rows) if (!latest || r.sent_at > latest) latest = r.sent_at;
  return latest;
}

/** Traffic-light reminder status shown as a small dot in the card corner.
 *  green = a reminder was sent · orange = not sent yet, on a future day (the
 *  6 a.m. cron will send it) · red = it's today and nothing went out (a miss —
 *  send one by hand). No dot for past untracked sessions or opted-out clients. */
function reminderDot(s: SessionRow, c: ClientRow): { color: string; title: string } | null {
  if (c.reminders_opted_out) return null;
  const sent = lastReminderAt(s);
  if (sent) {
    const when = new Date(sent).toLocaleString('en-IE', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
    });
    return { color: '#4F8A68', title: `Reminder sent — ${when}` };
  }
  const d = new Date(s.session_date);
  const now = new Date();
  if (isSameDay(d, now)) {
    return { color: '#D64545', title: "No reminder went out for today — send one with the ✉ button." };
  }
  if (d.getTime() > now.getTime()) {
    return { color: '#E1922B', title: 'Reminder pending — it sends automatically the morning of the session.' };
  }
  return null; // past session with no reminder logged — nothing to action
}

function buildClickIso(day: Date): string {
  return buildClickIsoAt(day, 17);
}
function buildClickIsoAt(day: Date, hour: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:00`;
}

interface MergedEvent {
  time: string;
  label: string;
  accent: Accent;
  start: string;
  /** End time, for calendar events (sessions use the practice session length). */
  end?: string;
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
  // Preview card: follows the pointer on desktop, the tapped card on touch.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [peek, setPeek] = useState<{ id: string; ev: MergedEvent; top: number; left: number } | null>(null);
  function showPeek(id: string, ev: MergedEvent, el: HTMLElement) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const w = wrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const width = 260;
    let left = r.right - w.left + 10;
    if (left + width > w.width) left = r.left - w.left - width - 10;
    if (left < 0) left = Math.max(0, Math.min(r.left - w.left, w.width - width));
    const below = left === Math.max(0, Math.min(r.left - w.left, w.width - width));
    setPeek({ id, ev, left, top: below ? r.bottom - w.top + 8 : r.top - w.top });
  }
  const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;
  // Timed diary layout on wide screens; the day list on phones.
  const isWide = useSyncExternalStore(
    cb => { const m = window.matchMedia('(min-width: 769px)'); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => window.matchMedia('(min-width: 769px)').matches,
    () => true,
  );

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
      const res = await adminFetch('/api/admin/sessions/delete', {
        method: 'POST',
        body: JSON.stringify({ session_id: session.id }),
      });
      if (!res.ok) {
        setFlash({ id: session.id, text: 'Could not delete — try again' });
        return;
      }
      onReload();
    } catch {
      setFlash({ id: session.id, text: 'Could not delete — try again' });
    } finally {
      setBusyDeleteId(null);
    }
  }

  async function deleteGcalEvent(gcalId: string) {
    if (!confirm('Delete this event from Google Calendar?')) return;
    setBusyDeleteId(gcalId);
    setOpenCardId(null);
    try {
      const res = await adminFetch('/api/admin/sessions/delete', {
        method: 'POST',
        body: JSON.stringify({ gcal_event_id: gcalId }),
      });
      if (!res.ok) {
        setFlash({ id: gcalId, text: 'Could not delete — try again' });
        return;
      }
      onReload();
    } catch {
      setFlash({ id: gcalId, text: 'Could not delete — try again' });
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
          accent: accentForSession(s, c),
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
        accent: 'e-lilac',
        start: e.start,
        end: e.end,
        gcalId: e.id,
        gcalLocation: e.location,
      });
    }

    return out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  const clickable = !!onScheduleDay;
  const gcalEditable = !!onEditGcalEvent;

  // On touch, the preview belongs to the open card: closing the card (tap
  // elsewhere, Escape) hides it too.
  const peekShown = peek && (canHover() || openCardId === peek.id) ? peek : null;
  const peekCard = peekShown && (() => {
    const { ev } = peekShown;
    if (ev.session && ev.client) {
      const s = ev.session, c = ev.client;
      const n = dedupeSessions(c.sessions).filter(x => x.status !== 'cancelled' && new Date(x.session_date) < new Date(s.session_date)).length + 1;
      const dot = reminderDot(s, c);
      const paid = isPaid(s);
      return (
        <div className="admin-event-peek" role="dialog" aria-label={`Preview: ${c.full_name}`} style={{ top: peekShown.top, left: peekShown.left }}>
          <p className="admin-event-peek-name pii">{c.full_name}</p>
          <dl>
            <dt>Time</dt><dd>{ev.time} · {PRACTICE.sessionMinutes} min</dd>
            <dt>Type</dt><dd>{TYPE_LABEL[ev.accent]}</dd>
            <dt>Session</dt><dd>Number {n}</dd>
            <dt>Fee</dt><dd>€{Math.round(s.fee / 100)} · <span style={{ color: paid ? 'var(--sage)' : isOwed(s) ? 'var(--terracotta)' : 'var(--ink-muted)' }}>{paid ? 'paid' : isOwed(s) ? 'not paid' : 'not due yet'}</span></dd>
            <dt>Reminder</dt><dd>{c.reminders_opted_out ? 'Client opted out' : dot ? dot.title.split(' — ')[0] : 'None'}</dd>
          </dl>
        </div>
      );
    }
    return (
      <div className="admin-event-peek" role="dialog" aria-label={`Preview: ${ev.label}`} style={{ top: peekShown.top, left: peekShown.left }}>
        <p className="admin-event-peek-name">{ev.label}</p>
        <dl><dt>Time</dt><dd>{ev.time}</dd><dt>Type</dt><dd>Calendar event, not a client session</dd></dl>
      </div>
    );
  })();

  function renderCard(e: MergedEvent, key: string | number, style?: React.CSSProperties) {
                const isSession = !!e.session && !!e.client;
                const isGcalOnly = !isSession && !!e.gcalId;
                const cardId = isSession ? e.session!.id : e.gcalId;
                const isOpen = !!cardId && openCardId === cardId;
                const isClickable = isSession || (isGcalOnly && gcalEditable);
                return (
                  <div
                    key={key}
                    data-card-id={cardId}
                    style={style}
                    className={`admin-event ${e.accent}${isClickable ? ' admin-event-clickable' : ''}${isOpen ? ' is-reveal-open' : ''}`}
                    onClick={isClickable
                      ? ev => {
                          ev.stopPropagation();
                          const opening = openCardId !== cardId;
                          setOpenCardId(opening ? cardId! : null);
                          if (!canHover()) { if (opening) showPeek(cardId!, e, ev.currentTarget); else setPeek(null); }
                        }
                      : undefined}
                    onMouseEnter={cardId ? ev => { if (canHover()) showPeek(cardId, e, ev.currentTarget); } : undefined}
                    onMouseLeave={cardId ? () => { if (canHover()) setPeek(null); } : undefined}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={isClickable
                      ? ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.stopPropagation(); setOpenCardId(prev => prev === cardId ? null : cardId!); } }
                      : undefined}
                    title={isClickable && !isOpen ? `${e.label} — click for actions` : undefined}
                  >
                    {isSession && !isOpen && (() => {
                      const dot = reminderDot(e.session!, e.client!);
                      const owed = isOwed(e.session!) && !isPaid(e.session!);
                      return (dot || owed) ? (
                        <span className="admin-event-dots">
                          {owed && <span title="Not paid" style={{ background: 'var(--terracotta)' }} />}
                          {dot && <span title={dot.title} style={{ background: dot.color }} />}
                        </span>
                      ) : null;
                    })()}
                    <div className="admin-event-time">{e.time}</div>
                    <div className="admin-event-name">{e.label}</div>
                    {e.format === 'online' && PRACTICE.telehealthUrl && (
                      <a
                        href={PRACTICE.telehealthUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={ev => ev.stopPropagation()}
                        style={{ fontSize: 9, opacity: 0.9, display: 'block', marginTop: 2, color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 1 }}
                      >↗ room</a>
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
  }

  // ── Timed week (computers): sessions placed by the hour, like a diary.
  function renderTimed() {
    const PX = 64; // pixels per hour
    const perDay = days.map(d => eventsForDay(d));
    const endOf = (e: MergedEvent) => e.end ? new Date(e.end) : new Date(new Date(e.start).getTime() + PRACTICE.sessionMinutes * 60000);
    let minH = 15, maxH = 21;
    for (const evs of perDay) for (const e of evs) {
      const st = new Date(e.start), en = endOf(e);
      minH = Math.min(minH, st.getHours());
      maxH = Math.max(maxH, en.getHours() + (en.getMinutes() > 0 ? 1 : 0));
    }
    minH = Math.max(0, minH); maxH = Math.min(24, Math.max(maxH, minH + 1));
    const height = (maxH - minH) * PX;
    const hours = Array.from({ length: maxH - minH }, (_, k) => minH + k);
    const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

    // Side-by-side lanes for overlapping events within a day.
    function place(evs: MergedEvent[]) {
      const items = evs.map(e => ({ e, s: new Date(e.start).getTime(), en: endOf(e).getTime(), lane: 0, lanes: 1 }));
      let cluster: typeof items = []; let clusterEnd = -1;
      const flush = () => { const n = Math.max(1, ...cluster.map(c => c.lane + 1)); cluster.forEach(c => { c.lanes = n; }); cluster = []; };
      for (const it of items) {
        if (it.s >= clusterEnd && cluster.length) flush();
        const used = new Set(cluster.filter(c => c.en > it.s).map(c => c.lane));
        let lane = 0; while (used.has(lane)) lane++;
        it.lane = lane; cluster.push(it); clusterEnd = Math.max(clusterEnd, it.en);
      }
      if (cluster.length) flush();
      return items;
    }

    return (
      <div className="admin-tgrid">
        <div className="admin-tgrid-head">
          <span />
          {days.map((day, i) => (
            <div key={i} className={`admin-tgrid-day${isSameDay(day, new Date()) ? ' is-today' : ''}`}>
              <span className="name">{DAY_NAMES[i]}</span>
              <span className="num">{day.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="admin-tgrid-body" style={{ height }}>
          <div className="admin-tgrid-axis">
            {hours.map(h => <span key={h} style={{ top: (h - minH) * PX }}>{hourLabel(h)}</span>)}
          </div>
          {days.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={i}
                className={`admin-tgrid-col${isToday ? ' is-today' : ''}${clickable ? ' is-clickable' : ''}`}
                style={{ backgroundSize: `100% ${PX}px` }}
                onClick={clickable ? ev => {
                  const y = ev.clientY - ev.currentTarget.getBoundingClientRect().top;
                  const h = Math.min(maxH - 1, minH + Math.floor(y / PX));
                  onScheduleDay!(buildClickIsoAt(day, h));
                } : undefined}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={clickable ? e => { if (e.key === 'Enter' || e.key === ' ') onScheduleDay!(buildClickIso(day)); } : undefined}
                aria-label={clickable ? `Schedule a session on ${day.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })}` : undefined}
              >
                {place(perDay[i]).map((p, k) => {
                  const top = ((p.s - new Date(day).setHours(minH, 0, 0, 0)) / 3600000) * PX;
                  const h = Math.max(40, ((p.en - p.s) / 3600000) * PX - 4);
                  const w = 100 / p.lanes;
                  return renderCard(p.e, k, {
                    position: 'absolute', top: top + 2, height: h, margin: 0,
                    left: `calc(${p.lane * w}% + 4px)`, width: `calc(${w}% - 8px)`,
                  });
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-week-wrap" ref={wrapRef} onMouseLeave={() => { if (canHover()) setPeek(null); }}>
    <CalendarLegend />
    {isWide ? renderTimed() : (
    <div className="admin-week-grid">
      {days.map((day, i) => {
        const dayEvents = eventsForDay(day);
        const isToday = isSameDay(day, new Date());
        const handleDayClick = clickable ? () => onScheduleDay!(buildClickIso(day)) : undefined;
        return (
          <div
            key={i}
            className={`admin-day${isToday ? ' is-today' : ''}${dayEvents.length === 0 ? ' is-empty' : ''}${clickable ? ' admin-day-clickable' : ''}`}
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
              dayEvents.map((e, idx) => renderCard(e, idx))
            )}
          </div>
        );
      })}
    </div>
    )}
    {peekCard}
    </div>
  );
}
