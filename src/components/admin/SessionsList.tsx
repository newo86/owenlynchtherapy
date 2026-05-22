'use client';

import { useMemo, useState } from 'react';
import { List, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from './Avatar';
import { WeekCalendar } from './WeekCalendar';
import { adminFetch, displayFee, formatDateTime, startOfWeek } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SessionRow, CalendarEvent } from './types';

interface Props {
  clients: ClientRow[];
  events: CalendarEvent[];
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onReload: () => void;
}

type View = 'list' | 'calendar';

const STATUS_TONES: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  scheduled: { bg: 'rgba(255,255,255,0.07)', fg: 'rgba(255,255,255,0.7)',  border: 'rgba(255,255,255,0.14)', label: 'Scheduled' },
  attended:  { bg: 'rgba(212,168,67,0.15)',  fg: '#D4A843',                border: 'rgba(212,168,67,0.3)',   label: 'Attended' },
  cancelled: { bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.4)',  border: 'rgba(255,255,255,0.1)',  label: 'Cancelled' },
  no_show:   { bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.4)',  border: 'rgba(255,255,255,0.1)',  label: 'No show' },
};
const PAYMENT_TONES: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  paid:     { bg: 'rgba(79,138,104,0.2)',  fg: '#A6E3BD', border: 'rgba(79,138,104,0.35)', label: 'Paid' },
  unpaid:   { bg: 'rgba(200,90,26,0.22)',  fg: '#F4956A', border: 'rgba(200,90,26,0.4)',   label: 'Unpaid' },
  refunded: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.15)', label: 'Refunded' },
};

function Pill({ tones, kind }: { tones: typeof STATUS_TONES; kind: string }) {
  const t = tones[kind] ?? tones[Object.keys(tones)[0]];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 5,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
    }}>{t.label}</span>
  );
}

export function SessionsList({ clients, events, weekOffset, onWeekOffsetChange, onReload }: Props) {
  const [view, setView] = useState<View>('list');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    for (const c of clients) for (const s of c.sessions) out.push({ s, c });
    return out.sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());
  }, [clients]);

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

        {view === 'calendar' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <button onClick={() => onWeekOffsetChange(weekOffset - 1)} className="admin-weeknav-btn" aria-label="Previous week">
              <ChevronLeft size={14} strokeWidth={1.9} />
            </button>
            <div className="admin-weeknav-label" style={{ minWidth: 200, textAlign: 'center' }}>
              {weekStart.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
              {' – '}
              {weekEnd.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <button onClick={() => onWeekOffsetChange(weekOffset + 1)} className="admin-weeknav-btn" aria-label="Next week">
              <ChevronRight size={14} strokeWidth={1.9} />
            </button>
            {weekOffset !== 0 && (
              <button onClick={() => onWeekOffsetChange(0)} className="admin-weeknav-btn admin-weeknav-today">
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
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' as const, padding: 28, color: 'rgba(255,255,255,0.4)' }}>
                  No sessions yet.
                </td>
              </tr>
            )}
            {rows.map(({ s, c }) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={c.full_name} size={32} />
                    <div>
                      <div style={{ fontWeight: 500, color: 'white' }}>{c.full_name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' as const }}>{formatDateTime(s.session_date)}</td>
                <td>{FORMAT_LABELS[s.session_format] ?? s.session_format}</td>
                <td>{displayFee(s.fee)}</td>
                <td><Pill tones={PAYMENT_TONES} kind={s.payment_status} /></td>
                <td><Pill tones={STATUS_TONES} kind={s.status} /></td>
                <td style={{ textAlign: 'right' as const }}>
                  <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {s.status === 'scheduled' && (
                      <button onClick={() => markAttended(s.id, s.payment_status)} disabled={busyId === s.id} className="admin-btn-primary">
                        Attended
                      </button>
                    )}
                    <button onClick={() => sendReceipt(s.id)} disabled={busyId === s.id} className="admin-btn-secondary">
                      Receipt
                    </button>
                  </div>
                  {confirmId === s.id && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#F4956A' }}>
                      Unpaid.{' '}
                      <button onClick={() => doMark(s.id)} style={confirmYes}>Confirm</button>
                      {' '}
                      <button onClick={() => setConfirmId(null)} style={confirmNo}>Cancel</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {view === 'calendar' && (
        <WeekCalendar clients={clients} events={events} weekOffset={weekOffset} />
      )}
    </div>
  );
}

const confirmYes: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: '#F4956A', textDecoration: 'underline',
  cursor: 'pointer', fontSize: 11, padding: 0,
};

const confirmNo: React.CSSProperties = {
  background: 'transparent', border: 'none',
  color: 'rgba(255,255,255,0.45)', textDecoration: 'underline',
  cursor: 'pointer', fontSize: 11, padding: 0,
};
