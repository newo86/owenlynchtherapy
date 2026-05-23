'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays, Users, FileText, Wallet,
  ChevronLeft, ChevronRight,
  CalendarCheck2, Check,
  CheckCircle2,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { adminFetch, displayFee, formatTime, isSameDay, startOfWeek } from './api';
import type {
  ClientRow, SessionRow, TokenRow,
  CalendarEvent, CalendarStatus, SessionFilter, FormsTab,
} from './types';

interface Props {
  clients: ClientRow[];
  tokens: TokenRow[];
  events: CalendarEvent[];
  calendarStatus: CalendarStatus | null;
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onReload: () => void;
  onConnectCalendar: () => void;
  onDisconnectCalendar: () => void;
  onNewClient: () => void;
  /** Called when the user clicks an empty calendar day. Receives a
   *  pre-filled "YYYY-MM-DDTHH:MM" string for the schedule modal. */
  onScheduleDay: (iso: string) => void;
  /** Navigate the admin to another section, optionally carrying a filter
   *  intent (sessions tab + initial filter / forms tab). */
  onNavigateSection: (section: 'sessions' | 'forms', opts?: {
    sessionsFilter?: SessionFilter;
    formsTab?: FormsTab;
  }) => void;
  greeting: string;
  dateLine: string;
  flash: { kind: 'success' | 'error'; msg: string } | null;
  sectionTitle: string;
}

type OutstandingScope = 'week' | 'month' | 'all';

// ── helpers ────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ACCENTS = ['e-sage', 'e-terra', 'e-gold', 'e-lilac'] as const;
type Accent = typeof ACCENTS[number];

/** Stable accent per client so the same person always shows in the same hue. */
function accentForName(name: string): Accent {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

/** Build a datetime-local string ("YYYY-MM-DDTHH:MM") for a clicked day,
 *  defaulting the time to 17:00 — a sensible "let me adjust this" placeholder. */
function buildClickIso(day: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T17:00`;
}

function meridiem(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IE', {
    hour: 'numeric', hour12: true, timeZone: 'Europe/Dublin',
  }).split(' ')[1] ?? '';
}
function shortTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  }).replace(/\s?(AM|PM)$/i, '');
}

// ── component ──────────────────────────────────────────────────────────────

export function Dashboard({
  clients, tokens, events, calendarStatus,
  weekOffset, onWeekOffsetChange,
  onReload, onConnectCalendar, onDisconnectCalendar, onNewClient,
  onScheduleDay, onNavigateSection,
  greeting, dateLine, flash, sectionTitle,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);
  const [outstandingScope, setOutstandingScope] = useState<OutstandingScope>('week');

  const today = new Date();
  const allSessions = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    for (const c of clients) for (const s of c.sessions) out.push({ s, c });
    return out;
  }, [clients]);

  const monday = startOfWeek(today);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 7);

  const todaySessions = allSessions
    .filter(({ s }) => isSameDay(new Date(s.session_date), today) && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());

  const sessionsThisWeek = allSessions.filter(({ s }) => {
    const d = new Date(s.session_date);
    return d >= monday && d < sunday && s.status !== 'cancelled';
  });
  const newClientsThisMonth = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    return clients.filter(c => new Date(c.created_at) >= startOfMonth).length;
  }, [clients]);

  // Outstanding payments scoped by the active filter pill (Week / Month / All).
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
  const inScope = (iso: string) => {
    const d = new Date(iso);
    if (outstandingScope === 'all')   return true;
    if (outstandingScope === 'week')  return d >= monday && d < sunday;
    return d >= startOfMonth;
  };
  const outstandingScoped = allSessions.filter(({ s }) =>
    s.payment_status !== 'paid' && s.payment_status !== 'refunded'
    && s.status !== 'cancelled' && inScope(s.session_date)
  );
  const outstandingCents = outstandingScoped.reduce((sum, { s }) => sum + (s.fee ?? 0), 0);
  const outstandingCount = outstandingScoped.length;

  // Unpaid this week — fixed scope, used by the Quick Actions "Unpaid" tile.
  const unpaidThisWeekCount = allSessions.filter(({ s }) => {
    const d = new Date(s.session_date);
    return s.payment_status !== 'paid' && s.payment_status !== 'refunded'
      && s.status !== 'cancelled' && d >= monday && d < sunday;
  }).length;

  // Attended sessions that haven't had a receipt emailed yet.
  const needsReceiptCount = allSessions.filter(({ s }) =>
    s.status === 'attended' && !s.receipt_sent_at
  ).length;

  const formsPending = tokens.filter(t => !t.is_used && new Date(t.expires_at) > today).length;
  const activeClients = clients.filter(c => c.status === 'active').length;

  // ── Mutations
  async function markAttended(sessionId: string, paymentStatus: string) {
    if (paymentStatus === 'unpaid') { setConfirmId(sessionId); return; }
    await doMarkAttended(sessionId);
  }
  async function doMarkAttended(sessionId: string) {
    setBusyId(sessionId); setConfirmId(null);
    try {
      const res = await adminFetch('/api/admin/mark-attended', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (!res.ok) { setFeedback({ id: sessionId, msg: json.error ?? 'Failed.' }); return; }
      setFeedback({ id: sessionId, msg: json.receipt_sent ? 'Marked attended — receipt sent.' : 'Marked attended.' });
      onReload();
    } catch { setFeedback({ id: sessionId, msg: 'Network error.' }); }
    finally { setBusyId(null); }
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
    } catch { setFeedback({ id: sessionId, msg: 'Network error.' }); }
    finally { setBusyId(null); }
  }

  // ── Revenue
  const revenue = useMemo(() => computeRevenue(allSessions), [allSessions]);

  return (
    <>
      {/* Topbar */}
      <header className="admin-topbar">
        <div>
          <p className="admin-eyebrow">{sectionTitle}</p>
          <h1 className="admin-h1">{greeting}, Owen</h1>
          <p className="admin-subline">{dateLine}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {calendarStatus?.connected ? (
            <button
              onClick={onDisconnectCalendar}
              className="admin-status-pill"
              style={{ cursor: 'pointer' }}
              title={calendarStatus.email ? `Connected as ${calendarStatus.email}` : 'Connected'}
            >
              <span className="admin-status-dot" />
              Calendar Connected
            </button>
          ) : (
            <button
              onClick={onConnectCalendar}
              className="admin-status-pill"
              style={{ cursor: 'pointer' }}
            >
              <span className="admin-status-dot is-off" />
              Calendar Not Connected
            </button>
          )}
          <button onClick={onNewClient} className="admin-btn-primary">
            + New Client
          </button>
        </div>
      </header>

      {flash && (
        <div style={{
          margin: '0 0 22px',
          padding: '12px 18px',
          borderRadius: 12,
          background: flash.kind === 'success' ? 'rgba(79,138,104,0.12)' : 'rgba(200,90,27,0.12)',
          border: `1px solid ${flash.kind === 'success' ? 'rgba(79,138,104,0.35)' : 'rgba(200,90,27,0.4)'}`,
          color: flash.kind === 'success' ? '#2D5A42' : '#A04714',
          fontSize: 13,
        }}>{flash.msg}</div>
      )}

      {/* Stats */}
      <div className="admin-stats">
        <StatCard
          label="Sessions this week"
          accent="terracotta"
          value={String(sessionsThisWeek.length)}
          Icon={CalendarDays}
          foot={events.length > 0 ? `+${events.length} calendar events` : 'No external events'}
          footKind="ok"
        />
        <StatCard
          label="Active clients"
          accent="sage"
          value={String(activeClients)}
          Icon={Users}
          foot={newClientsThisMonth > 0 ? `${newClientsThisMonth} new this month` : 'None new this month'}
          footKind="ok"
        />
        <StatCard
          label="Forms pending"
          accent="gold"
          value={String(formsPending)}
          Icon={FileText}
          foot={formsPending > 0 ? 'Links sent, awaiting reply' : 'All caught up'}
        />
        <StatCard
          label="Outstanding payments"
          accent="lilac"
          value={`€${Math.round(outstandingCents / 100)}`}
          Icon={Wallet}
          foot={
            outstandingCount > 0
              ? `${outstandingCount} invoice${outstandingCount === 1 ? '' : 's'} · ${
                  outstandingScope === 'week' ? 'this week'
                  : outstandingScope === 'month' ? 'this month'
                  : 'all time'
                }`
              : `All clear · ${outstandingScope === 'week' ? 'this week' : outstandingScope === 'month' ? 'this month' : 'all time'}`
          }
          footKind={outstandingCount > 0 ? 'warn' : 'ok'}
          pills={(
            <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
              {([
                { id: 'week',  label: 'Week' },
                { id: 'month', label: 'Month' },
                { id: 'all',   label: 'All' },
              ] as const).map(p => (
                <button
                  key={p.id}
                  onClick={() => setOutstandingScope(p.id)}
                  className={`admin-segmented-btn${outstandingScope === p.id ? ' is-active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: 9, letterSpacing: '1.5px' }}
                >{p.label}</button>
              ))}
            </div>
          )}
        />
      </div>

      {/* Today + Quick actions */}
      <div className="admin-row-split">
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <p className="admin-eyebrow">Today</p>
              <h2 className="admin-h2">{today.toLocaleDateString('en-IE', { weekday: 'long' })}&rsquo;s sessions</h2>
            </div>
            <button type="button" className="admin-link" onClick={() => onWeekOffsetChange(0)}>
              View calendar →
            </button>
          </div>

          {todaySessions.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: 0 }}>
              No sessions scheduled for today.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todaySessions.map(({ s, c }) => (
                <SessionRow
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

          {!calendarStatus?.connected && (
            <div style={{
              marginTop: 14,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'rgba(212,168,67,0.12)',
              border: '1px solid rgba(212,168,67,0.35)',
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            }}>
              <CalendarCheck2 size={18} color="#a3801a" />
              <span style={{ fontSize: 13, color: 'var(--forest-deep)', flex: 1 }}>
                Connect Google Calendar to see external events here.
              </span>
              <button onClick={onConnectCalendar} className="admin-btn-secondary">Connect</button>
            </div>
          )}
        </section>

        <QuickActions
          unpaidThisWeek={unpaidThisWeekCount}
          needsReceipt={needsReceiptCount}
          formsPending={formsPending}
          pendingNames={tokens.filter(t => !t.is_used && new Date(t.expires_at) > today).map(t => t.client_name ?? '—')}
          onNavigateSection={onNavigateSection}
        />
      </div>

      {/* Week schedule */}
      <section className="admin-card admin-week-card">
        <div className="admin-card-head">
          <div>
            <p className="admin-eyebrow">Schedule</p>
            <h2 className="admin-h2">{weekLabel(weekOffset)}</h2>
          </div>
          <div style={{ display: 'inline-flex', gap: 6 }}>
            <button onClick={() => onWeekOffsetChange(weekOffset - 1)} className="admin-btn-secondary" aria-label="Previous week">
              <ChevronLeft size={13} /> Prev
            </button>
            <button onClick={() => onWeekOffsetChange(0)} className="admin-btn-secondary is-filled">
              Today
            </button>
            <button onClick={() => onWeekOffsetChange(weekOffset + 1)} className="admin-btn-secondary" aria-label="Next week">
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <WeekGrid clients={clients} events={events} weekOffset={weekOffset} onClickDay={onScheduleDay} />
      </section>

      {/* Revenue + Recent clients */}
      <div className="admin-row-bottom">
        <RevenueCard revenue={revenue} />
        <RecentClientsCard clients={clients} />
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface StatProps {
  label: string;
  value: string;
  accent: 'terracotta' | 'sage' | 'gold' | 'lilac';
  Icon: typeof CalendarDays;
  foot: string;
  footKind?: 'ok' | 'warn' | 'neutral';
  pills?: React.ReactNode;
}

function StatCard({ label, value, accent, Icon, foot, footKind = 'neutral', pills }: StatProps) {
  const palette = {
    terracotta: { strip: 'var(--terracotta)',  blob: '#f6dfd0', iconBg: 'rgba(200,90,27,0.12)', iconFg: 'var(--terracotta)' },
    sage:       { strip: 'var(--sage)',        blob: '#d8e8de', iconBg: 'rgba(79,138,104,0.14)', iconFg: 'var(--sage)' },
    gold:       { strip: 'var(--gold)',        blob: '#f6e9c2', iconBg: 'rgba(212,168,67,0.18)', iconFg: 'var(--gold-dark)' },
    lilac:      { strip: 'var(--lilac)',       blob: '#e3d3eb', iconBg: 'rgba(168,124,185,0.16)', iconFg: 'var(--lilac-dark)' },
  }[accent];

  return (
    <div className="admin-stat">
      <div className="admin-stat-accent" style={{ background: palette.strip }} />
      <div className="admin-stat-blob" style={{ background: palette.blob }} aria-hidden />
      <div className="admin-stat-top">
        <div className="admin-stat-label">{label}</div>
        <div className="admin-stat-icontile" style={{ background: palette.iconBg, color: palette.iconFg }}>
          <Icon size={20} strokeWidth={1.7} aria-hidden />
        </div>
      </div>
      <div className="admin-stat-value">{value}</div>
      <div className={`admin-stat-foot${footKind === 'ok' ? ' ok' : footKind === 'warn' ? ' warn' : ''}`}>
        {footKind === 'ok' && <CheckCircle2 size={13} strokeWidth={2} />}
        {foot}
      </div>
      {pills}
    </div>
  );
}

interface SessionRowProps {
  session: SessionRow;
  client: ClientRow;
  busy?: boolean;
  feedback?: string | null;
  needsAttendedConfirm?: boolean;
  onMarkAttended?: () => void;
  onConfirmAttended?: () => void;
  onCancelConfirm?: () => void;
  onSendReceipt?: () => void;
}

function SessionRow({
  session, client, busy, feedback,
  needsAttendedConfirm,
  onMarkAttended, onConfirmAttended, onCancelConfirm, onSendReceipt,
}: SessionRowProps) {
  const formatTag = session.session_format === 'in_person' ? 'admin-tag-inperson' : 'admin-tag-online';
  const formatLabel = session.session_format === 'in_person' ? 'In person' : 'Online';
  const paymentTag = session.payment_status === 'paid' ? 'admin-tag-paid' : 'admin-tag-unpaid';
  const paymentLabel = session.payment_status === 'paid' ? 'Paid' : 'Unpaid';

  return (
    <div className="admin-session-row">
      <div className="admin-session-time">
        {shortTime(session.session_date)}
        <span className="admin-session-time-meridiem">{meridiem(session.session_date)}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Avatar name={client.full_name} size={38} />
        <div style={{ minWidth: 0 }}>
          <div className="admin-session-name">{client.full_name}</div>
          <div className="admin-session-meta">
            {displayFee(session.fee)} · 50 min
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className={`admin-tag ${formatTag}`}>{formatLabel}</span>
          <span className={`admin-tag ${paymentTag}`}>{paymentLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {session.status === 'scheduled' && onMarkAttended && (
            <button onClick={onMarkAttended} disabled={busy} className="admin-btn-primary" style={{ padding: '8px 14px', fontSize: 10 }}>
              Mark Attended
            </button>
          )}
          {onSendReceipt && (
            <button onClick={onSendReceipt} disabled={busy} className="admin-btn-secondary">
              Send Receipt
            </button>
          )}
        </div>
        {needsAttendedConfirm && (
          <div style={{ fontSize: 11, color: 'var(--terracotta)' }}>
            Unpaid.{' '}
            <button onClick={onConfirmAttended} style={confirmLink}>Confirm</button>
            {' '}
            <button onClick={onCancelConfirm} style={confirmLinkMuted}>Cancel</button>
          </div>
        )}
        {feedback && (
          <div style={{ fontSize: 11, color: 'var(--sage)' }}>{feedback}</div>
        )}
      </div>
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

interface QuickProps {
  unpaidThisWeek: number;
  needsReceipt: number;
  formsPending: number;
  pendingNames: string[];
  onNavigateSection: (section: 'sessions' | 'forms', opts?: { sessionsFilter?: SessionFilter; formsTab?: FormsTab }) => void;
}

function QuickActions({ unpaidThisWeek, needsReceipt, formsPending, pendingNames, onNavigateSection }: QuickProps) {
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <p className="admin-eyebrow">Needs your attention</p>
          <h2 className="admin-h2">Quick actions</h2>
        </div>
      </div>

      <div className="admin-quickgrid">
        {/* Unpaid sessions this week */}
        <button
          type="button"
          onClick={() => onNavigateSection('sessions', { sessionsFilter: 'unpaid' })}
          className="admin-task warn"
        >
          <div className="admin-task-eyebrow">Unpaid · {unpaidThisWeek}</div>
          <div className="admin-task-title">
            {unpaidThisWeek === 0 ? 'All clear this week' : 'Unpaid this week'}
          </div>
          <div className="admin-task-body">
            {unpaidThisWeek === 0
              ? 'No unpaid sessions in the current week.'
              : `${unpaidThisWeek} unpaid this week`}
          </div>
          <div className="admin-task-cta">View unpaid</div>
        </button>

        {/* Attendance + receipts */}
        <button
          type="button"
          onClick={() => onNavigateSection('sessions', { sessionsFilter: 'needs_receipt' })}
          className="admin-task info"
        >
          <div className="admin-task-eyebrow">Attendance · {needsReceipt}</div>
          <div className="admin-task-title">
            {needsReceipt === 0 ? 'Receipts up to date' : 'Mark attended &amp; send receipts'}
          </div>
          <div className="admin-task-body">
            {needsReceipt === 0
              ? 'Every attended session has its receipt logged.'
              : `${needsReceipt} attended session${needsReceipt === 1 ? '' : 's'} need${needsReceipt === 1 ? 's' : ''} a receipt sent.`}
          </div>
          <div className="admin-task-cta">Open sessions</div>
        </button>

        {/* Forms pending */}
        <button
          type="button"
          onClick={() => onNavigateSection('forms', { formsTab: 'pending' })}
          className="admin-task gold"
        >
          <div className="admin-task-eyebrow">Forms pending · {formsPending}</div>
          <div className="admin-task-title">
            {formsPending === 0 ? 'All caught up' : 'Intake forms outstanding'}
          </div>
          <div className="admin-task-body">
            {formsPending === 0
              ? 'No outstanding intake links.'
              : `${pendingNames.slice(0, 2).join(' & ')}${pendingNames.length > 2 ? ` and ${pendingNames.length - 2} other${pendingNames.length - 2 === 1 ? '' : 's'}` : ''} haven't returned theirs.`}
          </div>
          <div className="admin-task-cta">Review status</div>
        </button>

        {/* Inbox — opens Gmail in a new tab */}
        <a
          href="https://mail.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-task lilac"
          style={{ textDecoration: 'none' }}
        >
          <div className="admin-task-eyebrow">Inbox</div>
          <div className="admin-task-title">Open Gmail</div>
          <div className="admin-task-body">
            Jump to your inbox at info@owenlynchtherapy.com.
          </div>
          <div className="admin-task-cta">Open inbox</div>
        </a>
      </div>
    </section>
  );
}

// ── Week grid (light-themed) ───────────────────────────────────────────────

function WeekGrid({ clients, events, weekOffset, onClickDay }: {
  clients: ClientRow[];
  events: CalendarEvent[];
  weekOffset: number;
  onClickDay?: (iso: string) => void;
}) {
  const days = useMemo(() => {
    const monday = startOfWeek(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
    });
  }, [weekOffset]);

  function eventsForDay(day: Date) {
    const matched = new Set<string>();
    const out: Array<{ time: string; label: string; accent: Accent; start: string }> = [];
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
      out.push({
        time: formatTime(e.start),
        label: e.title || '(no title)',
        accent: 'e-gold',
        start: e.start,
      });
    }
    return out.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  return (
    <div className="admin-week-grid">
      {days.map((day, i) => {
        const dayEvents = eventsForDay(day);
        const isToday = isSameDay(day, new Date());
        const clickable = !!onClickDay;
        const handleClick = clickable
          ? () => onClickDay!(buildClickIso(day))
          : undefined;
        return (
          <div
            key={i}
            className={`admin-day${isToday ? ' is-today' : ''}${clickable ? ' admin-day-clickable' : ''}`}
            onClick={handleClick}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable
              ? e => { if (e.key === 'Enter' || e.key === ' ') handleClick!(); }
              : undefined}
            title={clickable ? `Schedule a session on ${day.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' })}` : undefined}
          >
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

function weekLabel(weekOffset: number) {
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  const sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const startLabel = monday.toLocaleDateString('en-IE', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endLabel = sunday.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
  const prefix = weekOffset === 0 ? 'Week of' : 'Week of';
  return `${prefix} ${startLabel}–${endLabel}`;
}

// ── Revenue + Recent clients cards ────────────────────────────────────────

interface Revenue {
  monthTotalCents: number;
  prevMonthCents: number;
  weekBars: Array<{ day: string; value: number; cents: number }>;
}

function computeRevenue(all: Array<{ s: SessionRow; c: ClientRow }>): Revenue {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrev = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthCents = all
    .filter(({ s }) => {
      const d = new Date(s.session_date);
      return d >= startOfMonth && d <= now && s.status === 'attended' && s.payment_status === 'paid';
    })
    .reduce((sum, { s }) => sum + (s.fee ?? 0), 0);

  const prevCents = all
    .filter(({ s }) => {
      const d = new Date(s.session_date);
      return d >= startOfPrev && d < endOfPrev && s.status === 'attended' && s.payment_status === 'paid';
    })
    .reduce((sum, { s }) => sum + (s.fee ?? 0), 0);

  const monday = startOfWeek(now);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });

  const weekBars = weekDays.map(d => {
    const cents = all
      .filter(({ s }) => {
        const sd = new Date(s.session_date);
        return isSameDay(sd, d) && s.status !== 'cancelled';
      })
      .reduce((sum, { s }) => sum + (s.fee ?? 0), 0);
    return { day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][weekDays.indexOf(d)], value: cents, cents };
  });

  return { monthTotalCents: monthCents, prevMonthCents: prevCents, weekBars };
}

function RevenueCard({ revenue }: { revenue: Revenue }) {
  const { monthTotalCents, prevMonthCents, weekBars } = revenue;
  const max = Math.max(...weekBars.map(b => b.cents), 1);
  const peakIdx = weekBars.reduce((pi, b, i, arr) => arr[pi].cents >= b.cents ? pi : i, 0);
  const delta = prevMonthCents > 0
    ? Math.round(((monthTotalCents - prevMonthCents) / prevMonthCents) * 100)
    : null;

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <p className="admin-eyebrow">Revenue · this month</p>
          <div className="admin-revenue-value">
            <span className="currency">€</span>
            <span>{Math.round(monthTotalCents / 100).toLocaleString('en-IE')}</span>
            {delta !== null && (
              <span className="admin-revenue-delta" style={{ color: delta >= 0 ? 'var(--sage)' : 'var(--terracotta)' }}>
                {delta >= 0 ? '+' : ''}{delta}% vs {prevMonthLabel()}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="admin-revenue-chart">
        {weekBars.map((b, i) => {
          const pct = b.cents === 0 ? 0 : Math.max(8, Math.round((b.cents / max) * 100));
          const isHi = i === peakIdx && b.cents > 0;
          return (
            <div key={b.day} className="admin-bar-col">
              <div className="admin-bar-wrap">
                <div className={`admin-bar${isHi ? ' is-hi' : ''}${b.cents === 0 ? ' is-zero' : ''}`} style={{ height: `${pct}%` }} />
              </div>
              <div className="admin-bar-value">{b.cents > 0 ? `€${Math.round(b.cents / 100)}` : '—'}</div>
              <div className="admin-bar-label">{b.day}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function prevMonthLabel() {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return d.toLocaleDateString('en-IE', { month: 'long' });
}

function RecentClientsCard({ clients }: { clients: ClientRow[] }) {
  const recent = clients.slice(0, 5);

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <p className="admin-eyebrow">Recent activity</p>
          <h2 className="admin-h2">Clients</h2>
        </div>
      </div>

      {recent.length === 0 ? (
        <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: 0 }}>No clients yet.</p>
      ) : (
        <div className="admin-clientlist">
          {recent.map(c => {
            const lastSession = c.sessions
              .slice()
              .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];
            const meta = lastSession
              ? `${timeAgo(lastSession.session_date)} · ${c.sessions.length} session${c.sessions.length === 1 ? '' : 's'}`
              : 'No sessions yet';
            const statusTag =
              c.status === 'active' ? 'admin-tag-active' :
              c.status === 'new' ? 'admin-tag-new' :
              'admin-tag-pause';
            const statusLabel =
              c.status === 'active' ? 'Active' :
              c.status === 'new' ? 'New' :
              c.status === 'completed' ? 'Completed' : c.status;

            return (
              <div key={c.id} className="admin-clientrow">
                <Avatar name={c.full_name} size={36} />
                <div>
                  <div className="admin-clientrow-name">{c.full_name}</div>
                  <div className="admin-clientrow-meta">{meta}</div>
                </div>
                <span className={`admin-tag ${statusTag}`}>{statusLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Derivations ───────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days <= 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    return hours <= 0 ? 'just now' : `${hours}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
}
