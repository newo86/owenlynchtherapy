'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, UserRound, CalendarDays, FileText, TrendingUp, ShieldCheck, Eye, EyeOff, Hourglass, Settings, MoreHorizontal, LogOut, GraduationCap, ChartColumn } from 'lucide-react';
import type { AdminSection } from './types';

interface Props {
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  onSignOut: () => void;
  onOpenMfa: () => void;
  privacy: boolean;
  onTogglePrivacy: () => void;
}

const NAV: Array<{ id: AdminSection; label: string; Icon: typeof LayoutGrid }> = [
  { id: 'dashboard',  label: 'Dashboard',  Icon: LayoutGrid },
  { id: 'clients',    label: 'Clients',    Icon: UserRound },
  { id: 'sessions',   label: 'Calendar',   Icon: CalendarDays },
  { id: 'revenue',    label: 'Revenue',    Icon: TrendingUp },
  { id: 'hours',      label: 'Hours',      Icon: GraduationCap },
  { id: 'forms',      label: 'Forms',      Icon: FileText },
  { id: 'analytics',  label: 'Analytics',  Icon: ChartColumn },
  { id: 'waitlist',   label: 'Waitlist',   Icon: Hourglass },
];
// Onboarding is no longer a nav item: "+ Add client" on the Dashboard and
// Clients pages opens the same form. Settings, privacy mode, two-factor and
// sign out live in the profile menu (the OL button) instead.
const SETTINGS = { id: 'settings' as AdminSection, label: 'Settings', Icon: Settings };

// Phone tab bar: the four places used between sessions, plus More for the rest.
// Labels matter on a phone (icons alone are guesswork at arm's length).
const TABS: Array<{ id: AdminSection; label: string; Icon: typeof LayoutGrid }> = [
  { id: 'dashboard', label: 'Today',    Icon: LayoutGrid },
  { id: 'sessions',  label: 'Calendar', Icon: CalendarDays },
  { id: 'clients',   label: 'Clients',  Icon: UserRound },
  { id: 'revenue',   label: 'Money',    Icon: TrendingUp },
];
const MORE = [...NAV.filter(n => !TABS.some(t => t.id === n.id)), SETTINGS];

export function Sidebar(props: Props) {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileTabBar {...props} />
    </>
  );
}

function MobileTabBar({ active, onNavigate, onSignOut, onOpenMfa, privacy, onTogglePrivacy }: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some(m => m.id === active);
  const go = (id: AdminSection) => { setMoreOpen(false); onNavigate(id); };

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <>
      {moreOpen && (
        <div className="admin-more-scrim" onClick={() => setMoreOpen(false)}>
          <div className="admin-more-sheet" role="dialog" aria-label="More" onClick={e => e.stopPropagation()}>
            {MORE.map(({ id, label, Icon }) => (
              <button key={id} type="button" className={`admin-more-item${active === id ? ' is-active' : ''}`} onClick={() => go(id)}>
                <Icon size={20} strokeWidth={1.6} aria-hidden />{label}
              </button>
            ))}
            <div className="admin-more-divider" />
            <button type="button" className="admin-more-item" aria-pressed={privacy} onClick={() => { onTogglePrivacy(); setMoreOpen(false); }}>
              {privacy ? <EyeOff size={20} strokeWidth={1.6} aria-hidden /> : <Eye size={20} strokeWidth={1.6} aria-hidden />}
              {privacy ? 'Show client details' : 'Privacy mode'}
            </button>
            <button type="button" className="admin-more-item" onClick={() => { setMoreOpen(false); onOpenMfa(); }}>
              <ShieldCheck size={20} strokeWidth={1.6} aria-hidden />Two-factor sign-in
            </button>
            <button type="button" className="admin-more-item" onClick={() => { setMoreOpen(false); onSignOut(); }}>
              <LogOut size={20} strokeWidth={1.6} aria-hidden />Sign out
            </button>
          </div>
        </div>
      )}
      <nav className="admin-tabbar" aria-label="Admin navigation">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            className={`admin-tab${active === id ? ' is-active' : ''}`}
            aria-current={active === id ? 'page' : undefined}
          >
            <Icon size={21} strokeWidth={1.6} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(o => !o)}
          className={`admin-tab${moreActive || moreOpen ? ' is-active' : ''}`}
          aria-expanded={moreOpen}
        >
          <MoreHorizontal size={21} strokeWidth={1.6} aria-hidden />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}

function DesktopSidebar({ active, onNavigate, onSignOut, onOpenMfa, privacy, onTogglePrivacy }: Props) {
  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <button
        className="admin-sidebar-logo"
        onClick={() => onNavigate('dashboard')}
        title="Dashboard home"
        aria-label="Go to dashboard"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <svg viewBox="0 0 200 200" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="78" fill="none" stroke="#C85A1B" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray="312.8 157.5" transform="rotate(70,100,100)"/>
          <circle cx="100" cy="100" r="46" fill="none" stroke="#ffffff" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray="184.5 92.9" transform="rotate(70,100,100)"/>
          <text x="100" y="106" fontFamily="Avenir,'Avenir Next',Montserrat,sans-serif"
                fontSize="42" fontWeight="300" fill="#ffffff"
                textAnchor="middle" dominantBaseline="middle">OL</text>
        </svg>
      </button>

      <nav className="admin-sidebar-nav">
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`admin-nav-btn${active === id ? ' is-active' : ''}`}
            title={label}
            aria-label={label}
          >
            <Icon size={21} strokeWidth={1.6} aria-hidden />
            <span className="admin-nav-label" aria-hidden>{label}</span>
          </button>
        ))}
      </nav>

      <ProfileMenu
        active={active}
        onNavigate={onNavigate}
        onSignOut={onSignOut}
        onOpenMfa={onOpenMfa}
        privacy={privacy}
        onTogglePrivacy={onTogglePrivacy}
      />
    </aside>
  );
}

/** The OL button at the foot of the desktop sidebar: one place for Settings,
 *  privacy mode, two-factor and sign out. Privacy mode stays visible while on
 *  (an eye-off badge on the button), so it's never on by surprise. */
function ProfileMenu({ active, onNavigate, onSignOut, onOpenMfa, privacy, onTogglePrivacy }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const item = (label: string, Icon: typeof LayoutGrid, onClick: () => void, extra?: { pressed?: boolean; current?: boolean }) => (
    <button
      type="button"
      role={extra?.pressed === undefined ? 'menuitem' : 'menuitemcheckbox'}
      className={`admin-more-item${extra?.current ? ' is-active' : ''}`}
      aria-checked={extra?.pressed}
      onClick={() => { setOpen(false); onClick(); }}
    >
      <Icon size={18} strokeWidth={1.6} aria-hidden />{label}
    </button>
  );

  return (
    <div className="admin-profile">
      {open && <div className="admin-profile-scrim" onClick={() => setOpen(false)} />}
      {open && (
        <div className="admin-profile-menu" role="menu" aria-label="Profile">
          {item('Settings', Settings, () => onNavigate('settings'), { current: active === 'settings' })}
          {item(privacy ? 'Show client details' : 'Privacy mode', privacy ? EyeOff : Eye, onTogglePrivacy, { pressed: privacy })}
          {item('Two-factor sign-in', ShieldCheck, onOpenMfa)}
          <div className="admin-more-divider" />
          {item('Sign out', LogOut, onSignOut)}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`admin-sidebar-avatar${active === 'settings' ? ' is-current' : ''}`}
        title={privacy ? 'Profile and settings (privacy mode is on)' : 'Profile and settings'}
        aria-label="Profile and settings"
        aria-haspopup="menu"
        aria-expanded={open}
        style={{ cursor: 'pointer', position: 'relative' }}
      >
        OL
        {privacy && (
          <span className="admin-profile-badge" aria-hidden>
            <EyeOff size={11} strokeWidth={2} />
          </span>
        )}
      </button>
    </div>
  );
}
