'use client';

import { LayoutGrid, UserRound, CalendarDays, FileText, UserRoundPlus } from 'lucide-react';
import type { AdminSection } from './types';

interface Props {
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  onSignOut: () => void;
}

const NAV: Array<{ id: AdminSection; label: string; Icon: typeof LayoutGrid }> = [
  { id: 'dashboard',  label: 'Dashboard',  Icon: LayoutGrid },
  { id: 'clients',    label: 'Clients',    Icon: UserRound },
  { id: 'sessions',   label: 'Calendar',   Icon: CalendarDays },
  { id: 'forms',      label: 'Forms',      Icon: FileText },
  { id: 'new-client', label: 'Onboarding', Icon: UserRoundPlus },
];

export function Sidebar({ active, onNavigate, onSignOut }: Props) {
  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="admin-sidebar-logo" aria-hidden>
        <svg viewBox="0 0 200 200" width="44" height="44" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="78" fill="none" stroke="#C85A1B" strokeWidth="10"
                  strokeLinecap="round" strokeDasharray="312.8 157.5" transform="rotate(70,100,100)"/>
          <circle cx="100" cy="100" r="46" fill="none" stroke="#ffffff" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray="184.5 92.9" transform="rotate(70,100,100)"/>
          <text x="100" y="106" fontFamily="Avenir,'Avenir Next',Montserrat,sans-serif"
                fontSize="42" fontWeight="300" fill="#ffffff"
                textAnchor="middle" dominantBaseline="middle">OL</text>
        </svg>
      </div>

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
