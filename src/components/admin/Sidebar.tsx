'use client';

import { Fragment, useEffect, useState } from 'react';
import { LayoutGrid, UserRound, CalendarDays, FileText, TrendingUp, ShieldCheck, Eye, EyeOff, Hourglass, Settings, MoreHorizontal, LogOut, GraduationCap, ChartColumn } from 'lucide-react';
import type { AdminSection } from './types';
import { SplitCircle, IconToday, IconCalendar, IconPeople, IconMoney, IconForms, IconWait, IconGear } from './sage';

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

// Desktop rail: exactly the prototype (docs/design/prototypes/sage-diary-
// desktop.html): these seven, in this order, Settings at the foot. Hours lives
// inside Settings, so Settings stays lit on that page.
const RAIL: Array<{ id: AdminSection; label: string; Icon: () => React.JSX.Element; also?: AdminSection[] }> = [
  { id: 'dashboard', label: 'Today',    Icon: IconToday },
  { id: 'sessions',  label: 'Calendar', Icon: IconCalendar },
  { id: 'clients',   label: 'Clients',  Icon: IconPeople },
  { id: 'revenue',   label: 'Money',    Icon: IconMoney },
  { id: 'forms',     label: 'Forms',    Icon: IconForms, also: ['analytics'] },
  { id: 'waitlist',  label: 'Waitlist', Icon: IconWait },
  { id: 'settings',  label: 'Settings', Icon: IconGear, also: ['hours'] },
];

function DesktopSidebar({ active, onNavigate, privacy, onTogglePrivacy }: Props) {
  return (
    <nav className="admin-sidebar" aria-label="Main">
      <button
        type="button"
        className="admin-sidebar-logo"
        onClick={() => onNavigate('dashboard')}
        aria-label="Go to Today"
      >
        <SplitCircle className="admin-sidebar-logo-art" />
      </button>
      {RAIL.map(({ id, label, Icon, also }) => {
        const current = active === id || Boolean(also?.includes(active));
        return (
          <Fragment key={id}>
            {id === 'settings' && <div className="admin-sidebar-spacer" />}
            {id === 'settings' && (
              // One-tap privacy mode (blurs client names and emails) with its state always visible.
              <button type="button" className="admin-nav-btn is-privacy" aria-pressed={privacy} onClick={onTogglePrivacy}>
                {privacy ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                Privacy
                {privacy && <span className="admin-privacy-on">On</span>}
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigate(id)}
              className="admin-nav-btn"
              aria-current={current ? 'page' : undefined}
            >
              <Icon />
              {label}
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}
