import type { ReactNode } from 'react';

interface Props {
  title: string;
  hint?: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
  /** Right-hand adornment, e.g. a chevron. */
  trailing?: ReactNode;
}

/** An option tile: icon square, bold title, soft hint. On hover the tile goes
 *  soft yellow and the icon square full yellow; text stays dark. */
export function SageOptionTile({ title, hint, icon, danger, onClick, trailing }: Props) {
  return (
    <button type="button" className={`sd-option${danger ? ' is-danger' : ''}`} onClick={onClick}>
      <span className="sd-option-icon" aria-hidden="true">{icon}</span>
      <span className="sd-option-text">
        <span className="sd-option-title">{title}</span>
        {hint && <span className="sd-option-hint">{hint}</span>}
      </span>
      {trailing}
    </button>
  );
}
