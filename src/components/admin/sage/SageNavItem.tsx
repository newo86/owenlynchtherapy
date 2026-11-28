import type { ReactNode } from 'react';

interface Props {
  label: string;
  icon: ReactNode;
  current?: boolean;
  onClick: () => void;
}

/** One entry of the deep-sage rail (desktop) or tab bar (phone). Yellow on
 *  hover and when current; the current one is also bold, so colour is never
 *  the only signal. Put it on a `--sd-rail` background. */
export function SageNavItem({ label, icon, current, onClick }: Props) {
  return (
    <button type="button" className="sd-nav-item" aria-current={current ? 'page' : undefined} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}
