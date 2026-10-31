'use client';

import { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { dedupeSessions } from './api';
import {
  useAccreditationSettings, useAccreditationHours, useAccreditationLog,
  type LogKind,
} from './accreditation';
import type { ClientRow } from './types';

const KIND_LABEL: Record<LogKind, string> = {
  supervision: 'Supervision',
  cpd: 'CPD / training',
  own_therapy: 'Own therapy',
};
const DUBLIN = 'Europe/Dublin';
const fmtDate = (d: Date) => d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: DUBLIN });
const monthYear = (d: Date) => d.toLocaleDateString('en-IE', { month: 'short', year: 'numeric', timeZone: DUBLIN });
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const round1 = (n: number) => Math.round(n * 10) / 10;
const todayYmd = () => new Date().toLocaleDateString('en-CA', { timeZone: DUBLIN });

type Status = 'met' | 'on_track' | 'behind' | 'later';
const STATUS_LABEL: Record<Status, string> = { met: 'Met', on_track: 'On track', behind: 'Needs attention', later: 'Before applying' };

/**
 * Re-accreditation (IAHIP Bye Law 2B) in one place. Client hours come from
 * the sessions table; supervision, CPD and own-therapy hours from the log.
 * The one thing that needs attention leads; everything else is a calm list.
 */
export function HoursPage({ clients }: { clients: ClientRow[] }) {
  const now = useMemo(() => new Date(), []);
  const accred = useAccreditationSettings();
  const clientHours = useAccreditationHours(clients, accred, now);
  const log = useAccreditationLog();

  const sum = (k: LogKind) => (log.entries ?? []).filter(e => e.kind === k).reduce((n, e) => n + e.hours, 0);
  const supervisionSince = sum('supervision');
  const cpd = sum('cpd');
  const ownTherapy = accred.ownTherapyHours + sum('own_therapy');

  const clientTotal = clientHours.total;
  const sinceApplication = Math.max(0, clientTotal - accred.verifiedClientHours);
  const supervisionDue = sinceApplication / Math.max(accred.supervisionRatio, 1);
  const supervisionNeededAt500 = Math.max(0, accred.hoursTarget - accred.verifiedClientHours) / Math.max(accred.supervisionRatio, 1);
  const supervisionGap = supervisionDue - supervisionSince;
  const supervisionTotal = accred.supervisionVerifiedHours + supervisionSince;

  // Online client hours recorded in the dashboard since accreditation (the
  // dashboard's records start in May 2026, so this is a minimum).
  const accreditedOn = new Date(accred.accreditedOn + 'T00:00:00');
  const onlineSince = useMemo(() => {
    let n = 0;
    for (const c of clients) for (const s of dedupeSessions(c.sessions)) {
      const d = new Date(s.session_date);
      if (s.session_format === 'online' && s.status !== 'cancelled' && s.status !== 'no_show' && d >= accreditedOn && d <= now) n++;
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, accred.accreditedOn, now]);

  // Pace over the last 8 weeks, for "about N weeks to go".
  const weeklyPace = useMemo(() => {
    const from = new Date(now); from.setDate(from.getDate() - 56);
    let n = 0;
    for (const c of clients) for (const s of dedupeSessions(c.sessions)) {
      const d = new Date(s.session_date);
      if (s.status !== 'cancelled' && s.status !== 'no_show' && d >= from && d <= now) n++;
    }
    return n / 8;
  }, [clients, now]);
  const clientToGo = Math.max(0, accred.hoursTarget - clientTotal);
  const weeksToGo = weeklyPace > 0 ? Math.ceil(clientToGo / weeklyPace) : null;

  const opens = addMonths(accreditedOn, 12);
  const closes = addMonths(accreditedOn, 24);
  const cpdTarget = now < addMonths(accreditedOn, 18) ? accred.cpdTargetEarly : accred.cpdTargetLate;

  const requirements: Array<{ key: string; title: string; value: string; detail: string; pct: number; status: Status }> = [
    {
      key: 'client', title: 'Client hours',
      value: `${clientTotal} / ${accred.hoursTarget}`,
      detail: `${accred.verifiedClientHours} verified at accreditation + ${sinceApplication} since.${clientToGo > 0 && weeksToGo ? ` About ${weeksToGo} week${weeksToGo === 1 ? '' : 's'} to go at your current pace.` : ''}`,
      pct: clientTotal / accred.hoursTarget, status: clientToGo === 0 ? 'met' : 'on_track',
    },
    {
      key: 'ratio', title: `Supervision ratio (1:${accred.supervisionRatio})`,
      value: `${round1(supervisionSince)} / ${round1(supervisionDue)} due`,
      detail: `About ${Math.ceil(supervisionNeededAt500)} hours needed by the time you reach ${accred.hoursTarget} client hours. At least monthly.`,
      pct: supervisionDue > 0 ? supervisionSince / supervisionDue : 1, status: supervisionGap > 0.5 ? 'behind' : 'on_track',
    },
    {
      key: 'suptotal', title: 'Supervision total',
      value: `${round1(supervisionTotal)} / ${accred.supervisionTarget}`,
      detail: `${accred.supervisionVerifiedHours} from training + ${round1(supervisionSince)} logged since.`,
      pct: supervisionTotal / accred.supervisionTarget, status: supervisionTotal >= accred.supervisionTarget ? 'met' : 'on_track',
    },
    {
      key: 'own', title: 'Own therapy',
      value: `${round1(ownTherapy)} / ${accred.ownTherapyTarget}`,
      detail: 'Individual and group hours, from your accreditation record plus anything logged.',
      pct: ownTherapy / accred.ownTherapyTarget, status: ownTherapy >= accred.ownTherapyTarget ? 'met' : 'on_track',
    },
    {
      key: 'online', title: 'Online client hours',
      value: `at least ${onlineSince} / max ${accred.onlineMaxHours}`,
      detail: 'Counted from the dashboard (records start May 2026). Needs your supervisor’s approval in the application.',
      pct: onlineSince / accred.onlineMaxHours, status: onlineSince <= accred.onlineMaxHours ? 'met' : 'behind',
    },
    {
      key: 'cpd', title: 'CPD',
      value: `${round1(cpd)} / ${cpdTarget}`,
      detail: `${accred.cpdTargetEarly} hours if you apply within 18 months of accreditation, ${accred.cpdTargetLate} after. Log each course below.`,
      pct: cpd / cpdTarget, status: cpd >= cpdTarget ? 'met' : 'later',
    },
  ];
  const attention = requirements.filter(r => r.status === 'behind');

  // Timeline: accreditation → opens (12 months) → closes (24 months).
  const span = closes.getTime() - accreditedOn.getTime();
  const todayPct = Math.min(100, Math.max(0, ((now.getTime() - accreditedOn.getTime()) / span) * 100));

  return (
    <div className="admin-hours">
      <p className="admin-hours-intro">
        Everything IAHIP Bye Law 2B asks for. Client hours count automatically from your sessions;
        log supervision, training and your own therapy below.
      </p>

      {attention.length > 0 ? (
        <section className="admin-hours-attention" aria-label="Needs attention">
          <div className="admin-hours-attention-head">
            <span className="admin-hours-state is-behind">Needs attention</span>
            <span>{attention.length} of {requirements.length} requirements</span>
          </div>
          <h2>Supervision is {round1(supervisionGap)} hour{round1(supervisionGap) === 1 ? '' : 's'} behind the 1:{accred.supervisionRatio} ratio</h2>
          <p>
            You&rsquo;ve logged {round1(supervisionSince)} hours of supervision since your accreditation application.
            Your client hours since then call for {round1(supervisionDue)} by now, and about {Math.ceil(supervisionNeededAt500)} by
            the time you reach {accred.hoursTarget}. A few extra sessions over the next couple of months would close the gap.
          </p>
          <div className="admin-hours-bar">
            <div className="admin-hours-bar-row"><span>Supervision since application</span><b>{round1(supervisionSince)} of {round1(supervisionDue)} due</b></div>
            <div className="admin-accred-track"><div style={{ width: `${Math.min(100, (supervisionSince / Math.max(supervisionDue, 0.01)) * 100)}%`, background: 'var(--gold)' }} /></div>
          </div>
        </section>
      ) : (
        <section className="admin-hours-attention is-calm" aria-label="Status">
          <span className="admin-hours-state is-met">All on track</span>
          <h2>Nothing needs attention right now</h2>
        </section>
      )}

      <div className="admin-hours-grid">
        <section className="admin-card">
          <h2 className="admin-h2" style={{ marginBottom: 6 }}>Requirements</h2>
          <ul className="admin-hours-list">
            {requirements.map(r => (
              <li key={r.key}>
                <span className={`admin-hours-check${r.status === 'met' ? ' is-done' : ''}`} aria-hidden />
                <div className="admin-hours-body">
                  <div className="admin-hours-row"><b>{r.title}</b><span>{r.value}</span></div>
                  {r.key === 'client' && (
                    <div className="admin-accred-track"><div style={{ width: `${Math.min(100, r.pct * 100)}%` }} /></div>
                  )}
                  <p>{r.detail}</p>
                </div>
                <span className={`admin-hours-state is-${r.status === 'met' ? 'met' : r.status === 'behind' ? 'behind' : r.status === 'later' ? 'later' : 'track'}`}>
                  {STATUS_LABEL[r.status]}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <LogCard log={log} />
      </div>

      <section className="admin-card">
        <h2 className="admin-h2">Application window</h2>
        <div className="admin-hours-timeline" role="img" aria-label={`Applications open ${monthYear(opens)} and close ${monthYear(closes)}`}>
          <div className="base" />
          <div className="win" />
          <div className="now" style={{ left: `${todayPct}%` }} />
        </div>
        <div className="admin-hours-timeline-labels">
          <span>Accredited · {monthYear(accreditedOn)}</span>
          <span>Opens · {monthYear(opens)}</span>
          <span>Closes · {monthYear(closes)}</span>
        </div>
        <p className="admin-hours-note">
          The orange line is today. You&rsquo;ll also need a report from your supervisor and current indemnity insurance.
        </p>
      </section>
    </div>
  );
}

function LogCard({ log }: { log: ReturnType<typeof useAccreditationLog> }) {
  const lastSupervisor = log.entries?.find(e => e.kind === 'supervision')?.detail ?? '';
  const [kind, setKind] = useState<LogKind>('supervision');
  const [date, setDate] = useState(todayYmd());
  const [hours, setHours] = useState('1');
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const err = await log.add({ kind, entry_date: date, hours: Number(hours), detail: detail.trim() || (kind === 'supervision' ? lastSupervisor : '') || null });
    setBusy(false);
    if (err) { setMsg({ ok: false, text: err }); return; }
    setMsg({ ok: true, text: `${KIND_LABEL[kind]} logged: ${hours} hour${hours === '1' ? '' : 's'} on ${fmtDate(new Date(date + 'T12:00:00'))}.` });
    setDetail('');
  }

  return (
    <section className="admin-card">
      <h2 className="admin-h2" style={{ marginBottom: 14 }}>Log hours</h2>
      <form className="admin-hours-form" onSubmit={save}>
        <label>Type
          <select id="log-kind" value={kind} onChange={e => setKind(e.target.value as LogKind)}>
            {(Object.keys(KIND_LABEL) as LogKind[]).map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        </label>
        <div className="admin-form-2col" style={{ gap: 12 }}>
          <label>Date<input id="log-date" type="date" value={date} max={todayYmd()} onChange={e => setDate(e.target.value)} required /></label>
          <label>Hours<input id="log-hours" type="number" min="0.25" max="24" step="0.25" value={hours} onChange={e => setHours(e.target.value)} required /></label>
        </div>
        <label>{kind === 'cpd' ? 'Course or event' : kind === 'supervision' ? 'Supervisor' : 'Therapist or group'}
          <input id="log-detail" type="text" maxLength={200} value={detail} onChange={e => setDetail(e.target.value)}
            placeholder={kind === 'supervision' ? (lastSupervisor || 'Supervisor’s name') : kind === 'cpd' ? 'e.g. Autism training' : ''} />
        </label>
        <button type="submit" className="admin-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Log hours'}</button>
        {msg && <p className={`admin-hours-msg${msg.ok ? '' : ' is-error'}`} role="status">{msg.text}</p>}
      </form>

      <h3 className="admin-hours-subhead">Logged so far</h3>
      {log.error && <p className="admin-hours-msg is-error">{log.error}</p>}
      {!log.entries ? (
        <p className="admin-hours-note">Loading…</p>
      ) : log.entries.length === 0 ? (
        <p className="admin-hours-note">Nothing logged yet. Your first supervision session will appear here.</p>
      ) : (
        <ul className="admin-hours-log">
          {log.entries.slice(0, 40).map(e => (
            <li key={e.id}>
              <span className={`admin-hours-kind is-${e.kind}`}>{KIND_LABEL[e.kind]}</span>
              <span className="when">{fmtDate(new Date(e.entry_date + 'T12:00:00'))}</span>
              <span className="what">{e.detail ?? ''}</span>
              <span className="hrs">{round1(e.hours)} h</span>
              {confirmId === e.id ? (
                <span className="confirm">
                  <button type="button" className="admin-btn-secondary" onClick={async () => { const err = await log.remove(e.id); setConfirmId(null); if (err) setMsg({ ok: false, text: err }); }}>Delete</button>
                  <button type="button" className="admin-btn-secondary" onClick={() => setConfirmId(null)}>Keep</button>
                </span>
              ) : (
                <button type="button" className="admin-hours-del" aria-label={`Delete ${KIND_LABEL[e.kind]} on ${e.entry_date}`} onClick={() => setConfirmId(e.id)}>
                  <Trash2 size={15} strokeWidth={1.7} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
