'use client';

import { PRACTICE } from '@/practice.config';
import { useMemo, useState } from 'react';
import { adminFetch, displayFee, isSameDay, startOfWeek, dedupeSessions } from './api';
import { SessionDoneOptions, type SessionDoneChoice } from './SessionDoneOptions';
import { NextUpCard, AccreditationMiniCard, findNextUp } from './TodayCards';
import { useAccreditationSettings, useAccreditationHours } from './accreditation';
import type {
  AdminSection, ClientRow, SessionRow, TokenRow,
  CalendarEvent, CalendarStatus, SessionFilter, FormsTab, ReminderHealth, WaitlistRow,
} from './types';

interface Props {
  clients: ClientRow[];
  tokens: TokenRow[];
  events: CalendarEvent[];
  calendarStatus: CalendarStatus | null;
  onReload: () => void;
  onConnectCalendar: () => void;
  onDisconnectCalendar: () => void;
  onNewClient: () => void;
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
  reminderHealth: ReminderHealth | null;
  waitlist: WaitlistRow[];
}


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
  }).replace(/\s?([ap]\.?m\.?)$/i, '');
}

// ── component ──────────────────────────────────────────────────────────────

export function Dashboard({
  clients, tokens, events, calendarStatus,
  onReload, onConnectCalendar, onDisconnectCalendar, onNewClient,
  onClickSession, onNavigateSection,
  greeting, dateLine, flash, reminderHealth, waitlist,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);

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

  const visibleUnlinked = unlinkedEvents;

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
  // Attended sessions that haven't had a receipt emailed yet.
  const needsReceiptCount = allSessions.filter(({ s }) =>
    s.status === 'attended' && !s.receipt_sent_at
  ).length;

  const formsPending = tokens.filter(t => !t.is_used && new Date(t.expires_at) > today).length;

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

  // ── Today: next session + accreditation progress
  // Re-read the clock whenever the data reloads (every 30 s), not every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableNow = useMemo(() => new Date(), [clients]);
  const nextUp = findNextUp(allSessions, stableNow);
  const accred = useAccreditationSettings();
  const accredHours = useAccreditationHours(clients, accred, stableNow);

  const strip = reminderStripState(reminderHealth);
  const outstandingAll = allSessions.filter(({ s }) => {
    const d = new Date(s.session_date);
    return s.payment_status !== 'paid' && s.payment_status !== 'refunded'
      && s.status !== 'cancelled' && d >= OUTSTANDING_FLOOR && d <= now;
  }).sort((a, b) => new Date(b.s.session_date).getTime() - new Date(a.s.session_date).getTime());
  const outstandingAllCents = outstandingAll.reduce((sum, { s }) => sum + (s.fee ?? 0), 0);
  const attention: Array<{ key: string; tone: 'warn' | 'info'; text: string; action: string; go: () => void }> = [];
  if (outstandingAll.length > 0) attention.push({
    key: 'unpaid', tone: 'warn',
    text: `${outstandingAll.length} past session${outstandingAll.length === 1 ? '' : 's'} not paid · €${Math.round(outstandingAllCents / 100)}`,
    action: 'View', go: () => onNavigateSection('sessions', { sessionsFilter: 'unpaid' }),
  });
  if (needsReceiptCount > 0) attention.push({
    key: 'receipts', tone: 'info',
    text: `${needsReceiptCount} attended session${needsReceiptCount === 1 ? '' : 's'} without a receipt`,
    action: 'Review', go: () => onNavigateSection('sessions', { sessionsFilter: 'needs_receipt' }),
  });
  if (formsPending > 0) attention.push({
    key: 'forms', tone: 'info',
    text: `${formsPending} intake form${formsPending === 1 ? '' : 's'} sent, not returned yet`,
    action: 'Forms', go: () => onNavigateSection('forms', { formsTab: 'pending' }),
  });
  if (waitingList.length > 0) attention.push({
    key: 'waitlist', tone: 'info',
    text: `${waitingList.length} ${waitingList.length === 1 ? 'person' : 'people'} on the waitlist`,
    action: 'Waitlist', go: () => onNavigateSection('waitlist'),
  });
  if (visibleUnlinked.length > 0) attention.push({
    key: 'unlinked', tone: 'info',
    text: `${visibleUnlinked.length} calendar event${visibleUnlinked.length === 1 ? '' : 's'} not linked to a client`,
    action: 'Calendar', go: () => onNavigateSection('sessions'),
  });

  return (
    <>
      <header className="admin-topbar">
        <div>
          <h1 className="admin-h1">{greeting}, {PRACTICE.practitionerFirstName}</h1>
          <p className="admin-subline">{dateLine} · {todaySessions.length === 0 ? 'no sessions today' : `${todaySessions.length} session${todaySessions.length === 1 ? '' : 's'} today`}</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={calendarStatus?.connected ? onDisconnectCalendar : onConnectCalendar}
            className="admin-status-pill"
            style={{ cursor: 'pointer' }}
            title={calendarStatus?.connected ? (calendarStatus.email ? `Connected as ${calendarStatus.email}` : 'Connected') : 'Connect Google Calendar'}
          >
            <span className={`admin-status-dot${calendarStatus?.connected ? '' : ' is-off'}`} />
            {calendarStatus?.connected ? 'Calendar connected' : 'Calendar not connected'}
          </button>
          <button onClick={onNewClient} className="admin-btn-primary">+ Add client</button>
        </div>
      </header>

      {flash && (
        <div className={`admin-banner is-${flash.kind === 'success' ? 'ok' : 'alert'}`} role="status">{flash.msg}</div>
      )}

      {/* Problems with the morning reminders shout at the top; a healthy run
          is a quiet line at the bottom. */}
      {strip && strip.tone !== 'ok' && (
        <div className={`admin-banner is-${strip.tone}`} role="alert">
          <span className="admin-banner-dot" aria-hidden />{strip.msg}
        </div>
      )}

      <div className={`admin-row-today${nextUp ? '' : ' is-single'}`}>
        {nextUp && (
          <NextUpCard
            session={nextUp.s}
            client={nextUp.c}
            now={stableNow}
            busy={busyId === nextUp.s.id}
            showDoneOptions={confirmId === nextUp.s.id}
            feedback={feedback?.id === nextUp.s.id ? feedback.msg : null}
            onSessionDone={() => sessionDone(nextUp.s)}
            onDoneChoice={choice => void doDone(nextUp.s.id, choice)}
            onCancelConfirm={() => setConfirmId(null)}
            onOpen={() => onClickSession(nextUp.s, nextUp.c)}
          />
        )}
        <AccreditationMiniCard
          accred={accred}
          total={accredHours.total}
          sessionsSince={accredHours.sessionsSince}
          onOpen={() => onNavigateSection('hours')}
        />
      </div>

      <section className="admin-card admin-today-card">
        <div className="admin-card-head">
          <h2 className="admin-h2">Today · {today.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Dublin' })}</h2>
          <button type="button" className="admin-link" onClick={() => onNavigateSection('sessions')}>Open calendar →</button>
        </div>
        {todaySessions.length === 0 ? (
          <p className="admin-empty">No sessions today.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {todaySessions.map(({ s, c }) => (
              <SessionRow
                key={s.id}
                session={s}
                client={c}
                busy={busyId === s.id}
                feedback={feedback?.id === s.id ? feedback.msg : null}
                showDoneOptions={confirmId === s.id && nextUp?.s.id !== s.id}
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
      </section>

      <div className="admin-row-split">
        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-h2">Needs attention</h2>
          </div>
          {attention.length === 0 ? (
            <p className="admin-empty">Nothing needs you right now.</p>
          ) : (
            <ul className="admin-attn-list">
              {attention.map(a => (
                <li key={a.key}>
                  <span className={`admin-attn-dot is-${a.tone}`} aria-hidden />
                  <span className="admin-attn-text">{a.text}</span>
                  <button type="button" className="admin-btn-secondary" onClick={a.go}>{a.action}</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-h2">This week</h2>
            <button type="button" className="admin-link" onClick={() => onNavigateSection('revenue')}>Money →</button>
          </div>
          <div className="admin-week-sum">
            <div><b>{sessionsThisWeek.length}</b><span>sessions this week</span></div>
            <div><b>{nextWeekSessions.length}</b><span>booked next week</span></div>
            <div><b>€{Math.round(revenue.monthGrossCents / 100).toLocaleString('en-IE')}</b><span>paid this month</span></div>
          </div>
          {upcomingSessions.length > 0 && (
            <ul className="admin-week-next">
              {upcomingSessions.slice(0, 4).map(({ s, c }) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onClickSession(s, c)}>
                    <span className="when">{upcomingWhen(s.session_date)}</span>
                    <span className="who pii">{c.full_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {upcomingEvents.length > 0 && (
            <p className="admin-week-other">
              Also on your calendar: {upcomingEvents.slice(0, 3).map(e => `${e.title} (${upcomingWhen(e.start)})`).join(' · ')}
            </p>
          )}
        </section>
      </div>

      <footer className="admin-health">
        {strip && strip.tone === 'ok' && <span><span className="dot is-ok" aria-hidden />{strip.msg}</span>}
        <span>
          <span className={`dot${calendarStatus?.connected ? ' is-ok' : ' is-off'}`} aria-hidden />
          {calendarStatus?.connected ? 'Google Calendar connected' : 'Google Calendar not connected'}
        </span>
      </footer>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────



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
  const isLowCost = Boolean(client.is_low_cost);
  const type = isLowCost ? 'lowcost' : session.session_format === 'online' ? 'online' : 'inperson';
  const typeLabel = isLowCost ? 'Low cost · cash' : session.session_format === 'online' ? 'Online' : 'In person';
  const paid = session.payment_status === 'paid';
  const viaStripe = paid && Boolean(session.stripe_payment_intent_id);
  const reminded = (session.session_reminders?.length ?? 0) > 0;

  return (
    <div className={`admin-session-row is-${type}`}>
      <div className="admin-session-time">
        {shortTime(session.session_date)}
        <span className="admin-session-time-meridiem">{meridiem(session.session_date)}</span>
      </div>
      <span className="admin-session-bar" aria-hidden />
      <div className="admin-session-who">
        <button type="button" onClick={onEdit} disabled={!onEdit} className="admin-session-name pii" title={onEdit ? `Edit session for ${client.full_name}` : undefined}>
          {client.full_name}
        </button>
        <div className="admin-session-meta">
          {typeLabel} · {displayFee(session.fee)} · <span className={paid ? 'is-paid' : 'is-unpaid'}>{paid ? (viaStripe ? 'paid by Stripe' : 'paid') : 'not paid'}</span>
          {reminded && <> · reminder sent</>}
          {session.receipt_sent_at && <> · receipt sent</>}
        </div>
        {session.session_format === 'online' && PRACTICE.telehealthUrl && (
          <a href={PRACTICE.telehealthUrl} target="_blank" rel="noopener noreferrer" className="admin-session-room">Open video room ↗</a>
        )}
      </div>
      <div className="admin-session-side">
        <div className="admin-session-btns">
          {session.status === 'scheduled' && onSessionDone && (
            <button onClick={onSessionDone} disabled={busy} className="admin-btn-primary admin-btn-compact">Session done</button>
          )}
          {!paid && session.status !== 'cancelled' && onMarkPaid && (
            <button onClick={onMarkPaid} disabled={busy} className="admin-btn-secondary"
              title={isLowCost ? 'Record cash received for this session' : 'Mark this session as paid'}>
              {isLowCost ? 'Cash received' : 'Mark paid'}
            </button>
          )}
          {onSendReceipt && paid && (
            <button onClick={onSendReceipt} disabled={busy} className="admin-btn-secondary">
              {session.receipt_sent_at ? 'Resend receipt' : 'Send receipt'}
            </button>
          )}
        </div>
        {showDoneOptions && onDoneChoice && onCancelConfirm && (
          <SessionDoneOptions session={session} client={client} busy={busy} onChoose={onDoneChoice} onCancel={onCancelConfirm} />
        )}
        {feedback && <div className="admin-session-feedback">{feedback}</div>}
      </div>
    </div>
  );
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




// ── Derivations ───────────────────────────────────────────────────────────

