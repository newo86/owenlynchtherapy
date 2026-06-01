'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays, Users, FileText, Wallet,
  ChevronLeft, ChevronRight,
  CalendarCheck2,
  CheckCircle2,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { adminFetch, displayFee, formatDateTime, isSameDay, startOfWeek, dedupeSessions } from './api';
import { SendReminderModal } from './SendReminderModal';
import { CalendarWeekGrid } from './CalendarWeekGrid';
import type {
  AdminSection, ClientRow, SessionRow, TokenRow,
  CalendarEvent, CalendarStatus, SessionFilter, FormsTab, GcalRef,
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
  /** Called when the user clicks an existing session event on the calendar. */
  onClickSession: (session: SessionRow, client: ClientRow) => void;
  /** Navigate to any section, optionally carrying a filter intent. */
  onNavigateSection: (section: AdminSection, opts?: {
    sessionsFilter?: SessionFilter;
    formsTab?: FormsTab;
  }) => void;
  greeting: string;
  dateLine: string;
  flash: { kind: 'success' | 'error'; msg: string } | null;
  sectionTitle: string;
  onEditGcalEvent?: (event: GcalRef) => void;
}

type OutstandingScope = 'week' | 'month' | 'all';

// Sessions before this date are excluded from all outstanding-payment views.
const OUTSTANDING_FLOOR = new Date('2026-06-01');

// ── helpers ────────────────────────────────────────────────────────────────

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
  onScheduleDay, onClickSession, onNavigateSection,
  greeting, dateLine, flash, sectionTitle, onEditGcalEvent,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);
  const [outstandingScope, setOutstandingScope] = useState<OutstandingScope>('week');
  const [reminderData, setReminderData] = useState<{ session: SessionRow; client: ClientRow } | null>(null);
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(new Set());

  const today = new Date();
  const allSessions = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    // Collapse duplicate rows (recurring-sync artefact) so counts, outstanding
    // payments and revenue aren't doubled or shadowed by unpaid duplicates.
    for (const c of clients) for (const s of dedupeSessions(c.sessions)) out.push({ s, c });
    return out;
  }, [clients]);

  // Calendar events that aren't linked to any client session yet — surfaced as
  // a "needs a client" queue so linking is a deliberate, visible action rather
  // than something to stumble on. An event is considered linked if a session
  // shares its gcal_event_id, or (legacy) falls on the same day within 30 min.
  const unlinkedEvents = useMemo(() => {
    const linkedIds = new Set<string>();
    const sessions: Array<{ date: Date; first: string }> = [];
    for (const c of clients) {
      for (const s of c.sessions) {
        if (s.status === 'cancelled') continue;
        if (s.gcal_event_id) linkedIds.add(s.gcal_event_id);
        sessions.push({ date: new Date(s.session_date), first: c.full_name.toLowerCase().split(' ')[0] });
      }
    }
    return events.filter(e => {
      if (linkedIds.has(e.id)) return false;
      const eStart = new Date(e.start);
      const looksLinked = sessions.some(s =>
        isSameDay(s.date, eStart)
        && (Math.abs(s.date.getTime() - eStart.getTime()) < 30 * 60 * 1000
          || (e.title ?? '').toLowerCase().includes(s.first)),
      );
      return !looksLinked;
    });
  }, [clients, events]);

  const visibleUnlinked = unlinkedEvents.filter(e => !dismissedEventIds.has(e.id));

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
    if (d < OUTSTANDING_FLOOR) return false;
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
    return d >= OUTSTANDING_FLOOR
      && s.payment_status !== 'paid' && s.payment_status !== 'refunded'
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
            + Add Client
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

      {/* Unlinked calendar events banner */}
      {onEditGcalEvent && visibleUnlinked.length > 0 && (
        <div style={{
          margin: '0 0 22px',
          padding: '14px 18px',
          borderRadius: 14,
          background: 'rgba(212,168,67,0.12)',
          border: '1px solid rgba(212,168,67,0.4)',
          display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
        }}>
          <CalendarCheck2 size={18} color="#a3801a" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest-deep)' }}>
              {visibleUnlinked.length} unlinked calendar event{visibleUnlinked.length === 1 ? '' : 's'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>
              Link any that belong to a client, or dismiss the rest.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {visibleUnlinked.slice(0, 5).map(e => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex', alignItems: 'center',
                    border: '1px solid rgba(212,168,67,0.5)',
                    borderRadius: 8, overflow: 'hidden',
                    background: 'rgba(255,255,255,0.6)',
                  }}
                >
                  <span style={{
                    padding: '5px 10px', fontSize: 11,
                    color: 'var(--forest-deep)', whiteSpace: 'nowrap',
                    maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                    title={`${e.title} · ${formatDateTime(e.start)}`}
                  >
                    {e.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEditGcalEvent({ id: e.id, title: e.title, start: e.start, location: e.location })}
                    style={{
                      padding: '5px 9px', fontSize: 11, fontWeight: 500,
                      background: 'rgba(79,138,104,0.12)', border: 'none',
                      borderLeft: '1px solid rgba(212,168,67,0.4)',
                      color: 'var(--sage)', cursor: 'pointer',
                    }}
                    title={`Link "${e.title}" to a client`}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedEventIds(prev => { const s = new Set(prev); s.add(e.id); return s; })}
                    style={{
                      padding: '5px 8px', fontSize: 13, lineHeight: 1,
                      background: 'none', border: 'none',
                      borderLeft: '1px solid rgba(212,168,67,0.4)',
                      color: 'var(--ink-muted)', cursor: 'pointer',
                    }}
                    title={`Dismiss "${e.title}"`}
                    aria-label={`Dismiss ${e.title}`}
                  >
                    ×
                  </button>
                </div>
              ))}
              {visibleUnlinked.length > 5 && (
                <span style={{ fontSize: 12, color: 'var(--ink-muted)', alignSelf: 'center' }}>
                  +{visibleUnlinked.length - 5} more
                </span>
              )}
            </div>
          </div>
        </div>
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
          onClick={() => onNavigateSection('sessions', { sessionsFilter: 'this_week' })}
        />
        <StatCard
          label="Active clients"
          accent="sage"
          value={String(activeClients)}
          Icon={Users}
          foot={newClientsThisMonth > 0 ? `${newClientsThisMonth} new this month` : 'None new this month'}
          footKind="ok"
          onClick={() => onNavigateSection('clients')}
        />
        <StatCard
          label="Forms pending"
          accent="gold"
          value={String(formsPending)}
          Icon={FileText}
          foot={formsPending > 0 ? 'Links sent, awaiting reply' : 'All caught up'}
          onClick={() => onNavigateSection('forms', { formsTab: 'pending' })}
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
          onClick={() => onNavigateSection('sessions', {
            sessionsFilter: outstandingScope === 'week' ? 'unpaid_this_week' : 'unpaid',
          })}
          pills={(
            <div style={{ display: 'flex', gap: 4, marginTop: 12 }} onClick={e => e.stopPropagation()}>
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
            <button type="button" className="admin-link" onClick={() => onNavigateSection('sessions')}>
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
                  onEdit={() => onClickSession(s, c)}
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

        <CalendarWeekGrid
          clients={clients}
          events={events}
          weekOffset={weekOffset}
          onScheduleDay={onScheduleDay}
          onClickSession={onClickSession}
          onReload={onReload}
          onReminderSession={(session, client) => setReminderData({ session, client })}
          onEditGcalEvent={onEditGcalEvent}
        />
      </section>

      {/* Revenue + Recent clients */}
      <div className="admin-row-bottom">
        <RevenueCard revenue={revenue} onNavigate={() => onNavigateSection('revenue')} />
        <RecentClientsCard clients={clients} onNavigate={() => onNavigateSection('clients')} />
      </div>

      {reminderData && (
        <SendReminderModal
          session={reminderData.session}
          client={reminderData.client}
          onClose={() => setReminderData(null)}
        />
      )}
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
  onClick?: () => void;
}

function StatCard({ label, value, accent, Icon, foot, footKind = 'neutral', pills, onClick }: StatProps) {
  const palette = {
    terracotta: { strip: 'var(--terracotta)',  blob: '#f6dfd0', iconBg: 'rgba(200,90,27,0.12)', iconFg: 'var(--terracotta)' },
    sage:       { strip: 'var(--sage)',        blob: '#d8e8de', iconBg: 'rgba(79,138,104,0.14)', iconFg: 'var(--sage)' },
    gold:       { strip: 'var(--gold)',        blob: '#f6e9c2', iconBg: 'rgba(212,168,67,0.18)', iconFg: 'var(--gold-dark)' },
    lilac:      { strip: 'var(--lilac)',       blob: '#e3d3eb', iconBg: 'rgba(168,124,185,0.16)', iconFg: 'var(--lilac-dark)' },
  }[accent];

  return (
    <div
      className="admin-stat"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
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
  onEdit?: () => void;
}

function SessionRow({
  session, client, busy, feedback,
  needsAttendedConfirm,
  onMarkAttended, onConfirmAttended, onCancelConfirm, onSendReceipt, onEdit,
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
          <button
            type="button"
            onClick={onEdit}
            disabled={!onEdit}
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: onEdit ? 'pointer' : 'default', textAlign: 'left', display: 'block',
            }}
            title={onEdit ? `Edit session for ${client.full_name}` : undefined}
          >
            <div className="admin-session-name" style={onEdit ? { textDecoration: 'underline', textDecorationColor: 'rgba(42,77,60,0.3)', textUnderlineOffset: 3 } : undefined}>{client.full_name}</div>
          </button>
          <div className="admin-session-meta">{displayFee(session.fee)} · 50 min</div>
          {session.session_format === 'online' && (
            <a
              href="https://doxy.me/owenlynchtherapy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 11, color: 'var(--sage)', textDecoration: 'underline', textUnderlineOffset: 2, display: 'inline-block', marginTop: 2 }}
            >
              doxy.me room ↗
            </a>
          )}
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
          onClick={() => onNavigateSection('sessions', { sessionsFilter: 'unpaid_this_week' })}
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
            {needsReceipt === 0 ? 'Receipts up to date' : 'Mark attended & send receipts'}
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
  monthGrossCents: number;
  monthNetCents: number;
  monthLowCostCents: number;
  prevMonthCents: number;
  recentMonths: Array<{ label: string; cents: number; isCurrent: boolean }>;
}

const ROOM_COST_CENTS_DASH = 2000;

function computeRevenue(all: Array<{ s: SessionRow; c: ClientRow }>): Revenue {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrev = new Date(now.getFullYear(), now.getMonth(), 1);

  // Headline = full-paying sessions confirmed paid via Stripe this month.
  let monthGross = 0;
  let monthNet = 0;
  let monthLowCost = 0;
  for (const { s, c } of all) {
    const d = new Date(s.session_date);
    if (d < startOfMonth || d > now) continue;
    if (s.payment_status !== 'paid') continue;
    if (c.is_low_cost) {
      monthLowCost += s.fee ?? 0;
      continue;
    }
    const gross = s.fee ?? 0;
    monthGross += gross;
    monthNet += s.session_format === 'in_person' ? Math.max(0, gross - ROOM_COST_CENTS_DASH) : gross;
  }

  const prevCents = all
    .filter(({ s, c }) => {
      const d = new Date(s.session_date);
      return !c.is_low_cost && d >= startOfPrev && d < endOfPrev && s.payment_status === 'paid';
    })
    .reduce((sum, { s }) => sum + (s.fee ?? 0), 0);

  // Last 6 months — each bar shows full-paying paid gross for that month.
  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const isCurrentMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    const cents = all
      .filter(({ s, c }) => {
        const sd = new Date(s.session_date);
        return !c.is_low_cost
          && sd.getFullYear() === d.getFullYear()
          && sd.getMonth() === d.getMonth()
          && s.payment_status === 'paid';
      })
      .reduce((sum, { s }) => sum + (s.fee ?? 0), 0);
    return {
      label: d.toLocaleDateString('en-IE', { month: 'short' }),
      cents,
      isCurrent: isCurrentMonth,
    };
  });

  return { monthGrossCents: monthGross, monthNetCents: monthNet, monthLowCostCents: monthLowCost, prevMonthCents: prevCents, recentMonths };
}

function RevenueCard({ revenue, onNavigate }: { revenue: Revenue; onNavigate?: () => void }) {
  const { monthGrossCents, monthNetCents, monthLowCostCents, prevMonthCents, recentMonths } = revenue;
  const max = Math.max(...recentMonths.map(b => b.cents), 1);
  const peakIdx = recentMonths.reduce((pi, b, i, arr) => arr[pi].cents >= b.cents ? pi : i, 0);
  const delta = prevMonthCents > 0
    ? Math.round(((monthGrossCents - prevMonthCents) / prevMonthCents) * 100)
    : null;
  const roomCosts = monthGrossCents - monthNetCents;

  return (
    <section
      className="admin-card"
      onClick={onNavigate}
      role={onNavigate ? 'button' : undefined}
      tabIndex={onNavigate ? 0 : undefined}
      onKeyDown={onNavigate ? e => { if (e.key === 'Enter' || e.key === ' ') onNavigate(); } : undefined}
      style={onNavigate ? { cursor: 'pointer' } : undefined}
    >
      <div className="admin-card-head">
        <div>
          <p className="admin-eyebrow">Revenue · this month</p>
          <div className="admin-revenue-value">
            <span className="currency">€</span>
            <span>{Math.round(monthGrossCents / 100).toLocaleString('en-IE')}</span>
            {delta !== null && (
              <span className="admin-revenue-delta" style={{ color: delta >= 0 ? 'var(--sage)' : 'var(--terracotta)' }}>
                {delta >= 0 ? '+' : ''}{delta}% vs {prevMonthLabel()}
              </span>
            )}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-muted)' }}>
            Full-paying · paid this month
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--forest-deep)' }}>
            Net €{Math.round(monthNetCents / 100).toLocaleString('en-IE')}
            {roomCosts > 0 && (
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-muted)', fontWeight: 400 }}>
                (after €{Math.round(roomCosts / 100)} room costs)
              </span>
            )}
            {monthLowCostCents > 0 && (
              <span style={{ marginLeft: 12, fontSize: 11, color: 'var(--lilac-dark)', fontWeight: 500 }}>
                + €{Math.round(monthLowCostCents / 100)} low-cost
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="admin-revenue-chart">
        {recentMonths.map((b, i) => {
          const pct = b.cents === 0 ? 0 : Math.max(8, Math.round((b.cents / max) * 100));
          const isHi = b.isCurrent || (i === peakIdx && b.cents > 0 && !recentMonths[recentMonths.length - 1].isCurrent);
          return (
            <div key={b.label + i} className="admin-bar-col">
              <div className="admin-bar-wrap">
                <div className={`admin-bar${isHi ? ' is-hi' : ''}${b.cents === 0 ? ' is-zero' : ''}`} style={{ height: `${pct}%` }} />
              </div>
              <div className="admin-bar-value">{b.cents > 0 ? `€${Math.round(b.cents / 100)}` : '—'}</div>
              <div className="admin-bar-label">{b.label}</div>
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

function RecentClientsCard({ clients, onNavigate }: { clients: ClientRow[]; onNavigate?: () => void }) {
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
              <div
                key={c.id}
                className="admin-clientrow"
                onClick={onNavigate}
                role={onNavigate ? 'button' : undefined}
                tabIndex={onNavigate ? 0 : undefined}
                onKeyDown={onNavigate ? e => { if (e.key === 'Enter' || e.key === ' ') onNavigate(); } : undefined}
                style={onNavigate ? { cursor: 'pointer' } : undefined}
              >
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
