'use client';

// One expandable option in the session page (prototype `.opt`): an icon tile, a
// title and a quiet line, a chevron; opening it shows its panel.

import { useId, type ReactNode } from 'react';
import { IconChevronRight } from '../sage';

interface Props {
  icon: ReactNode;
  title: string;
  sub: string;
  open: boolean;
  onToggle: () => void;
  danger?: boolean;
  children: ReactNode;
  headRef?: (el: HTMLButtonElement | null) => void;
}

export function PhoneOpt({ icon, title, sub, open, onToggle, danger, children, headRef }: Props) {
  const panelId = useId();
  return (
    <div className={`ph-opt${open ? ' is-open' : ''}${danger ? ' is-danger' : ''}`}>
      <button type="button" className="ph-opt-head" aria-expanded={open} aria-controls={panelId} onClick={onToggle} ref={headRef}>
        <span className="ph-ic" aria-hidden>{icon}</span>
        <span className="ph-txt"><b>{title}</b><span>{sub}</span></span>
        <span className="ph-chev" aria-hidden><IconChevronRight /></span>
      </button>
      <div className="ph-opt-panel" id={panelId} hidden={!open}>{children}</div>
    </div>
  );
}
