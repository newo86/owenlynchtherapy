'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { ClientsList } from './ClientsList';
import { ClientDetail } from './ClientDetail';
import { SessionsList } from './SessionsList';
import { FormsTable } from './FormsTable';
import { NewClientModal } from './NewClientModal';
import { adminFetch, clearSecret, todayInDublin } from './api';
import type {
  AdminSection, ClientRow, TokenRow, SubmissionRow, CalendarEvent, CalendarStatus,
} from './types';

const SECTION_TITLES: Record<AdminSection, string> = {
  dashboard: 'Dashboard',
  clients: 'Clients',
  sessions: 'Sessions',
  forms: 'Forms',
  'new-client': 'New Client',
};

export function AdminShell() {
  const [section, setSection] = useState<AdminSection>('dashboard');

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calStatus, setCalStatus] = useState<CalendarStatus | null>(null);

  const [openClient, setOpenClient] = useState<ClientRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);
  // Lifted so the Dashboard and Sessions views share the same week navigation
  // state across section switches.
  const [weekOffset, setWeekOffset] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Surface the result of the Google OAuth round-trip on first mount
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

      if (cRes.status === 401) { dispatchUnauth(); return; }

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

  // When week changes (and Google is connected), refetch events for that range
  // without reloading the rest of the dashboard.
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

  // Keep openClient in sync with reloaded list (notes / sessions updated)
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
      {/* Atmospheric background */}
      <div className="admin-bg">
        <div className="admin-bg-circle admin-bg-circle-1" />
        <div className="admin-bg-circle admin-bg-circle-2" />
        <div className="admin-bg-circle admin-bg-circle-3" />
        <div className="admin-bg-grain" />
      </div>

      <Sidebar
        active={section}
        expanded={sidebarOpen}
        onToggle={() => setSidebarOpen(o => !o)}
        onNavigate={s => {
          if (s === 'new-client') {
            setModalOpen(true);
          } else {
            setSection(s);
          }
          setSidebarOpen(false);
        }}
        onSignOut={() => { clearSecret(); window.location.reload(); }}
      />

      <main className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <div>
            <h1 className="admin-page-title">{SECTION_TITLES[section]}</h1>
            <div className="admin-page-sub">
              {todayInDublin()}
              {loadingAll && <span style={{ marginLeft: 12, opacity: 0.6 }}>· Refreshing…</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {calStatus?.connected && (
              <button
                onClick={disconnectCalendar}
                className="admin-btn-ghost"
                title={calStatus.email ? `Connected as ${calStatus.email}` : 'Connected'}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#7DC49A', boxShadow: '0 0 8px #7DC49A',
                  display: 'inline-block',
                }} />
                Calendar Connected
              </button>
            )}
            <button onClick={() => setModalOpen(true)} className="admin-btn-primary">
              + New Client
            </button>
          </div>
        </header>

        {flash && (
          <div style={{
            margin: '0 32px 8px',
            padding: '12px 18px',
            borderRadius: 10,
            background: flash.kind === 'success' ? 'rgba(79,138,104,0.18)' : 'rgba(200,90,26,0.22)',
            border: `1px solid ${flash.kind === 'success' ? 'rgba(79,138,104,0.5)' : 'rgba(200,90,26,0.5)'}`,
            color: flash.kind === 'success' ? '#A6E3BD' : '#F4956A',
            fontSize: 13,
          }}>
            {flash.msg}
          </div>
        )}

        <div className="admin-content">
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
            />
          )}

          {section === 'clients' && (
            <ClientsList
              clients={clients}
              onOpen={setOpenClient}
              onNewClient={() => setModalOpen(true)}
            />
          )}

          {section === 'sessions' && (
            <SessionsList
              clients={clients}
              events={events}
              weekOffset={weekOffset}
              onWeekOffsetChange={setWeekOffset}
              onReload={reload}
            />
          )}

          {section === 'forms' && (
            <FormsTable submissions={submissions} tokens={tokens} />
          )}
        </div>
      </main>

      {openClient && (
        <ClientDetail
          client={openClient}
          submissions={submissions}
          onClose={() => setOpenClient(null)}
          onReload={reload}
        />
      )}

      {modalOpen && (
        <NewClientModal
          asModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => { reload(); }}
        />
      )}
    </div>
  );
}

function dispatchUnauth() {
  window.dispatchEvent(new Event('admin-unauthorized'));
}
