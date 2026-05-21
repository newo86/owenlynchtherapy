'use client';

import { LayoutDashboard, UsersRound, CalendarDays, FileText, UserRoundPlus, LogOut } from 'lucide-react';
import { colors, fonts } from './theme';
import type { AdminSection } from './types';

interface Props {
  active: AdminSection;
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

export function Sidebar({ active, onNavigate, onSignOut }: Props) {
  return (
    <aside
      style={{
        width: 240,
        minWidth: 240,
        background: colors.forest,
        color: colors.white,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ padding: '28px 24px 20px' }}>
        <div
          aria-hidden
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: `1.5px solid ${colors.gold}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: fonts.display,
            fontWeight: 300,
            fontSize: 18,
            color: colors.white,
            letterSpacing: '1px',
            marginBottom: 14,
          }}
        >
          OL
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 300, fontSize: 16, color: colors.white, letterSpacing: '0.5px' }}>
          Owen Lynch
        </div>
        <div style={{
          fontFamily: fonts.sans,
          fontWeight: 400,
          fontSize: 10,
          color: colors.terracotta,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginTop: 4,
        }}>
          Psychotherapy
        </div>
      </div>

      <div style={{ height: 1, background: colors.gold, opacity: 0.55, margin: '0 24px' }} />

      {/* Nav */}
      <nav style={{ flex: 1, marginTop: 16, display: 'flex', flexDirection: 'column' }}>
        {NAV.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                borderLeft: `3px solid ${isActive ? colors.terracotta : 'transparent'}`,
                color: 'rgba(255,255,255,1)',
                opacity: isActive ? 1 : 0.78,
                border: 'none',
                borderRightWidth: 0,
                borderTopWidth: 0,
                borderBottomWidth: 0,
                padding: '12px 24px 12px 21px',
                fontFamily: fonts.sans,
                fontWeight: 500,
                fontSize: 12,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 150ms ease, opacity 150ms ease',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }}
            >
              <Icon size={16} strokeWidth={1.8} aria-hidden />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div style={{ padding: '12px 24px 24px' }}>
        <button
          onClick={onSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'transparent',
            color: 'rgba(255,255,255,0.55)',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontFamily: fonts.sans,
            fontSize: 11,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          <LogOut size={14} strokeWidth={1.8} aria-hidden /> Sign out
        </button>
      </div>
    </aside>
  );
}
