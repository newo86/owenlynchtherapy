'use client';

import { PRACTICE } from '@/practice.config';
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
import { SessionDoneOptions, type SessionDoneChoice } from './SessionDoneOptions';
import type {
  AdminSection, ClientRow, SessionRow, TokenRow,
  CalendarEvent, CalendarStatus, SessionFilter, FormsTab, GcalRef, ReminderHealth, WaitlistRow,
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
  reminderHealth: ReminderHealth | null;
  waitlist: WaitlistRow[];
}

type OutstandingScope = 'week' | 'month' | 'all';

// Sessions before this date are excluded from all outstanding-payment views.
const OUTSTANDING_FLOOR = new Date('2026-06-01');

// ── helpers ────────────────────────────────────────────────────────────────

// Translate the latest reminder run into a one-line status for the health
// strip. Green = the morning run happened and sent what it should; anything
// else says exactly what's wrong in plain language. `null` = still loading.
function reminderStripState(health: ReminderHealth | null):
  | { tone: 'ok' | 'warn' | 'alert'; msg: string }
  | null {
  if (!health) return null;
  if (!health.emailsEnabled) {
    return { tone: 'alert', msg: 'Email sending is switched OFF — no reminders or receipts are going out (EMAILS_ENABLED).' };
  }
  const run = health.lastRun;
  if (!run) {
    return { tone: 'warn', msg: 'No automatic reminder run recorded yet — the health log starts with the next 7 a.m. run.' };
  }
  const ranAt = new Date(run.ran_at);
  const when = ranAt.toLocaleString('en-IE', {
    weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });
  if (Date.now() - ranAt.getTime() > 26 * 60 * 60 * 1000) {
    return { tone: 'alert', msg: `The automatic reminder run hasn't fired since ${when} — reminders may not be going out.` };
  }
  if (run.outcome.startsWith('aborted') || run.outcome.startsWith('error')) {
    const reason: Record<string, string> = {
      'aborted:kill-switch': 'email sending was switched off',
      'aborted:google-not-connected': 'Google Calendar was not connected',
      'aborted:calendar-sync-failed': "Google Calendar couldn't be reached",
      'aborted:exceeds-cap': 'an unusually high session count tripped the safety cap',
      'error:candidates-query': "today's sessions couldn't be read",
    };
    return {
      tone: 'alert',
      msg: `This morning's reminders were held back (${reason[run.outcome] ?? run.outcome}) — no clients were emailed. Send today's by hand if needed.`,
    };
  }
  if (run.failed > 0) {
    return {
      tone: 'warn',
      msg: `Reminders ${when}: ${run.sent} sent, ${run.failed} failed — the failed clients got nothing; send theirs by hand.`,
    };
  }
  if (run.candidates === 0) {
    return { tone: 'ok', msg: `Reminders ${when}: no sessions to remind — all quiet.` };
  }
  return {
    tone: 'ok',
    msg: `Reminders ${when}: ${run.sent} sent${run.skipped > 0 ? `, ${run.skipped} already covered` : ''}.`,
  };
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
  onScheduleDay, onClickSession, onNavigateSection,
  greeting, dateLine, flash, sectionTitle, onEditGcalEvent, reminderHealth, waitlist,
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

  // "Upcoming" card: the OTHER calendar events (supervision, personal
  // appointments...) as a gentle heads-up. Client sessions live in the
  // "Sessions this week" stat card below.
  const now = new Date();
  const monday = startOfWeek(today);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 7);
  // Only the REST OF THIS WEEK — the card is "Sessions this week", so its
  // pills and "see all" must never count the months of future recurring
  // sessions (that was the confusing "See all 325").
  const upcomingSessions = allSessions
    .filter(({ s }) => {
      const d = new Date(s.session_date);
      return s.status === 'scheduled' && d > now && d < sunday;
    })
    .sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());
  const upcomingEvents = visibleUnlinked
    .filter(e => new Date(e.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6);


  const upcomingWhen = (iso: string) =>
    new Date(iso).toLocaleString('en-IE', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
    });

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
    // Outstanding = money owed for sessions that have already happened.
    // Future scheduled sessions are created "unpaid", so without this cap the
    // card counted months of recurring bookings as debt (€23k of nonsense).
    if (d > now) return false;
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

  // Attended sessions that haven't had a receipt emailed yet.
  const needsReceiptCount = allSessions.filter(({ s }) =>
    s.status === 'attended' && !s.receipt_sent_at
  ).length;

  const formsPending = tokens.filter(t => !t.is_used && new Date(t.expires_at) > today).length;
  const activeClients = clients.filter(c => c.status === 'active').length;

  // Quick-action tiles: who's waiting for a space, and next week at a glance.
  const waitingList = useMemo(() =>
    [...waitlist].filter(w => w.status === 'waiting')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  [waitlist]);
  const nextWeekSessions = useMemo(() => {
    const nextSunday = new Date(sunday); nextSunday.setDate(sunday.getDate() + 7);
    return allSessions
      .filter(({ s }) => {
        const d = new Date(s.session_date);
        return s.status !== 'cancelled' && d >= sunday && d < nextSunday;
      })
      .sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSessions]);

  // ── Mutations
  // "Session done" — one explicit call that marks attended and, per the
  // chosen option, records the payment and emails the receipt.
  function sessionDone(s: SessionRow) {
    if (s.payment_status === 'paid' && s.receipt_sent_at) {
      void doDone(s.id, { record_payment: false, send_receipt: false });
      return;
    }
    setConfirmId(s.id);
  }
  async function doDone(sessionId: string, choice: SessionDoneChoice) {
    setBusyId(sessionId); setConfirmId(null);
    try {
      const res = await adminFetch('/api/admin/mark-attended', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId, ...choice }),
      });
      const json = await res.json();
      if (!res.ok) { setFeedback({ id: sessionId, msg: json.error ?? 'Failed.' }); return; }
      const parts = ['Marked attended'];
      if (choice.record_payment && json.paid) parts.push('payment recorded');
      if (json.receipt_sent) parts.push('receipt emailed');
      setFeedback({ id: sessionId, msg: parts.join(' — ') + '.' });
      onReload();
    } catch { setFeedback({ id: sessionId, msg: 'Network error.' }); }
    finally { setBusyId(null); }
  }
  async function sendReceipt(sessionId: string, force = false) {
    setBusyId(sessionId);
    try {
      const res = await adminFetch('/api/admin/send-receipt', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId, force }),
      });
      const json = await res.json();
      if (res.status === 409 && json.already_sent_at) {
        const when = new Date(json.already_sent_at).toLocaleString('en-IE', {
          day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
          timeZone: 'Europe/Dublin',
        });
        if (confirm(`A receipt for this session was already emailed on ${when}. Send it again?`)) {
          await sendReceipt(sessionId, true);
        }
        return;
      }
      if (!res.ok) { setFeedback({ id: sessionId, msg: json.error ?? 'Failed.' }); return; }
      setFeedback({ id: sessionId, msg: 'Receipt sent.' });
      onReload();
    } catch { setFeedback({ id: sessionId, msg: 'Network error.' }); }
    finally { setBusyId(null); }
  }
  async function markPaid(sessionId: string, isLowCost: boolean) {
    setBusyId(sessionId);
    try {
      const res = await adminFetch('/api/admin/mark-paid', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json();
      if (!res.ok) { setFeedback({ id: sessionId, msg: json.error ?? 'Failed.' }); return; }
      setFeedback({ id: sessionId, msg: isLowCost ? 'Cash payment recorded.' : 'Marked paid.' });
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
          <h1 className="admin-h1">{greeting}, {PRACTICE.practitionerFirstName}</h1>
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

      {/* Reminder health strip — answers "did this morning's reminders go
          out?" at a glance. Quiet when healthy, loud when they didn't. */}
      {(() => {
        const strip = reminderStripState(reminderHealth);
        if (!strip) return null;
        const palette = {
          ok:    { bg: 'rgba(79,138,104,0.10)', border: 'rgba(79,138,104,0.3)',  color: '#2D5A42' },
          warn:  { bg: 'rgba(212,168,67,0.14)', border: 'rgba(212,168,67,0.45)', color: '#7A5E12' },
          alert: { bg: 'rgba(200,90,27,0.12)',  border: 'rgba(200,90,27,0.45)',  color: '#A04714' },
        }[strip.tone];
        return (
          <div
            role={strip.tone === 'ok' ? 'status' : 'alert'}
            style={{
              margin: '0 0 22px', padding: '10px 18px', borderRadius: 12,
              background: palette.bg, border: `1px solid ${palette.border}`,
              color: palette.color, fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: strip.tone === 'ok' ? '#4F8A68' : strip.tone === 'warn' ? '#D4A843' : '#C85A1A',
              }}
            />
            {strip.msg}
          </div>
        );
      })()}

      {/* Upcoming events — slim informational strip (like the reminder
          strip above): supervision, personal appointments etc., so nothing
          on the calendar is forgotten. Purely a reminder — no linking. */}
      {upcomingEvents.length > 0 && (
        <div style={{
          margin: '0 0 22px', padding: '10px 18px', borderRadius: 12,
          background: 'rgba(212,168,67,0.10)', border: '1px solid rgba(212,168,67,0.3)',
          fontSize: 13, color: 'var(--forest-deep)',
          display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7A5E12' }}>
            <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold, #D4A843)' }} />
            Upcoming
          </span>
          {upcomingEvents.map((e, i) => (
            <span key={e.id} className="admin-event-name" style={{ whiteSpace: 'nowrap' }}>
              {e.title}
              <span style={{ color: 'var(--ink-muted)' }}> — {upcomingWhen(e.start)}</span>
              <button
                type="button"
                onClick={() => setDismissedEventIds(prev => { const next = new Set(prev); next.add(e.id); return next; })}
                style={{ background: 'none', border: 'none', padding: '0 2px', marginLeft: 4, fontSize: 12, lineHeight: 1, color: 'var(--ink-muted)', cursor: 'pointer' }}
                title={`Hide "${e.title}"`}
                aria-label={`Hide ${e.title}`}
              >×</button>
              {i < upcomingEvents.length - 1 && <span style={{ color: 'var(--ink-muted)' }}> ·</span>}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="admin-stats">
        <StatCard
          label="Sessions this week"
          accent="terracotta"
          value={String(sessionsThisWeek.length)}
          Icon={CalendarDays}
          foot={weekOffset === 0
            ? (events.length > 0 ? `+${events.length} calendar events` : 'No external events')
            : `+${events.length} events in the week you're viewing`}
          footKind="ok"
          onClick={() => onNavigateSection('sessions', { sessionsFilter: 'this_week' })}
          pills={upcomingSessions.length > 0 ? (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }} onClick={e => e.stopPropagation()}>
              {upcomingSessions.slice(0, 3).map(({ s, c }) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onClickSession(s, c)}
                  style={{
                    display: 'flex', gap: 6, alignItems: 'baseline', background: 'none',
                    border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left',
                    fontSize: 11, color: 'var(--ink-muted)', overflow: 'hidden',
                  }}
                  title={`Open session for ${c.full_name}`}
                >
                  <span style={{ whiteSpace: 'nowrap' }}>{upcomingWhen(s.session_date)}</span>
                  <span className="pii" style={{ fontWeight: 500, color: 'var(--forest-deep)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.full_name}
                  </span>
                </button>
              ))}
              {upcomingSessions.length > 3 && (
                <button
                  type="button"
                  onClick={() => onNavigateSection('sessions', { sessionsFilter: 'this_week' })}
                  style={{
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    fontSize: 11, fontWeight: 600, color: 'var(--terracotta)', textAlign: 'left',
                  }}
                >
                  See all {upcomingSessions.length} this week →
                </button>
              )}
            </div>
          ) : undefined}
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
              ? `${outstandingCount} session${outstandingCount === 1 ? '' : 's'} unpaid · ${
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
                  showDoneOptions={confirmId === s.id}
                  onSessionDone={() => sessionDone(s)}
                  onDoneChoice={choice => void doDone(s.id, choice)}
                  onCancelConfirm={() => setConfirmId(null)}
                  onSendReceipt={() => sendReceipt(s.id)}
                  onMarkPaid={() => markPaid(s.id, Boolean(c.is_low_cost))}
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
          needsReceipt={needsReceiptCount}
          formsPending={formsPending}
          pendingNames={tokens.filter(t => !t.is_used && new Date(t.expires_at) > today).map(t => t.client_name ?? '—')}
          waitingCount={waitingList.length}
          newestWaiting={waitingList[0]?.full_name ?? null}
          nextWeekCount={nextWeekSessions.length}
          nextWeekFirst={nextWeekSessions[0] ? upcomingWhen(nextWeekSessions[0].s.session_date) : null}
          onNavigateSection={onNavigateSection}
          onOpenWaitlist={() => onNavigateSection('waitlist')}
          onOpenNextWeek={() => { onWeekOffsetChange(1); onNavigateSection('sessions'); }}
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
  showDoneOptions?: boolean;
  onSessionDone?: () => void;
  onDoneChoice?: (choice: SessionDoneChoice) => void;
  onCancelConfirm?: () => void;
  onSendReceipt?: () => void;
  onMarkPaid?: () => void;
  onEdit?: () => void;
}

function SessionRow({
  session, client, busy, feedback,
  showDoneOptions,
  onSessionDone, onDoneChoice, onCancelConfirm, onSendReceipt, onMarkPaid, onEdit,
}: SessionRowProps) {
  const formatTag = session.session_format === 'in_person' ? 'admin-tag-inperson' : 'admin-tag-online';
  const formatLabel = session.session_format === 'in_person' ? 'In person' : 'Online';
  const paymentTag = session.payment_status === 'paid' ? 'admin-tag-paid' : 'admin-tag-unpaid';
  const viaStripe = session.payment_status === 'paid' && Boolean(session.stripe_payment_intent_id);
  const paymentLabel = session.payment_status === 'paid' ? (viaStripe ? 'Paid · Stripe' : 'Paid') : 'Unpaid';
  const isLowCost = Boolean(client.is_low_cost);

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
          <div className="admin-session-meta">{displayFee(session.fee)} · {PRACTICE.sessionMinutes} min</div>
          {session.session_format === 'online' && (
            <a
              href={PRACTICE.telehealthUrl}
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
          {isLowCost && <span className="admin-tag admin-tag-new">Low cost · cash</span>}
          <span className={`admin-tag ${paymentTag}`}>{paymentLabel}</span>
        </div>
        {(session.receipt_sent_at || (session.session_reminders?.length ?? 0) > 0) && (
          <div style={{ fontSize: 10, color: 'var(--sage)', fontWeight: 500, textAlign: 'right' }}>
            {(session.session_reminders?.length ?? 0) > 0 && <span>✓ Reminder sent</span>}
            {session.receipt_sent_at && (session.session_reminders?.length ?? 0) > 0 && <span> · </span>}
            {session.receipt_sent_at && <span>✓ Receipt sent</span>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {session.status === 'scheduled' && onSessionDone && (
            <button onClick={onSessionDone} disabled={busy} className="admin-btn-primary" style={{ padding: '8px 14px', fontSize: 10 }}>
              Session Done
            </button>
          )}
          {session.payment_status !== 'paid' && session.status !== 'cancelled' && onMarkPaid && (
            <button
              onClick={onMarkPaid}
              disabled={busy}
              className="admin-btn-secondary"
              title={isLowCost ? 'Record cash received for this session' : 'Mark this session as paid'}
            >
              {isLowCost ? 'Cash Received' : 'Mark Paid'}
            </button>
          )}
          {onSendReceipt && session.payment_status === 'paid' && (
            <button onClick={onSendReceipt} disabled={busy} className="admin-btn-secondary">
              {session.receipt_sent_at ? 'Resend Receipt' : 'Send Receipt'}
            </button>
          )}
        </div>
        {showDoneOptions && onDoneChoice && onCancelConfirm && (
          <SessionDoneOptions
            session={session}
            client={client}
            busy={busy}
            onChoose={onDoneChoice}
            onCancel={onCancelConfirm}
          />
        )}
        {feedback && (
          <div style={{ fontSize: 11, color: 'var(--sage)' }}>{feedback}</div>
        )}
      </div>
    </div>
  );
}

interface QuickProps {
  needsReceipt: number;
  formsPending: number;
  pendingNames: string[];
  waitingCount: number;
  newestWaiting: string | null;
  nextWeekCount: number;
  nextWeekFirst: string | null;
  onNavigateSection: (section: 'sessions' | 'forms', opts?: { sessionsFilter?: SessionFilter; formsTab?: FormsTab }) => void;
  onOpenWaitlist: () => void;
  onOpenNextWeek: () => void;
}

function QuickActions({
  needsReceipt, formsPending, pendingNames,
  waitingCount, newestWaiting, nextWeekCount, nextWeekFirst,
  onNavigateSection, onOpenWaitlist, onOpenNextWeek,
}: QuickProps) {
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <p className="admin-eyebrow">Needs your attention</p>
          <h2 className="admin-h2">Quick actions</h2>
        </div>
      </div>

      <div className="admin-quickgrid">
        {/* Waiting list — the action that fills the book when a slot opens */}
        <button
          type="button"
          onClick={onOpenWaitlist}
          className="admin-task warn"
        >
          <div className="admin-task-eyebrow">Waitlist · {waitingCount}</div>
          <div className="admin-task-title">
            {waitingCount === 0 ? 'No one waiting' : `${waitingCount} ${waitingCount === 1 ? 'person' : 'people'} waiting for a space`}
          </div>
          <div className="admin-task-body">
            {waitingCount === 0
              ? 'The waitlist form is on your contact page.'
              : <>Newest: <span className="pii">{newestWaiting}</span>. When a slot opens, this is where to look.</>}
          </div>
          <div className="admin-task-cta">Open waitlist</div>
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
              : <>
                  <span className="pii">{pendingNames.slice(0, 2).join(' & ')}</span>
                  {pendingNames.length > 2 ? ` and ${pendingNames.length - 2} other${pendingNames.length - 2 === 1 ? '' : 's'}` : ''}
                  {pendingNames.length === 1 ? " hasn't" : " haven't"} returned theirs.
                </>}
          </div>
          <div className="admin-task-cta">Review status</div>
        </button>

        {/* Next week at a glance */}
        <button
          type="button"
          onClick={onOpenNextWeek}
          className="admin-task lilac"
        >
          <div className="admin-task-eyebrow">Next week · {nextWeekCount}</div>
          <div className="admin-task-title">
            {nextWeekCount === 0 ? 'Nothing booked yet' : `${nextWeekCount} session${nextWeekCount === 1 ? '' : 's'} booked`}
          </div>
          <div className="admin-task-body">
            {nextWeekFirst ? `First: ${nextWeekFirst}.` : 'Open the calendar to schedule next week.'}
          </div>
          <div className="admin-task-cta">View next week</div>
        </button>
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

const ROOM_COST_CENTS_DASH = PRACTICE.fees.roomCostCents;

/** YYYY-MM of an instant in Europe/Dublin — bucketing must match the
 *  Dublin-pinned Revenue page, not the viewer's browser timezone. */
function dublinYMDash(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' }).slice(0, 7);
}

function computeRevenue(all: Array<{ s: SessionRow; c: ClientRow }>): Revenue {
  const now = new Date();
  // Same rules as the Revenue page: Dublin month buckets, paid only,
  // cancelled and refunded never counted.
  const counts = (s: SessionRow) =>
    s.payment_status === 'paid' && s.status !== 'cancelled';
  const thisYM = dublinYMDash(now);

  let monthGross = 0;
  let monthNet = 0;
  let monthLowCost = 0;
  for (const { s, c } of all) {
    if (!counts(s) || dublinYMDash(s.session_date) !== thisYM) continue;
    if (c.is_low_cost) {
      monthLowCost += s.fee ?? 0;
      continue;
    }
    const gross = s.fee ?? 0;
    monthGross += gross;
    monthNet += s.session_format === 'in_person' ? Math.max(0, gross - ROOM_COST_CENTS_DASH) : gross;
  }

  // This month + the 5 before it, keyed by Dublin YYYY-MM.
  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 15);
    const ym = dublinYMDash(d);
    const cents = all
      .filter(({ s, c }) => !c.is_low_cost && counts(s) && dublinYMDash(s.session_date) === ym)
      .reduce((sum, { s }) => sum + (s.fee ?? 0), 0);
    return {
      label: d.toLocaleDateString('en-IE', { month: 'short' }),
      cents,
      isCurrent: ym === thisYM,
    };
  });

  const prevCents = recentMonths[4].cents;

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
