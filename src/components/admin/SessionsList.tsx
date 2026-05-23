'use client';

import { useEffect, useMemo, useState } from 'react';
import { List, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from './Avatar';
import { adminFetch, displayFee, formatDateTime, startOfWeek, isSameDay, formatTime } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SessionRow, CalendarEvent, SessionFilter } from './types';

interface Props {
  clients: ClientRow[];
  events: CalendarEvent[];
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onReload: () => void;
  /** Initial filter when the section is opened (e.g. via a Quick Action card). */
  initialFilter?: SessionFilter;
}

type View = 'list' | 'calendar';

function statusTag(status: string) {
  if (status === 'attended') return 'admin-tag-attended';
  if (status === 'cancelled' || status === 'no_show') return 'admin-tag-pause';
  return 'admin-tag-scheduled';
}
function statusLabel(status: string) {
  return status === 'attended' ? 'Attended'
    : status === 'cancelled' ? 'Cancelled'
    : status === 'no_show' ? 'No show'
    : 'Scheduled';
}
function payTag(status: string) {
  return status === 'paid' ? 'admin-tag-paid'
    : status === 'refunded' ? 'admin-tag-pause'
    : 'admin-tag-unpaid';
}
function payLabel(status: string) {
  return status === 'paid' ? 'Paid' : status === 'refunded' ? 'Refunded' : 'Unpaid';
}

const ACCENTS = ['e-sage', 'e-terra', 'e-gold', 'e-lilac'] as const;
function accentForName(name: string): typeof ACCENTS[number] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

export function SessionsList({ clients, events, weekOffset, onWeekOffsetChange, onReload, initialFilter }: Props) {
  const [view, setView] = useState<View>('list');
  const [filter, setFilter] = useState<SessionFilter>(initialFilter ?? 'all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Sync the local filter if a parent navigates here with a different intent.
  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  const rows = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    for (const c of clients) for (const s of c.sessions) out.push({ s, c });
    return out.sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());
  }, [clients]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    const now = new Date();
    const monday = startOfWeek(now);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 7);
    return rows.filter(({ s }) => {
      if (filter === 'unpaid') {
        return s.payment_status !== 'paid' && s.payment_status !== 'refunded' && s.status !== 'cancelled';
      }
      if (filter === 'needs_receipt') {
        return s.status === 'attended' && !s.receipt_sent_at;
      }
      if (filter === 'this_week') {
        const d = new Date(s.session_date);
        return d >= monday && d < sunday;
      }
      return true;
    });
  }, [rows, filter]);

  async function markAttended(sessionId: string, paymentStatus: string) {
    if (paymentStatus === 'unpaid') { setConfirmId(sessionId); return; }
    await doMark(sessionId);
  }
  async function doMark(sessionId: string) {
    setBusyId(sessionId); setConfirmId(null);
    try {
      await adminFetch('/api/admin/mark-attended', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId }),
      });
      onReload();
    } finally { setBusyId(null); }
  }
  async function sendReceipt(sessionId: string) {
    setBusyId(sessionId);
    try {
      await adminFetch('/api/admin/send-receipt', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId }),
      });
      onReload();
    } finally { setBusyId(null); }
  }

  const weekStart = (() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  })();
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div className="admin-segmented">
          {([
            { id: 'list', label: 'List', Icon: List },
            { id: 'calendar', label: 'Calendar', Icon: CalendarRange },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`admin-segmented-btn${view === id ? ' is-active' : ''}`}
            >
              <Icon size={13} strokeWidth={1.8} aria-hidden /> {label}
            </button>
          ))}
        </div>

        {view === 'list' && (
          <div className="admin-segmented">
            {([
              { id: 'all',           label: 'All' },
              { id: 'unpaid',        label: 'Unpaid' },
              { id: 'needs_receipt', label: 'Needs receipt' },
              { id: 'this_week',     label: 'This week' },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id)}
                className={`admin-segmented-btn${filter === t.id ? ' is-active' : ''}`}
              >{t.label}</button>
            ))}
          </div>
        )}

        {view === 'calendar' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <button onClick={() => onWeekOffsetChange(weekOffset - 1)} className="admin-btn-secondary" aria-label="Previous week">
              <ChevronLeft size={13} />
            </button>
            <div style={{ fontSize: 12, color: 'var(--forest-deep)', minWidth: 200, textAlign: 'center', letterSpacing: '0.4px' }}>
              {weekStart.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
              {' – '}
              {weekEnd.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <button onClick={() => onWeekOffsetChange(weekOffset + 1)} className="admin-btn-secondary" aria-label="Next week">
              <ChevronRight size={13} />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => onWeekOffsetChange(0)} className="admin-btn-secondary is-filled">
                Today
              </button>
            )}
          </div>
        )}
      </div>

      {view === 'list' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Date &amp; Time</th>
              <th>Format</th>
              <th>Fee</th>
              <th>Payment</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' as const }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' as const, padding: 28, color: 'var(--ink-muted)' }}>
                  {rows.length === 0 ? 'No sessions yet.' : `No sessions match the ${filter.replace('_', ' ')} filter.`}
                </td>
              </tr>
            )}
            {filtered.map(({ s, c }) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={c.full_name} size={32} />
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--forest-deep)' }}>{c.full_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' as const }}>{formatDateTime(s.session_date)}</td>
                <td>{FORMAT_LABELS[s.session_format] ?? s.session_format}</td>
                <td>{displayFee(s.fee)}</td>
                <td><span className={`admin-tag ${payTag(s.payment_status)}`}>{payLabel(s.payment_status)}</span></td>
                <td><span className={`admin-tag ${statusTag(s.status)}`}>{statusLabel(s.status)}</span></td>
                <td style={{ textAlign: 'right' as const }}>
                  <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {s.status === 'scheduled' && (
                      <button onClick={() => markAttended(s.id, s.payment_status)} disabled={busyId === s.id} className="admin-btn-primary" style={{ padding: '8px 14px', fontSize: 10 }}>
                        Attended
                      </button>
                    )}
                    <button onClick={() => sendReceipt(s.id)} disabled={busyId === s.id} className="admin-btn-secondary">
                      Receipt
                    </button>
                  </div>
                  {confirmId === s.id && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--terracotta)' }}>
                      Unpaid.{' '}
                      <button onClick={() => doMark(s.id)} style={confirmLink}>Confirm</button>
                      {' '}
                      <button onClick={() => setConfirmId(null)} style={confirmLinkMuted}>Cancel</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'calendar' && (
        <CalendarGrid clients={clients} events={events} weekOffset={weekOffset} />
      )}
    </div>
  );
}

function CalendarGrid({ clients, events, weekOffset }: { clients: ClientRow[]; events: CalendarEvent[]; weekOffset: number }) {
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = useMemo(() => {
    const monday = startOfWeek(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
    });
  }, [weekOffset]);

  function eventsForDay(day: Date) {
    const matched = new Set<string>();
    const out: Array<{ time: string; label: string; accent: typeof ACCENTS[number]; start: string }> = [];
    for (const c of clients) {
      for (const s of c.sessions) {
        const d = new Date(s.session_date);
        if (!isSameDay(d, day) || s.status === 'cancelled') continue;
        const ev = events.find(e => {
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
        });
      }
    }
    for (const e of events) {
      if (matched.has(e.id)) continue;
      if (!isSameDay(new Date(e.start), day)) continue;
      out.push({ time: formatTime(e.start), label: e.title || '(no title)', accent: 'e-gold', start: e.start });
    }
    return out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  return (
    <div className="admin-week-grid">
      {days.map((day, i) => {
        const dayEvents = eventsForDay(day);
        const isToday = isSameDay(day, new Date());
        return (
          <div key={i} className={`admin-day${isToday ? ' is-today' : ''}`}>
            <div className="admin-day-head">
              <div className="admin-day-name">{DAY_NAMES[i]}</div>
              <div className="admin-day-num">{day.getDate()}</div>
            </div>
            {dayEvents.length === 0 ? (
              <div className="admin-event-empty">No sessions</div>
            ) : (
              dayEvents.map((e, idx) => (
                <div key={idx} className={`admin-event ${e.accent}`}>
                  <div className="admin-event-time">{e.time}</div>
                  <div className="admin-event-name">{e.label}</div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}

const confirmLink: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0,
  color: 'var(--terracotta)', textDecoration: 'underline', cursor: 'pointer', fontSize: 11,
};
const confirmLinkMuted: React.CSSProperties = {
  ...confirmLink, color: 'var(--ink-muted)',
};
