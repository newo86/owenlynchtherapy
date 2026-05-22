'use client';

import { useCallback, useEffect, useState } from 'react';
import { colors, fonts } from './theme';
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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: colors.linen,
      color: colors.text,
      fontFamily: fonts.sans,
    }}>
      <Sidebar
        active={section}
        onNavigate={s => {
          if (s === 'new-client') setModalOpen(true);
          else setSection(s);
        }}
        onSignOut={() => { clearSecret(); window.location.reload(); }}
      />

      <main style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
        <header style={{
          padding: '24px 32px 18px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          borderBottom: `1px solid ${colors.linenDeep}`,
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontFamily: fonts.display,
              fontWeight: 300,
              fontSize: 28,
              color: colors.forest,
              letterSpacing: '-0.01em',
            }}>
              {SECTION_TITLES[section]}
            </h1>
            <div style={{ marginTop: 4, fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted }}>
              {todayInDublin()}
              {loadingAll && <span style={{ marginLeft: 12, color: colors.textFaint }}>· Refreshing…</span>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {calStatus?.connected && (
              <button
                onClick={disconnectCalendar}
                style={{
                  padding: '8px 14px',
                  background: 'transparent',
                  color: colors.textMuted,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 5,
                  fontFamily: fonts.sans, fontSize: 11, fontWeight: 500,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
                title={calStatus.email ? `Connected as ${calStatus.email}` : 'Connected'}
              >
                Calendar Connected
              </button>
            )}
            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding: '9px 18px',
                background: colors.terracotta,
                color: colors.white,
                border: 'none',
                borderRadius: 6,
                fontFamily: fonts.sans, fontSize: 11, fontWeight: 500,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              + New Client
            </button>
          </div>
        </header>

        {flash && (
          <div style={{
            margin: '0 32px',
            marginTop: 16,
            padding: '12px 18px',
            borderRadius: 6,
            background: flash.kind === 'success' ? `${colors.sage}1A` : `${colors.terracotta}1A`,
            border: `1px solid ${flash.kind === 'success' ? colors.sage : colors.terracotta}`,
            color: flash.kind === 'success' ? colors.sageDark : colors.terracottaDark,
            fontFamily: fonts.sans,
            fontSize: 13,
          }}>
            {flash.msg}
          </div>
        )}

        {/* Section content */}
        <div style={{ padding: 32, flex: 1, overflow: 'auto' }}>
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
