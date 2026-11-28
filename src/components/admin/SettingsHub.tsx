'use client';

// Settings (desktop): the practice settings, Hours (the accreditation tracker,
// moved here from its own rail item) and Account (Google Calendar connection,
// privacy mode, two-factor, sign out: these used to sit in the rail's profile
// menu). Each tab is the existing page, unchanged. The sections `settings` and
// `hours` stay separate in AdminShell (the phone's More menu opens them
// directly), so the tab strip is hidden on a phone.

import { useState } from 'react';
import { SettingsPanel } from './SettingsPanel';
import { HoursPage } from './HoursPage';
import { SettingsOverview } from './SettingsOverview';
import { useIsPhone } from './useIsPhone';
import type { AdminSection, CalendarStatus, ClientRow } from './types';

export interface AccountProps {
  calendar: CalendarStatus | null;
  onConnectCalendar: () => void;
  onDisconnectCalendar: () => void;
  privacy: boolean;
  onTogglePrivacy: () => void;
  onOpenMfa: () => void;
  onSignOut: () => void;
}

interface Props extends AccountProps {
  section: AdminSection;
  onSection: (s: AdminSection) => void;
  clients: ClientRow[];
}

type Tab = 'overview' | 'practice' | 'hours' | 'account';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'practice', label: 'Practice' },
  { id: 'hours', label: 'Hours' },
  { id: 'account', label: 'Account and privacy' },
];

export function SettingsHub({ section, onSection, clients, ...account }: Props) {
  const isPhone = useIsPhone();
  // Desktop opens on the overview (the prototype's Settings); the phone's More
  // menu opens `settings` and `hours` directly, so it has no overview.
  const [local, setLocal] = useState<Tab>(isPhone ? 'practice' : 'overview');
  const tab: Tab = section === 'hours' ? 'hours' : local;
  const go = (t: Tab) => {
    setLocal(t);
    onSection(t === 'hours' ? 'hours' : 'settings');
    // Keyboard focus follows the move: onto the tab that is now selected.
    window.setTimeout(() => document.querySelector<HTMLElement>('.sd-settings-tabs [aria-pressed="true"]')?.focus(), 0);
  };

  return (
    <div className="sd-settings">
      {!isPhone && (
        <div className="sd-settings-tabs" role="group" aria-label="Settings sections">
          {TABS.map(t => (
            <button key={t.id} type="button" aria-pressed={tab === t.id} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </div>
      )}
      {tab === 'overview' && !isPhone && <SettingsOverview clients={clients} calendar={account.calendar} onGo={go} />}
      {tab === 'hours' && <HoursPage clients={clients} />}
      {(tab === 'practice' || (tab === 'overview' && isPhone)) && <SettingsPanel />}
      {tab === 'account' && <AccountTab {...account} />}
    </div>
  );
}

function AccountTab({ calendar, onConnectCalendar, onDisconnectCalendar, privacy, onTogglePrivacy, onOpenMfa, onSignOut }: AccountProps) {
  const row = (title: string, sub: string, button: React.ReactNode) => (
    <div className="sd-account-row">
      <div><b>{title}</b><span>{sub}</span></div>
      {button}
    </div>
  );
  return (
    <section className="admin-card sd-account" aria-label="Account and privacy">
      <h2 className="admin-h2">Account and privacy</h2>
      {row(
        'Google Calendar',
        calendar?.connected ? (calendar.email ? `Connected as ${calendar.email}` : 'Connected') : 'Not connected',
        calendar?.connected
          ? <button type="button" className="admin-btn-secondary" onClick={onDisconnectCalendar}>Disconnect</button>
          : <button type="button" className="admin-btn-secondary" onClick={onConnectCalendar}>Connect</button>,
      )}
      {row(
        'Privacy mode',
        privacy ? 'On: client names and emails are blurred.' : 'Blurs client names and emails, for sharing your screen.',
        <button type="button" className="admin-btn-secondary" onClick={onTogglePrivacy}>
          {privacy ? 'Show client details' : 'Turn on'}
        </button>,
      )}
      {row('Two-factor sign-in', 'A code from your authenticator app when you sign in.',
        <button type="button" className="admin-btn-secondary" onClick={onOpenMfa}>Manage</button>)}
      {row('Sign out', 'Signs you out on this device.',
        <button type="button" className="admin-btn-secondary" onClick={onSignOut}>Sign out</button>)}
    </section>
  );
}
