'use client';

import { useEffect, useState } from 'react';
import { LayoutGrid, UserRound, CalendarDays, FileText, UserRoundPlus, TrendingUp, ShieldCheck, Eye, EyeOff, Hourglass, Settings, MoreHorizontal, LogOut, GraduationCap } from 'lucide-react';
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
  { id: 'waitlist',   label: 'Waitlist',   Icon: Hourglass },
  { id: 'new-client', label: 'Onboarding', Icon: UserRoundPlus },
  { id: 'settings',   label: 'Settings',   Icon: Settings },
];

// Phone tab bar: the four places used between sessions, plus More for the rest.
// Labels matter on a phone (icons alone are guesswork at arm's length).
const TABS: Array<{ id: AdminSection; label: string; Icon: typeof LayoutGrid }> = [
  { id: 'dashboard', label: 'Today',    Icon: LayoutGrid },
  { id: 'sessions',  label: 'Calendar', Icon: CalendarDays },
  { id: 'clients',   label: 'Clients',  Icon: UserRound },
  { id: 'revenue',   label: 'Money',    Icon: TrendingUp },
];
const MORE = NAV.filter(n => !TABS.some(t => t.id === n.id));

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
            <Icon size={22} strokeWidth={1.6} aria-hidden />
          </button>
        ))}
      </nav>

      <button
        type="button"
        onClick={onTogglePrivacy}
        className="admin-nav-btn"
        title={privacy ? 'Privacy mode on — client info hidden (click to show)' : 'Privacy mode — hide client info to show others'}
        aria-label="Toggle privacy mode"
        aria-pressed={privacy}
        style={privacy
          ? { marginBottom: 10, background: 'var(--terracotta)', color: '#fff' }
          : { marginBottom: 10 }}
      >
        {privacy
          ? <EyeOff size={22} strokeWidth={1.6} aria-hidden />
          : <Eye size={22} strokeWidth={1.6} aria-hidden />}
      </button>

      <button
        type="button"
        onClick={onOpenMfa}
        className="admin-nav-btn"
        title="Two-factor authentication"
        aria-label="Two-factor authentication"
        style={{ marginBottom: 10 }}
      >
        <ShieldCheck size={22} strokeWidth={1.6} aria-hidden />
      </button>

      <button
        type="button"
        onClick={onSignOut}
        className="admin-sidebar-avatar"
        title="Sign out"
        aria-label="Sign out"
        style={{ cursor: 'pointer', border: '2px solid var(--terracotta)', background: 'var(--cream)' }}
      >
        OL
      </button>
    </aside>
  );
}
