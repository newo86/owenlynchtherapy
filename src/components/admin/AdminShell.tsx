'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { ClientsList } from './ClientsList';
import { ClientDetail } from './ClientDetail';
import { SessionsList } from './SessionsList';
import { FormsTable } from './FormsTable';
import { Revenue } from './Revenue';
import { NewClientModal } from './NewClientModal';
import { ScheduleSessionModal } from './ScheduleSessionModal';
import { SessionEditModal } from './SessionEditModal';
import { adminFetch, clearSecret } from './api';
import type {
  AdminSection, ClientRow, SessionRow, TokenRow, SubmissionRow, CalendarEvent, CalendarStatus,
  SessionFilter, FormsTab,
} from './types';

const SECTION_TITLES: Record<AdminSection, string> = {
  dashboard: 'Practice Overview',
  clients: 'Clients',
  sessions: 'Calendar',
  revenue: 'Revenue',
  forms: 'Forms',
  'new-client': 'Onboarding',
};

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

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);

  const [openClient, setOpenClient] = useState<ClientRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [, setLoadingAll] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleInitialIso, setScheduleInitialIso] = useState<string | undefined>();
  const [editSession, setEditSession] = useState<{ session: SessionRow; client: ClientRow } | null>(null);
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
      const [cRes, tRes, sRes, calStatusRes] = await Promise.all([
        adminFetch('/api/admin/clients'),
        adminFetch('/api/intake/tokens'),
        adminFetch('/api/intake/submissions'),
        adminFetch('/api/auth/google/status'),
      ]);

      if (cRes.status === 401) { window.dispatchEvent(new Event('admin-unauthorized')); return; }

      const [cJson, tJson, sJson, calStatusJson] = await Promise.all([
        cRes.ok ? cRes.json() : { clients: [] },
        tRes.ok ? tRes.json() : { tokens: [] },
        sRes.ok ? sRes.json() : { submissions: [] },
        calStatusRes.ok ? calStatusRes.json() : { connected: false },
      ]);

      setClients(cJson.clients ?? []);
      setTokens(tJson.tokens ?? []);
      setSubmissions(sJson.submissions ?? []);
      setCalStatus(calStatusJson as CalendarStatus);

      if ((calStatusJson as CalendarStatus).connected) {
        const evRes = await adminFetch(`/api/admin/calendar?weekOffset=${weekOffset}`);
        if (evRes.ok) {
          const evJson = await evRes.json();
          setEvents(evJson.events ?? []);
        }
      } else {
        setEvents([]);
      }
    } finally {
      setLoadingAll(false);
    }
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
  }

  return (
    <div className="admin-root">
      <div className="admin-bg-shapes" aria-hidden>
        <div className="admin-blob admin-blob-1" />
        <div className="admin-blob admin-blob-2" />
        <div className="admin-blob admin-blob-3" />
        <div className="admin-blob admin-blob-4" />
        <div className="admin-blob admin-blob-5" />
      </div>

      <div className="admin-shell">
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
          onSignOut={() => { clearSecret(); window.location.reload(); }}
        />

        <main className="admin-main">
          {section === 'dashboard' && (
            <Dashboard
              clients={clients}
              tokens={tokens}
              events={events}
              calendarStatus={calStatus}
              weekOffset={weekOffset}
              onWeekOffsetChange={setWeekOffset}
              onReload={reload}
              onConnectCalendar={connectCalendar}
              onDisconnectCalendar={disconnectCalendar}
              onNewClient={() => setModalOpen(true)}
              onScheduleDay={iso => { setScheduleInitialIso(iso); setScheduleOpen(true); }}
              onClickSession={(session, client) => setEditSession({ session, client })}
              onNavigateSection={navigateSection}
              greeting={greet()}
              dateLine={dateLine()}
              flash={flash}
              sectionTitle={SECTION_TITLES[section]}
            />
          )}

          {section !== 'dashboard' && (
            <>
              <header className="admin-topbar">
                <div>
                  <p className="admin-eyebrow">{SECTION_TITLES[section]}</p>
                  <h1 className="admin-h1">{SECTION_TITLES[section]}</h1>
                  <p className="admin-subline">{dateLine()}</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  {calStatus?.connected && (
                    <button
                      onClick={disconnectCalendar}
                      className="admin-status-pill"
                      style={{ cursor: 'pointer' }}
                      title={calStatus.email ? `Connected as ${calStatus.email}` : 'Connected'}
                    >
                      <span className="admin-status-dot" />
                      Calendar Connected
                    </button>
                  )}
                  {section !== 'clients' && section !== 'sessions' && (
                    <button onClick={() => setModalOpen(true)} className="admin-btn-primary">
                      + Add Client
                    </button>
                  )}
                </div>
              </header>

              {flash && (
                <div style={{
                  margin: '0 0 18px',
                  padding: '12px 18px',
                  borderRadius: 12,
                  background: flash.kind === 'success' ? 'rgba(79,138,104,0.12)' : 'rgba(200,90,27,0.12)',
                  border: `1px solid ${flash.kind === 'success' ? 'rgba(79,138,104,0.35)' : 'rgba(200,90,27,0.4)'}`,
                  color: flash.kind === 'success' ? '#2D5A42' : '#A04714',
                  fontSize: 13,
                }}>
                  {flash.msg}
                </div>
              )}

              {section === 'clients' && (
                <ClientsList
                  clients={clients}
                  onOpen={setOpenClient}
                  onNewClient={() => setModalOpen(true)}
                  onScheduleSession={() => { setScheduleInitialIso(undefined); setScheduleOpen(true); }}
                />
              )}

              {section === 'sessions' && (
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
                />
              )}

              {section === 'revenue' && (
                <Revenue clients={clients} />
              )}

              {section === 'forms' && (
                <FormsTable submissions={submissions} tokens={tokens} initialTab={formsTab} />
              )}
            </>
          )}

          <div className="admin-foot">Owen Lynch Psychotherapy · Practice Management</div>
        </main>
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

      {scheduleOpen && (
        <ScheduleSessionModal
          clients={clients}
          initialIsoDate={scheduleInitialIso}
          onClose={() => setScheduleOpen(false)}
          onSuccess={() => { reload(); }}
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
    </div>
  );
}
