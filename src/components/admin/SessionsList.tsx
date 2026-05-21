'use client';

import { useMemo, useState } from 'react';
import { List, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { colors, fonts, shadows, tableHeader } from './theme';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { WeekCalendar } from './WeekCalendar';
import { adminFetch, displayFee, formatDateTime, startOfWeek } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SessionRow, CalendarEvent } from './types';

interface Props {
  clients: ClientRow[];
  events: CalendarEvent[];
  onReload: () => void;
}

type View = 'list' | 'calendar';

export function SessionsList({ clients, events, onReload }: Props) {
  const [view, setView] = useState<View>('list');
  const [weekOffset, setWeekOffset] = useState(0);
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
    setBusyId(sessionId);
    setConfirmId(null);
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
        <div style={{ display: 'flex', gap: 4, padding: 4, background: colors.white, borderRadius: 6, border: `1px solid ${colors.border}` }}>
          {([
            { id: 'list', label: 'List', Icon: List },
            { id: 'calendar', label: 'Calendar', Icon: CalendarRange },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                background: view === id ? colors.forest : 'transparent',
                color: view === id ? colors.white : colors.forest,
                border: 'none',
                borderRadius: 4,
                fontFamily: fonts.sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              <Icon size={13} strokeWidth={1.8} aria-hidden /> {label}
            </button>
          ))}
        </div>

        {view === 'calendar' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
            <button onClick={() => setWeekOffset(o => o - 1)} style={navBtnStyle} aria-label="Previous week">
              <ChevronLeft size={16} strokeWidth={1.8} />
            </button>
            <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.forest, minWidth: 200, textAlign: 'center' }}>
              {weekStart.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
              {' – '}
              {weekEnd.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <button onClick={() => setWeekOffset(o => o + 1)} style={navBtnStyle} aria-label="Next week">
              <ChevronRight size={16} strokeWidth={1.8} />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  color: colors.terracotta,
                  border: 'none',
                  fontFamily: fonts.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >Today</button>
            )}
          </div>
        )}
      </div>

      {view === 'list' && (
        <div style={{
          background: colors.white,
          borderRadius: 8,
          borderTop: `3px solid ${colors.gold}`,
          boxShadow: shadows.card,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.sans }}>
            <thead style={{ background: `${colors.linen}80` }}>
              <tr>
                <th style={tableHeader}>Client</th>
                <th style={tableHeader}>Date & Time</th>
                <th style={tableHeader}>Format</th>
                <th style={tableHeader}>Fee</th>
                <th style={tableHeader}>Payment</th>
                <th style={tableHeader}>Status</th>
                <th style={{ ...tableHeader, textAlign: 'right' as const }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>No sessions yet.</td></tr>
              )}
              {rows.map(({ s, c }) => (
                <tr key={s.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={c.full_name} size={32} />
                      <div>
                        <div style={{ fontWeight: 500, color: colors.forest, fontSize: 13 }}>{c.full_name}</div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' as const }}>{formatDateTime(s.session_date)}</td>
                  <td style={tdStyle}>{FORMAT_LABELS[s.session_format] ?? s.session_format}</td>
                  <td style={tdStyle}>{displayFee(s.fee)}</td>
                  <td style={tdStyle}>
                    <Badge kind={s.payment_status === 'paid' ? 'paid'
                      : s.payment_status === 'refunded' ? 'refunded' : 'unpaid'} />
                  </td>
                  <td style={tdStyle}>
                    <Badge kind={s.status === 'attended' ? 'attended'
                      : s.status === 'cancelled' ? 'cancelled'
                      : s.status === 'no_show' ? 'no_show' : 'scheduled'} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' as const }}>
                    <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {s.status === 'scheduled' && (
                        <button
                          onClick={() => markAttended(s.id, s.payment_status)}
                          disabled={busyId === s.id}
                          style={primaryBtn}
                        >
                          Attended
                        </button>
                      )}
                      <button
                        onClick={() => sendReceipt(s.id)}
                        disabled={busyId === s.id}
                        style={ghostBtn}
                      >
                        Receipt
                      </button>
                    </div>
                    {confirmId === s.id && (
                      <div style={{ marginTop: 6, fontSize: 11, color: colors.terracottaDark }}>
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
        </div>
      )}

      {view === 'calendar' && (
        <WeekCalendar clients={clients} events={events} weekOffset={weekOffset} />
      )}
    </div>
  );
}

const tdStyle = {
  padding: '14px 16px',
  fontFamily: fonts.sans,
  fontSize: 13,
  color: colors.text,
  verticalAlign: 'middle' as const,
};

const navBtnStyle = {
  padding: 6,
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  borderRadius: 5,
  color: colors.forest,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center' as const,
};

const primaryBtn = {
  padding: '5px 10px',
  background: colors.forest,
  color: colors.white,
  border: 'none',
  borderRadius: 4,
  fontFamily: fonts.sans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '1.2px',
  textTransform: 'uppercase' as const,
  cursor: 'pointer' as const,
};

const ghostBtn = {
  padding: '5px 10px',
  background: 'transparent',
  color: colors.forest,
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  fontFamily: fonts.sans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '1.2px',
  textTransform: 'uppercase' as const,
  cursor: 'pointer' as const,
};

const confirmYes = {
  background: 'transparent',
  border: 'none',
  color: colors.terracotta,
  textDecoration: 'underline',
  cursor: 'pointer' as const,
  fontSize: 11,
  padding: 0,
};

const confirmNo = {
  background: 'transparent',
  border: 'none',
  color: colors.textMuted,
  textDecoration: 'underline',
  cursor: 'pointer' as const,
  fontSize: 11,
  padding: 0,
};
