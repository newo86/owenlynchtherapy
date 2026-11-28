'use client';

import { useMemo } from 'react';
import { dedupeSessions } from './api';
import { MobileHome } from './MobileHome';
import { DesktopToday } from './DesktopToday';
import { SageHeaderBand } from './sage';
import { CalendarDriftCard } from './CalendarDriftCard';
import { useIsPhone } from './useIsPhone';
import { longDay, dublinYmd } from './desktopToday';
import type { DriftItem } from '@/lib/calendarDrift';
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
  /** Where Google Calendar disagrees with the app. */
  drift: DriftItem[];
  onConnectCalendar: () => void;
  onDisconnectCalendar: () => void;
  onNewClient: () => void;
  /** Opens the session editor (SessionEditModal) for a session. */
  onClickSession: (session: SessionRow, client: ClientRow) => void;
  /** Desktop: open the existing Schedule session flow, optionally on a chosen time. */
  onSchedule: (isoLocal?: string) => void;
  /** Desktop: open a client's record. */
  onOpenClient: (client: ClientRow) => void;
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

// ── component ──────────────────────────────────────────────────────────────

export function Dashboard({
  clients, calendarStatus, drift, reminderHealth, flash,
  onReload, onConnectCalendar, onClickSession, onSchedule, onOpenClient,
}: Props) {
  const today = new Date();
  const allSessions = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    // Collapse duplicate rows (recurring-sync artefact) so counts aren't doubled.
    for (const c of clients) for (const s of dedupeSessions(c.sessions)) out.push({ s, c });
    return out;
  }, [clients]);

  const todayYmd = dublinYmd(today.toISOString());
  const todaySessions = allSessions
    .filter(({ s }) => dublinYmd(s.session_date) === todayYmd && s.status !== 'cancelled')
    .sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());

  const strip = reminderStripState(reminderHealth);
  const isPhone = useIsPhone();

  // Phones get their own home: today's clients, free times and booking only
  // (Owen's brief, Nov 2026).
  if (isPhone) {
    return (
      <>
        <SageHeaderBand
          title="Today"
          subtitle={new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Dublin' })}
        />
        {/* The calm "Calendar connected" pill is hidden on phones (small text can't sit on the band),
            but "not connected" is a warning Owen must see, so it gets its own row. */}
        {calendarStatus && !calendarStatus.connected && (
          <button type="button" className="sd-notice" onClick={onConnectCalendar}>
            Google Calendar isn&apos;t connected. Tap to reconnect.
          </button>
        )}
        {strip && strip.tone !== 'ok' && (
          <div className={`admin-banner is-${strip.tone}`} role="alert">
            <span className="admin-banner-dot" aria-hidden />{strip.msg}
          </div>
        )}
        <CalendarDriftCard items={drift} onResolved={onReload} compact />
        <MobileHome
          clients={clients}
          todaySessions={todaySessions}
          onOpenSession={onClickSession}
          onBooked={onReload}
        />
      </>
    );
  }

  const notices = Boolean(flash) || Boolean(strip && strip.tone !== 'ok');
  return (
    <>
      {/* Header band as in the prototype: "Today", the full date, one yellow button. */}
      <SageHeaderBand
        title="Today"
        subtitle={longDay(todayYmd)}
        action={(
          <>
            {calendarStatus && !calendarStatus.connected && (
              <button type="button" onClick={onConnectCalendar} className="admin-status-pill" style={{ cursor: 'pointer' }}>
                <span className="admin-status-dot is-off" />
                Calendar not connected. Connect
              </button>
            )}
            <button type="button" className="sd-btn sd-btn-primary dt-cta" onClick={() => onSchedule()}>
              Book next session
            </button>
          </>
        )}
      />

      {notices && (
        <div className="dt-wrap dt-notices">
          {flash && <div className={`admin-banner is-${flash.kind === 'success' ? 'ok' : 'alert'}`} role="status">{flash.msg}</div>}
          {/* Problems with the morning reminders shout here; a healthy run is a quiet line at the bottom. */}
          {strip && strip.tone !== 'ok' && (
            <div className={`admin-banner is-${strip.tone}`} role="alert">
              <span className="admin-banner-dot" aria-hidden />{strip.msg}
            </div>
          )}
        </div>
      )}

      <DesktopToday
        clients={clients}
        allSessions={allSessions}
        todaySessions={todaySessions}
        drift={drift}
        onReload={onReload}
        onSchedule={onSchedule}
        onEditSession={onClickSession}
        onOpenClient={onOpenClient}
      />

      <footer className="admin-health dt-wrap">
        {strip && strip.tone === 'ok' && <span><span className="dot is-ok" aria-hidden />{strip.msg}</span>}
        <span>
          <span className={`dot${calendarStatus?.connected ? ' is-ok' : ' is-off'}`} aria-hidden />
          {calendarStatus?.connected ? 'Google Calendar connected' : 'Google Calendar not connected'}
        </span>
      </footer>
    </>
  );
}
