'use client';

import { LayoutDashboard, UsersRound, CalendarDays, FileText, UserRoundPlus, LogOut } from 'lucide-react';
import type { AdminSection } from './types';

interface Props {
  active: AdminSection;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (s: AdminSection) => void;
  onSignOut: () => void;
}

const NAV: Array<{ id: AdminSection; label: string; Icon: typeof LayoutDashboard }> = [
  { id: 'dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
  { id: 'clients',    label: 'Clients',    Icon: UsersRound },
  { id: 'sessions',   label: 'Sessions',   Icon: CalendarDays },
  { id: 'forms',      label: 'Forms',      Icon: FileText },
  { id: 'new-client', label: 'New Client', Icon: UserRoundPlus },
];

export function Sidebar({ active, expanded, onToggle, onNavigate, onSignOut }: Props) {
  return (
    <aside className={`admin-sidebar${expanded ? ' is-expanded' : ''}`} aria-label="Admin navigation">
      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? 'Close menu' : 'Open menu'}
        aria-expanded={expanded}
        className={`admin-hamburger${expanded ? ' is-open' : ''}`}
      >
        <span className="admin-hamburger-line" />
        <span className="admin-hamburger-line" />
        <span className="admin-hamburger-line" />
      </button>

      <nav className="admin-nav">
        {NAV.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`admin-nav-item${isActive ? ' is-active' : ''}`}
              title={!expanded ? label : undefined}
            >
              <Icon size={18} strokeWidth={1.8} className="admin-nav-icon" aria-hidden />
              <span className="admin-nav-label">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="admin-sidebar-foot">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="admin-brand-mark">OL</div>
          {expanded && (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
                fontWeight: 300,
                fontSize: 14,
                color: 'white',
                letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
              }}>Owen Lynch</div>
              <div style={{
                fontSize: 9,
                color: '#C85A1A',
                letterSpacing: '2.8px',
                textTransform: 'uppercase',
                marginTop: 2,
                whiteSpace: 'nowrap',
              }}>Psychotherapy</div>
            </div>
          )}
        </div>
        {expanded && (
          <button onClick={onSignOut} className="admin-signout-btn">
            <LogOut size={13} strokeWidth={1.8} aria-hidden /> Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
