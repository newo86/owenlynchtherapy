'use client';

import { Fragment } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AdminSection } from './types';
import { SplitCircle, IconToday, IconCalendar, IconPeople, IconMoney, IconForms, IconWait, IconGear } from './sage';

interface Props {
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  privacy: boolean;
  onTogglePrivacy: () => void;
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

// Desktop only: the phone has its own tab bar and screens (phone/PhoneApp.tsx).
export function Sidebar({ active, onNavigate, privacy, onTogglePrivacy }: Props) {
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
