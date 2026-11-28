'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { ClientDetail } from './ClientDetail';
import { SessionsList } from './SessionsList';
import { Revenue } from './Revenue';
import { Waitlist } from './Waitlist';
import { SettingsHub } from './SettingsHub';
import { StatementImport } from './StatementImport';
import { NewClientModal } from './NewClientModal';
import { ScheduleSessionModal } from './ScheduleSessionModal';
import type { DriftItem } from '@/lib/calendarDrift';
import { SessionEditModal } from './SessionEditModal';
import { GcalEventEditModal } from './GcalEventEditModal';
import { MfaModal } from './MfaModal';
import { adminFetch, logout } from './api';
import { useIsPhone } from './useIsPhone';
import { useSessionPanel, SessionPanelHost } from './SessionPanelHost';
import { DesktopPage } from './DesktopPage';
import { DesktopCalendar } from './DesktopCalendar';
import { DesktopClients } from './DesktopClients';
import { DesktopMoney } from './DesktopMoney';
import { DesktopForms } from './DesktopForms';
import { PhoneApp } from './phone/PhoneApp';
import type {
  AdminSection, ClientRow, SessionRow, TokenRow, SubmissionRow, CalendarEvent, CalendarStatus,
  SessionFilter, FormsTab, GcalRef, ReminderHealth, WaitlistRow,
} from './types';
import { PRACTICE } from '@/practice.config';

/** One short line under the desktop band, as in the prototype. */
function desktopSubtitle(section: AdminSection, clientCount: number, waiting: number, fallback: string): string {
  switch (section) {
    case 'sessions': return new Date().toLocaleDateString('en-IE', { month: 'long', year: 'numeric', timeZone: 'Europe/Dublin' });
    case 'revenue': return 'This month';
    case 'clients': return `${clientCount} client${clientCount === 1 ? '' : 's'}`;
    case 'forms':
    case 'analytics': return 'Send to a client, or download a PDF';
    case 'waitlist': return waiting === 0 ? 'Nobody waiting' : `${waiting} ${waiting === 1 ? 'person' : 'people'} waiting`;
    case 'settings':
    case 'hours': return 'Your practice';
    default: return fallback;
  }
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function dateLine() {
  return new Date().toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/Dublin',
  });
}

export function AdminShell() {
  const [section, setSection] = useState<AdminSection>('dashboard');
  const isPhone = useIsPhone();
  const sp = useSessionPanel();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // Where Google Calendar disagrees with the app (the app is the diary).
  const [drift, setDrift] = useState<DriftItem[]>([]);
  const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);

  const [openClient, setOpenClient] = useState<ClientRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [, setLoadingAll] = useState(false);
  const [reminderHealth, setReminderHealth] = useState<ReminderHealth | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  // Set when a refresh fails — the UI keeps showing the last good data with a
  // banner instead of silently rendering zeros (which read as "no revenue").
  const [loadError, setLoadError] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleInitialIso, setScheduleInitialIso] = useState<string | undefined>();
  const [editSession, setEditSession] = useState<{ session: SessionRow; client: ClientRow } | null>(null);
  const [editGcalData, setEditGcalData] = useState<GcalRef | null>(null);
  const [mfaOpen, setMfaOpen] = useState(false);

  // Privacy mode — blurs client-identifying info so the dashboard can be shown
  // to others / screen-shared. Persisted so it survives navigation & refresh.
  const [privacy, setPrivacy] = useState(false);
  useEffect(() => {
    try { setPrivacy(localStorage.getItem('ol_admin_privacy') === '1'); } catch {}
  }, []);
  const togglePrivacy = useCallback(() => {
    setPrivacy(p => {
      const next = !p;
      try { localStorage.setItem('ol_admin_privacy', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);
  // Filter intents carried when a Quick Action card navigates between sections.
  const [sessionsFilter, setSessionsFilter] = useState<SessionFilter | undefined>();
  const [formsTab, setFormsTab] = useState<FormsTab | undefined>();

  function navigateSection(section: AdminSection, opts?: { sessionsFilter?: SessionFilter; formsTab?: FormsTab }) {
    if (opts?.sessionsFilter) setSessionsFilter(opts.sessionsFilter);
    if (opts?.formsTab) setFormsTab(opts.formsTab);
    setSection(section);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get('gcal');
    if (gcal === 'connected') {
      setFlash({ kind: 'success', msg: 'Google Calendar connected.' });
    } else if (gcal === 'error') {
      const reason = params.get('reason') ?? 'unknown';
      setFlash({ kind: 'error', msg: `Google Calendar connect failed: ${reason}` });
    }
    if (gcal) {
      params.delete('gcal');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState({}, '', `/admin/intake${qs ? '?' + qs : ''}`);
      setTimeout(() => setFlash(null), 5000);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoadingAll(true);
    try {
      const [cRes, tRes, sRes, calStatusRes, healthRes, wRes] = await Promise.all([
        adminFetch('/api/admin/clients'),
        adminFetch('/api/intake/tokens'),
        adminFetch('/api/intake/submissions'),
        adminFetch('/api/auth/google/status'),
        adminFetch('/api/admin/reminders/status'),
        adminFetch('/api/admin/waitlist'),
      ]);

      if (cRes.status === 401) { window.dispatchEvent(new Event('admin-unauthorized')); return; }

      // On a failed fetch keep the previous data (don't blank the dashboard);
      // the banner tells the user the numbers may be stale.
      if (cRes.ok) setClients((await cRes.json()).clients ?? []);
      if (tRes.ok) setTokens((await tRes.json()).tokens ?? []);
      if (sRes.ok) setSubmissions((await sRes.json()).submissions ?? []);
      if (healthRes.ok) setReminderHealth((await healthRes.json()) as ReminderHealth);
      if (wRes.ok) setWaitlist((await wRes.json()).waitlist ?? []);

      let connected = calStatus?.connected ?? false;
      if (calStatusRes.ok) {
        const calStatusJson = (await calStatusRes.json()) as CalendarStatus;
        setCalStatus(calStatusJson);
        connected = calStatusJson.connected;
        if (!connected) { setEvents([]); setDrift([]); }
      }
      if (connected) {
        const evRes = await adminFetch(`/api/admin/calendar?weekOffset=${weekOffset}`);
        if (evRes.ok) {
          const evJson = await evRes.json();
          setEvents(evJson.events ?? []);
          setDrift(evJson.drift ?? []);
          // The calendar call reconciles Google → sessions. The client list
          // above was fetched in parallel (before that sync), so if the sync
          // changed anything, reload it now — otherwise a Google-side delete or
          // move only showed up a poll (~30 s) later.
          if (evJson.changed > 0) {
            const fresh = await adminFetch('/api/admin/clients');
            if (fresh.ok) setClients((await fresh.json()).clients ?? []);
          }
        }
      }

      setLoadError(!cRes.ok || !tRes.ok || !sRes.ok);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingAll(false);
    }
    // calStatus?.connected is deliberately not a dependency: it's only the
    // fallback when the status fetch fails, and depending on it would
    // re-create reload (and re-arm the 30s poll) on every status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  useEffect(() => { void reload(); }, [reload]);

  // Auto-refresh every 30 s so payment status updates from Stripe webhook appear automatically
  useEffect(() => {
    const timer = setInterval(() => { void reload(); }, 30_000);
    return () => clearInterval(timer);
  }, [reload]);

  useEffect(() => {
    if (!calStatus?.connected) return;
    let cancelled = false;
    (async () => {
      const evRes = await adminFetch(`/api/admin/calendar?weekOffset=${weekOffset}`);
      if (!evRes.ok || cancelled) return;
      const evJson = await evRes.json();
      setEvents(evJson.events ?? []);
      setDrift(evJson.drift ?? []);
    })();
    return () => { cancelled = true; };
  }, [weekOffset, calStatus?.connected]);

  useEffect(() => {
    if (!openClient) return;
    const refreshed = clients.find(c => c.id === openClient.id);
    if (refreshed) setOpenClient(refreshed);
  }, [clients, openClient]);

  async function connectCalendar() {
    const res = await adminFetch('/api/auth/google', { method: 'POST' });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(`Could not start Google connect: ${json.error ?? res.status}`);
      return;
    }
    const json = await res.json();
    if (json.url) window.location.href = json.url;
  }

  async function disconnectCalendar() {
    if (!confirm('Disconnect Google Calendar? You can reconnect any time.')) return;
    await adminFetch('/api/auth/google/disconnect', { method: 'POST' });
    setCalStatus({ connected: false });
    setEvents([]);
    setDrift([]);
  }

  // The existing calendar and income report, kept under the new Calendar and Money
  // pages on desktop and phone alike.
  const fullCalendar = (
    <SessionsList
      clients={clients}
      events={events}
      weekOffset={weekOffset}
      onWeekOffsetChange={setWeekOffset}
      onReload={reload}
      initialFilter={sessionsFilter}
      onClickSession={(session, client) => setEditSession({ session, client })}
      onScheduleDay={iso => { setScheduleInitialIso(iso); setScheduleOpen(true); }}
      onNewClient={() => setModalOpen(true)}
      onEditGcalEvent={setEditGcalData}
    />
  );
  const fullMoney = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Revenue clients={clients} />
      <StatementImport clients={clients} onReload={reload} />
    </div>
  );

  return (
    <div className={`admin-root${privacy ? ' is-private' : ''}`}>
      <div className="admin-bg-shapes" aria-hidden>
        <div className="admin-blob admin-blob-1" />
        <div className="admin-blob admin-blob-2" />
        <div className="admin-blob admin-blob-3" />
        <div className="admin-blob admin-blob-4" />
        <div className="admin-blob admin-blob-5" />
      </div>

      <div className="admin-shell">
        {isPhone ? (
          <PhoneApp
            clients={clients}
            tokens={tokens}
            submissions={submissions}
            events={events}
            drift={drift}
            calendar={calStatus}
            waitlist={waitlist}
            reminderHealth={reminderHealth}
            flash={flash}
            loadError={loadError}
            sessionsFilter={sessionsFilter}
            formsTab={formsTab}
            onIntent={opts => {
              if (opts.sessionsFilter) setSessionsFilter(opts.sessionsFilter);
              if (opts.formsTab) setFormsTab(opts.formsTab);
            }}
            onReload={reload}
            onConnectCalendar={connectCalendar}
            onDisconnectCalendar={disconnectCalendar}
            onNewClient={() => setModalOpen(true)}
            onOpenClientRecord={setOpenClient}
            onEditSession={(session, client) => setEditSession({ session, client })}
            privacy={privacy}
            onTogglePrivacy={togglePrivacy}
            onOpenMfa={() => setMfaOpen(true)}
            onSignOut={() => { void logout().then(() => window.location.reload()); }}
            fullCalendar={fullCalendar}
            fullMoney={fullMoney}
            overlayOpen={Boolean(openClient || modalOpen || scheduleOpen || editSession || editGcalData || mfaOpen)}
          />
        ) : (
        <>
        <Sidebar
          active={section}
          onNavigate={s => {
            if (s === 'new-client') setModalOpen(true);
            else {
              // Clear any filter intent so direct sidebar navigation always
              // opens the section in its default state (calendar grid, all-tab, etc.)
              if (s === 'sessions') setSessionsFilter(undefined);
              if (s === 'forms') setFormsTab(undefined);
              setSection(s);
            }
          }}
          privacy={privacy}
          onTogglePrivacy={togglePrivacy}
        />

        <main className="admin-main">
          {loadError && (
            <div
              role="alert"
              style={{
                margin: '0 0 18px', padding: '12px 18px', borderRadius: 12,
                background: 'rgba(179, 38, 30, 0.12)', border: '1px solid rgba(179, 38, 30, 0.4)',
                color: 'var(--sd-danger)', fontSize: 13, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
              }}
            >
              <span>Couldn&apos;t refresh the dashboard — the numbers below are from the last successful load.</span>
              <button
                onClick={() => void reload()}
                style={{
                  border: '1px solid rgba(179, 38, 30, 0.5)', background: 'transparent', color: 'var(--sd-danger)',
                  borderRadius: 8, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          )}

          {section === 'dashboard' && (
            <Dashboard
              clients={clients}
              tokens={tokens}
              events={events}
              drift={drift}
              calendarStatus={calStatus}
              onReload={reload}
              onConnectCalendar={connectCalendar}
              onDisconnectCalendar={disconnectCalendar}
              onNewClient={() => setModalOpen(true)}
              onClickSession={(session, client) => setEditSession({ session, client })}
              onSchedule={iso => { setScheduleInitialIso(iso); setScheduleOpen(true); }}
              onOpenClient={setOpenClient}
              onOpenPanel={sp.open}
              panelSessionId={sp.panel?.id ?? null}
              onNavigateSection={navigateSection}
              greeting={greet()}
              dateLine={dateLine()}
              flash={flash}
              reminderHealth={reminderHealth}
              waitlist={waitlist}
            />
          )}

          {/* Desktop pages follow the Sage Diary prototype; the phone has its own app (phone/PhoneApp.tsx). */}
          {section !== 'dashboard' && (
            <>
              {section === 'sessions' && (
                <DesktopCalendar
                  clients={clients}
                  openFull={sessionsFilter !== undefined}
                  onSchedule={() => { setScheduleInitialIso(undefined); setScheduleOpen(true); }}
                  onOpenPanel={sp.open}
                  panelSessionId={sp.panel?.id ?? null}
                  onEditSession={(session, client) => setEditSession({ session, client })}
                  onOpenClient={setOpenClient}
                  fullCalendar={fullCalendar}
                />
              )}
              {section === 'clients' && (
                <DesktopClients
                  clients={clients}
                  onNewClient={() => setModalOpen(true)}
                  onOpenPanel={sp.open}
                  panelSessionId={sp.panel?.id ?? null}
                  onEditSession={(session, client) => setEditSession({ session, client })}
                  onOpenClient={setOpenClient}
                />
              )}
              {section === 'revenue' && (
                <DesktopMoney
                  clients={clients}
                  onOpenPanel={sp.open}
                  fullMoney={fullMoney}
                />
              )}
              {(section === 'forms' || section === 'analytics') && (
                <DesktopForms clients={clients} submissions={submissions} tokens={tokens} formsTab={formsTab} onNewClient={() => setModalOpen(true)} />
              )}
              {section === 'waitlist' && (
                <DesktopPage title="Waitlist" subtitle={desktopSubtitle('waitlist', clients.length, waitlist.filter(w => w.status === 'waiting').length, '')}>
                  <Waitlist rows waitlist={waitlist} onReload={reload} />
                </DesktopPage>
              )}
              {(section === 'settings' || section === 'hours') && (
                <DesktopPage title="Settings" subtitle="Your practice">
                  <SettingsHub
                    section={section}
                    onSection={setSection}
                    clients={clients}
                    calendar={calStatus}
                    onConnectCalendar={connectCalendar}
                    onDisconnectCalendar={disconnectCalendar}
                    privacy={privacy}
                    onTogglePrivacy={togglePrivacy}
                    onOpenMfa={() => setMfaOpen(true)}
                    onSignOut={() => { void logout().then(() => window.location.reload()); }}
                  />
                </DesktopPage>
              )}
            </>
          )}

          <div className="admin-foot">{PRACTICE.businessName} · Practice Management</div>
        </main>
        </>
        )}
      </div>

      {openClient && (
        <ClientDetail
          client={openClient}
          submissions={submissions}
          onClose={() => setOpenClient(null)}
          onReload={reload}
          onEditSession={(session, client) => setEditSession({ session, client })}
        />
      )}

      {modalOpen && (
        <NewClientModal
          asModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => { reload(); }}
        />
      )}

      {editGcalData && (
        <GcalEventEditModal
          gcalEvent={editGcalData}
          clients={clients}
          onClose={() => setEditGcalData(null)}
          onSuccess={() => { setEditGcalData(null); reload(); }}
        />
      )}

      {scheduleOpen && (
        <ScheduleSessionModal
          clients={clients}
          initialIsoDate={scheduleInitialIso}
          onClose={() => setScheduleOpen(false)}
          onSuccess={() => { reload(); }}
          onNewClient={() => { setScheduleOpen(false); setModalOpen(true); }}
        />
      )}

      {editSession && (
        <SessionEditModal
          session={editSession.session}
          client={editSession.client}
          onClose={() => setEditSession(null)}
          onSuccess={() => { reload(); }}
        />
      )}

      {mfaOpen && <MfaModal onClose={() => setMfaOpen(false)} />}

      {!isPhone && (
        <SessionPanelHost
          panel={sp.panel}
          clients={clients}
          onClose={sp.close}
          onDismiss={sp.dismiss}
          onChanged={reload}
          onEditSession={(session, client) => setEditSession({ session, client })}
          onOpenClient={setOpenClient}
        />
      )}
    </div>
  );
}
