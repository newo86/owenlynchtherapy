'use client';

import { useEffect, useMemo, useState } from 'react';
import { List, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from './Avatar';
import { adminFetch, displayFee, formatDateTime, startOfWeek, dedupeSessions } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SessionRow, CalendarEvent, SessionFilter, GcalRef } from './types';
import { SendReminderModal } from './SendReminderModal';
import { CalendarWeekGrid } from './CalendarWeekGrid';
import { SessionDoneOptions, type SessionDoneChoice } from './SessionDoneOptions';

interface Props {
  clients: ClientRow[];
  events: CalendarEvent[];
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onReload: () => void;
  /** Initial filter when the section is opened (e.g. via a Quick Action card). */
  initialFilter?: SessionFilter;
  /** Opens the session edit modal. */
  onClickSession?: (session: SessionRow, client: ClientRow) => void;
  /** Opens the schedule modal pre-filled to this datetime string. */
  onScheduleDay?: (iso: string) => void;
  /** Opens the new-client modal. */
  onNewClient?: () => void;
  /** Opens the link-to-client modal for an unmatched GCal event. */
  onEditGcalEvent?: (event: GcalRef) => void;
}

function buildClickIso(day: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T17:00`;
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

/** Latest reminder timestamp for a session, or null. */
export function lastReminderAt(s: SessionRow): string | null {
  const rows = s.session_reminders ?? [];
  if (rows.length === 0) return null;
  return rows.reduce((max, r) => (r.sent_at > max ? r.sent_at : max), rows[0].sent_at);
}

function shortWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IE', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Europe/Dublin',
  });
}

export function SessionsList({ clients, events, weekOffset, onWeekOffsetChange, onReload, initialFilter, onClickSession, onScheduleDay, onNewClient, onEditGcalEvent }: Props) {
  // Default to calendar; only drop to list when arriving with a filter intent
  // (Quick Actions like "Unpaid this week") because filters only apply in list view.
  const [view, setView] = useState<View>(initialFilter ? 'list' : 'calendar');
  const [filter, setFilter] = useState<SessionFilter>(initialFilter ?? 'all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; kind: 'ok' | 'error'; msg: string } | null>(null);
  const [reminderData, setReminderData] = useState<{ session: SessionRow; client: ClientRow } | null>(null);

  // Sync filter AND view if a parent navigates here with a different intent.
  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
      setView('list');
    }
  }, [initialFilter]);

  const rows = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    // Collapse duplicate rows (recurring-sync artefact), keeping the paid/attended one.
    for (const c of clients) for (const s of dedupeSessions(c.sessions)) out.push({ s, c });
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
      if (filter === 'unpaid_this_week') {
        const d = new Date(s.session_date);
        return s.payment_status !== 'paid' && s.payment_status !== 'refunded'
          && s.status !== 'cancelled' && d >= monday && d < sunday;
      }
      return true;
    });
  }, [rows, filter]);

  // "Session done" — one explicit call that can mark attended, record the
  // payment, and email the receipt, per the option the practitioner chose.
  function sessionDone(s: SessionRow) {
    if (s.payment_status === 'paid' && s.receipt_sent_at) {
      // Nothing left to decide — close it out directly.
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setFeedback({ id: sessionId, kind: 'error', msg: json.error ?? 'Failed to mark attended.' }); return; }
      const parts = ['Marked attended'];
      if (choice.record_payment && json.paid) parts.push('payment recorded');
      if (json.receipt_sent) parts.push('receipt emailed');
      setFeedback({ id: sessionId, kind: 'ok', msg: parts.join(' — ') + '.' });
      onReload();
    } catch { setFeedback({ id: sessionId, kind: 'error', msg: 'Network error — not saved.' }); }
    finally { setBusyId(null); }
  }
  async function sendReceipt(sessionId: string, force = false) {
    setBusyId(sessionId);
    try {
      const res = await adminFetch('/api/admin/send-receipt', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId, force }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 409 && json.already_sent_at) {
        // Receipt was already emailed — make resending a deliberate choice.
        if (confirm(`A receipt for this session was already emailed on ${shortWhen(json.already_sent_at)}. Send it again?`)) {
          await sendReceipt(sessionId, true);
        }
        return;
      }
      if (!res.ok) { setFeedback({ id: sessionId, kind: 'error', msg: json.error ?? 'Receipt not sent.' }); return; }
      setFeedback({ id: sessionId, kind: 'ok', msg: 'Receipt emailed.' });
      onReload();
    } catch { setFeedback({ id: sessionId, kind: 'error', msg: 'Network error — receipt not sent.' }); }
    finally { setBusyId(null); }
  }
  async function markPaid(sessionId: string, isLowCost: boolean) {
    setBusyId(sessionId);
    try {
      const res = await adminFetch('/api/admin/mark-paid', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setFeedback({ id: sessionId, kind: 'error', msg: json.error ?? 'Failed to record payment.' }); return; }
      setFeedback({ id: sessionId, kind: 'ok', msg: isLowCost ? 'Cash payment recorded.' : 'Marked paid.' });
      onReload();
    } catch { setFeedback({ id: sessionId, kind: 'error', msg: 'Network error — not saved.' }); }
    finally { setBusyId(null); }
  }

  const weekStart = (() => {
    const d = startOfWeek(new Date());
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  })();
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <>
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
              { id: 'all',              label: 'All' },
              { id: 'unpaid',           label: 'Unpaid' },
              { id: 'unpaid_this_week', label: 'Unpaid · this week' },
              { id: 'needs_receipt',    label: 'Needs receipt' },
              { id: 'this_week',        label: 'This week' },
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

        {(onScheduleDay || onNewClient) && (
          <div style={{ display: 'flex', gap: 8, marginLeft: view === 'list' ? 'auto' : undefined }}>
            {onNewClient && (
              <button onClick={onNewClient} className="admin-btn-secondary">
                + Add client
              </button>
            )}
            {onScheduleDay && (
              <button onClick={() => onScheduleDay(buildClickIso(new Date()))} className="admin-btn-primary">
                + Schedule session
              </button>
            )}
          </div>
        )}
      </div>

      {view === 'list' && (
        <div className="admin-table-wrap">
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
                      <div className="pii" style={{ fontWeight: 500, color: 'var(--forest-deep)' }}>{c.full_name}</div>
                      <div className="pii" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ whiteSpace: 'nowrap' as const }}>{formatDateTime(s.session_date)}</td>
                <td>
                  {FORMAT_LABELS[s.session_format] ?? s.session_format}
                  {s.session_format === 'online' && (
                    <a
                      href="https://doxy.me/owenlynchtherapy"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'block', fontSize: 11, color: 'var(--sage)', textDecoration: 'underline', textUnderlineOffset: 2, marginTop: 2 }}
                    >doxy.me ↗</a>
                  )}
                </td>
                <td>{displayFee(s.fee)}</td>
                <td>
                  <span className={`admin-tag ${payTag(s.payment_status)}`}>{payLabel(s.payment_status)}</span>
                  {s.payment_status === 'paid' && s.stripe_payment_intent_id && (
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-muted)', marginTop: 3, fontWeight: 500 }}>
                      via Stripe · automatic
                    </span>
                  )}
                  {c.is_low_cost && (
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--lilac-dark)', marginTop: 3, fontWeight: 500 }}>
                      Low cost · cash
                    </span>
                  )}
                  {s.receipt_sent_at && (
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--sage)', marginTop: 3, fontWeight: 500 }}>
                      ✓ Receipt sent {shortWhen(s.receipt_sent_at)}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`admin-tag ${statusTag(s.status)}`}>{statusLabel(s.status)}</span>
                  {lastReminderAt(s) && (
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--sage)', marginTop: 3, fontWeight: 500 }}>
                      ✓ Reminder sent {shortWhen(lastReminderAt(s)!)}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right' as const }}>
                  <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {onClickSession && (
                      <button onClick={() => onClickSession(s, c)} disabled={busyId === s.id} className="admin-btn-secondary">
                        Edit
                      </button>
                    )}
                    {s.status === 'scheduled' && (
                      <button onClick={() => sessionDone(s)} disabled={busyId === s.id} className="admin-btn-primary" style={{ padding: '8px 14px', fontSize: 10 }}>
                        Session done
                      </button>
                    )}
                    {s.payment_status !== 'paid' && s.status !== 'cancelled' && (
                      <button
                        onClick={() => markPaid(s.id, Boolean(c.is_low_cost))}
                        disabled={busyId === s.id}
                        className="admin-btn-secondary"
                        title={c.is_low_cost ? 'Record cash received for this session' : 'Mark this session as paid'}
                      >
                        {c.is_low_cost ? 'Cash received' : 'Mark paid'}
                      </button>
                    )}
                    {s.status === 'scheduled' && (
                      <button onClick={() => setReminderData({ session: s, client: c })} disabled={busyId === s.id} className="admin-btn-secondary">
                        Remind
                      </button>
                    )}
                    <button onClick={() => sendReceipt(s.id)} disabled={busyId === s.id} className="admin-btn-secondary">
                      Receipt
                    </button>
                  </div>
                  {confirmId === s.id && (
                    <SessionDoneOptions
                      session={s}
                      client={c}
                      busy={busyId === s.id}
                      onChoose={choice => void doDone(s.id, choice)}
                      onCancel={() => setConfirmId(null)}
                    />
                  )}
                  {feedback?.id === s.id && (
                    <div style={{
                      marginTop: 8, fontSize: 11,
                      color: feedback.kind === 'ok' ? 'var(--sage)' : 'var(--terracotta)',
                    }}>
                      {feedback.msg}
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
        <CalendarWeekGrid
          clients={clients}
          events={events}
          weekOffset={weekOffset}
          onClickSession={onClickSession}
          onScheduleDay={onScheduleDay}
          onReload={onReload}
          onReminderSession={(session, client) => setReminderData({ session, client })}
          onEditGcalEvent={onEditGcalEvent}
        />
      )}
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

