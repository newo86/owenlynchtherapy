'use client';

import { GraduationCap } from 'lucide-react';
import { Avatar } from './Avatar';
import { dedupeSessions, displayFee } from './api';
import { SessionDoneOptions, type SessionDoneChoice } from './SessionDoneOptions';
import type { AccreditationSettings } from './accreditation';
import type { ClientRow, SessionRow } from './types';

const DUBLIN = 'Europe/Dublin';
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: DUBLIN });
const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: DUBLIN });

/** "in 25 minutes", "now", "tomorrow at 4:00 p.m.", "Tue at 4:00 p.m." */
function whenLabel(iso: string, now: Date): string {
  const start = new Date(iso);
  const mins = Math.round((start.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return 'now';
  if (dayKey(start) === dayKey(now)) {
    if (mins < 60) return `in ${mins} minute${mins === 1 ? '' : 's'}`;
    const h = Math.round(mins / 60);
    return `in about ${h} hour${h === 1 ? '' : 's'}`;
  }
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (dayKey(start) === dayKey(tomorrow)) return `tomorrow at ${timeOf(iso)}`;
  return `${start.toLocaleDateString('en-IE', { weekday: 'short', timeZone: DUBLIN })} at ${timeOf(iso)}`;
}

/**
 * The next scheduled session within a week (or the one running now, up to
 * 50 minutes after it started). Null when nothing is coming up.
 */
export function findNextUp(all: Array<{ s: SessionRow; c: ClientRow }>, now: Date) {
  const horizon = now.getTime() + 7 * 24 * 60 * 60 * 1000;
  const runningGrace = 50 * 60 * 1000;
  return all
    .filter(({ s }) => {
      const t = new Date(s.session_date).getTime();
      return s.status === 'scheduled' && t > now.getTime() - runningGrace && t < horizon;
    })
    .sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime())[0] ?? null;
}

interface NextUpProps {
  session: SessionRow;
  client: ClientRow;
  now: Date;
  busy: boolean;
  showDoneOptions: boolean;
  feedback: string | null;
  onSessionDone: () => void;
  onDoneChoice: (choice: SessionDoneChoice) => void;
  onCancelConfirm: () => void;
  onOpen: () => void;
}

export function NextUpCard({
  session, client, now, busy, showDoneOptions, feedback,
  onSessionDone, onDoneChoice, onCancelConfirm, onOpen,
}: NextUpProps) {
  const history = dedupeSessions(client.sessions)
    .filter(s => s.status !== 'cancelled' && new Date(s.session_date) < new Date(session.session_date))
    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  const sessionNumber = history.length + 1;
  const lastNote = history.find(s => s.notes && s.notes.trim());
  const isToday = dayKey(new Date(session.session_date)) === dayKey(now);
  const paid = session.payment_status === 'paid';
  const reminded = (session.session_reminders?.length ?? 0) > 0;
  const format = client.is_low_cost ? 'Low cost · cash' : session.session_format === 'online' ? 'Online' : 'In person';

  return (
    <section className="admin-nextup" aria-label="Next session">
      <div className="admin-nextup-head">
        <h2>Next up</h2>
        <span>{whenLabel(session.session_date, now)}</span>
      </div>
      <div className="admin-nextup-who">
        <span className="admin-nextup-avatar"><Avatar name={client.full_name} size={52} /></span>
        <div style={{ minWidth: 0 }}>
          <p className="admin-nextup-name pii">{client.full_name}</p>
          <p className="admin-nextup-meta">
            {timeOf(session.session_date)} · Session {sessionNumber} · {format} · {displayFee(session.fee)}
          </p>
          <div className="admin-nextup-chips">
            <span className={`admin-nextup-chip${paid ? ' is-ok' : ''}`}>{paid ? 'Paid' : 'Not paid yet'}</span>
            <span className={`admin-nextup-chip${reminded ? ' is-ok' : ''}`}>{reminded ? 'Reminder sent' : 'No reminder sent'}</span>
          </div>
        </div>
      </div>
      {lastNote && (
        <p className="admin-nextup-note pii">
          <b>Last session ({new Date(lastNote.session_date).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', timeZone: DUBLIN })}):</b>{' '}
          {lastNote.notes}
        </p>
      )}
      <div className="admin-nextup-actions">
        {isToday && (
          <button type="button" className="admin-btn-primary" onClick={onSessionDone} disabled={busy}>
            Session done
          </button>
        )}
        <button type="button" className="admin-nextup-ghost" onClick={onOpen}>Open session</button>
      </div>
      {showDoneOptions && (
        <div className="admin-nextup-options">
          <SessionDoneOptions session={session} client={client} busy={busy} onChoose={onDoneChoice} onCancel={onCancelConfirm} />
        </div>
      )}
      {feedback && <p className="admin-nextup-feedback" role="status">{feedback}</p>}
    </section>
  );
}

interface AccredProps {
  accred: AccreditationSettings;
  total: number;
  sessionsSince: number;
  onOpen: () => void;
}

/** Compact client-hours progress for the Today page; detail lives on Revenue. */
export function AccreditationMiniCard({ accred, total, onOpen }: AccredProps) {
  const pct = Math.min(100, (total / Math.max(accred.hoursTarget, 1)) * 100);
  const toGo = Math.max(0, accred.hoursTarget - total);
  return (
    <section className="admin-card admin-accred-mini">
      <div className="admin-card-head" style={{ marginBottom: 12 }}>
        <h2 className="admin-h2" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GraduationCap size={20} strokeWidth={1.6} aria-hidden /> Accreditation
        </h2>
      </div>
      <div className="admin-accred-row">
        <span>Client hours</span>
        <b>{total.toLocaleString('en-IE')} / {accred.hoursTarget.toLocaleString('en-IE')}</b>
      </div>
      <div className="admin-accred-track" role="img" aria-label={`${Math.round(pct)}% of ${accred.hoursTarget} hours`}>
        <div style={{ width: `${pct}%` }} />
      </div>
      <p className="admin-accred-hint">{toGo > 0 ? `${toGo} to go` : 'Target reached'}</p>
      <button type="button" className="admin-btn-secondary" onClick={onOpen} style={{ alignSelf: 'flex-start' }}>
        See the full tracker
      </button>
    </section>
  );
}
