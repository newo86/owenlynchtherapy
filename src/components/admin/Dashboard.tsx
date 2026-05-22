'use client';

import { useMemo, useState } from 'react';
import {
  CalendarCheck2, ChevronLeft, ChevronRight,
  CalendarDays, Wallet, FileText, UsersRound,
} from 'lucide-react';
import { StatsCard } from './StatsCard';
import { SessionCard } from './SessionCard';
import { WeekCalendar } from './WeekCalendar';
import { adminFetch, isSameDay, startOfWeek } from './api';
import type { ClientRow, SessionRow, TokenRow, CalendarEvent, CalendarStatus } from './types';

interface Props {
  clients: ClientRow[];
  tokens: TokenRow[];
  events: CalendarEvent[];
  calendarStatus: CalendarStatus | null;
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onReload: () => void;
  onConnectCalendar: () => void;
}

export function Dashboard({
  clients, tokens, events, calendarStatus,
  weekOffset, onWeekOffsetChange,
  onReload, onConnectCalendar,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);

  const allSessions = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    for (const c of clients) for (const s of c.sessions) out.push({ s, c });
    return out;
  }, [clients]);

  const today = new Date();
  const monday = startOfWeek(today);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 7);

  const todaySessions = allSessions
    .filter(({ s }) => isSameDay(new Date(s.session_date), today) && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());

  const sessionsThisWeek = allSessions.filter(({ s }) => {
    const d = new Date(s.session_date);
    return d >= monday && d < sunday && s.status !== 'cancelled';
  });

  const eventsThisWeek = events.filter(e => {
    const d = new Date(e.start);
    return d >= monday && d < sunday;
  });

  const totalThisWeek = sessionsThisWeek.length;
  const outstanding = allSessions.filter(({ s }) =>
    s.payment_status === 'unpaid' && s.status !== 'cancelled' && new Date(s.session_date) <= today
  ).length;
  const formsPending = tokens.filter(t => !t.is_used && new Date(t.expires_at) > today).length;
  const activeClients = clients.filter(c => c.status === 'active').length;

  async function markAttended(sessionId: string, paymentStatus: string) {
    if (paymentStatus === 'unpaid') { setConfirmId(sessionId); return; }
    await doMarkAttended(sessionId);
  }

  async function doMarkAttended(sessionId: string) {
    setBusyId(sessionId);
    setConfirmId(null);
    try {
      const res = await adminFetch('/api/admin/mark-attended', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (!res.ok) { setFeedback({ id: sessionId, msg: json.error ?? 'Failed.' }); return; }
      setFeedback({ id: sessionId, msg: json.receipt_sent ? 'Marked attended — receipt sent.' : 'Marked attended.' });
      onReload();
    } catch {
      setFeedback({ id: sessionId, msg: 'Network error.' });
    } finally { setBusyId(null); }
  }

  async function sendReceipt(sessionId: string) {
    setBusyId(sessionId);
    try {
      const res = await adminFetch('/api/admin/send-receipt', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (!res.ok) { setFeedback({ id: sessionId, msg: json.error ?? 'Failed.' }); return; }
      setFeedback({ id: sessionId, msg: 'Receipt sent.' });
      onReload();
    } catch {
      setFeedback({ id: sessionId, msg: 'Network error.' });
    } finally { setBusyId(null); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: 16,
      }}>
        <StatsCard
          label="Sessions This Week"
          value={totalThisWeek}
          hint={eventsThisWeek.length > 0 ? `+${eventsThisWeek.length} calendar events` : undefined}
          Icon={CalendarDays}
        />
        <StatsCard
          label="Outstanding Payments"
          value={outstanding}
          hint={outstanding > 0 ? 'Past sessions, unpaid' : 'All clear'}
          Icon={Wallet}
        />
        <StatsCard
          label="Forms Pending"
          value={formsPending}
          hint="Links sent, not yet submitted"
          Icon={FileText}
        />
        <StatsCard
          label="Active Clients"
          value={activeClients}
          Icon={UsersRound}
        />
      </div>

      {/* Connect Google Calendar banner */}
      {calendarStatus && !calendarStatus.connected && (
        <div className="admin-glass" style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          border: '1px solid rgba(212, 168, 67, 0.45)',
        }}>
          <CalendarCheck2 size={20} strokeWidth={1.8} color="#D4A843" aria-hidden />
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>
              Connect Google Calendar
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              See your Google Calendar events alongside scheduled sessions.
            </div>
          </div>
          <button onClick={onConnectCalendar} className="admin-btn-primary">Connect</button>
        </div>
      )}

      {/* Today's sessions */}
      <section>
        <h2 className="admin-eyebrow">Today</h2>
        {todaySessions.length === 0 ? (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
            No sessions scheduled for today.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {todaySessions.map(({ s, c }) => (
              <SessionCard
                key={s.id}
                session={s}
                client={c}
                busy={busyId === s.id}
                feedback={feedback?.id === s.id ? feedback.msg : null}
                needsAttendedConfirm={confirmId === s.id}
                onMarkAttended={() => markAttended(s.id, s.payment_status)}
                onConfirmAttended={() => doMarkAttended(s.id)}
                onCancelConfirm={() => setConfirmId(null)}
                onSendReceipt={() => sendReceipt(s.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Week navigation + calendar */}
      <section>
        <WeekNavHeader weekOffset={weekOffset} onChange={onWeekOffsetChange} />
        <WeekCalendar clients={clients} events={events} weekOffset={weekOffset} />
      </section>
    </div>
  );
}

function WeekNavHeader({ weekOffset, onChange }: { weekOffset: number; onChange: (n: number) => void }) {
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);

  const sameMonth = monday.getMonth() === sunday.getMonth();
  const sameYear = monday.getFullYear() === sunday.getFullYear();
  const startLabel = monday.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: sameMonth ? undefined : 'short',
    year: sameYear ? undefined : 'numeric',
  });
  const endLabel = sunday.toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const heading = weekOffset === 0
    ? `This Week · ${startLabel}–${endLabel}`
    : `Week of ${startLabel}–${endLabel}`;

  return (
    <div className="admin-weeknav">
      <button type="button" onClick={() => onChange(weekOffset - 1)} className="admin-weeknav-btn" aria-label="Previous week">
        <ChevronLeft size={14} strokeWidth={1.9} /> Prev
      </button>

      <div className="admin-weeknav-label">{heading}</div>

      <div style={{ display: 'flex', gap: 8 }}>
        {weekOffset !== 0 && (
          <button type="button" onClick={() => onChange(0)} className="admin-weeknav-btn admin-weeknav-today">
            Today
          </button>
        )}
        <button type="button" onClick={() => onChange(weekOffset + 1)} className="admin-weeknav-btn" aria-label="Next week">
          Next <ChevronRight size={14} strokeWidth={1.9} />
        </button>
      </div>
    </div>
  );
}
