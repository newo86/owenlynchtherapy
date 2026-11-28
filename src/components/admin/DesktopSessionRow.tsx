'use client';

// A session row as in the Sage Diary desktop prototype (`.srow`): time, colour
// dot, name with a quiet line under it, hover quick actions, and a pill
// ("Paid" or the format). The whole row opens the session panel through the
// main button's stretched hit area, so no button sits inside a button.

import type { ReactNode } from 'react';
import { displayFee } from './api';
import { IconChart, IconDone, IconMoney, IconMove } from './sage';
import { cadenceLabel, clockTime, dotColour, firstName, shortDay, dublinYmd } from './desktopToday';
import type { PanelOption } from './SessionPanel';
import type { ClientRow, SessionRow } from './types';

interface Props {
  s: SessionRow;
  c: ClientRow;
  selected: boolean;
  onOpen: (option: PanelOption | null) => void;
  onEdit: () => void;
  onOpenClient: () => void;
  /** What the quiet line shows: "Weekly · €80" (default) or the date. */
  meta?: 'cadence' | 'date';
  /** Hover quick actions (default). Off where the row simply opens the panel. */
  quick?: boolean;
}

export function DesktopSessionRow({ s, c, selected, onOpen, onEdit, onOpenClient, meta = 'cadence', quick: showQuick = true }: Props) {
  const paid = s.payment_status === 'paid';
  const how = s.session_format === 'online' ? 'Online' : 'In person';
  const time = clockTime(s.session_date);
  const quick = (label: string, icon: ReactNode, go: () => void) => (
    <button type="button" className="dt-qbtn" aria-label={`${label}: ${c.full_name}`} title={label} onClick={go}>{icon}</button>
  );
  return (
    <div className={`dt-srow${selected ? ' is-sel' : ''}`} data-session-row={s.id}>
      <button type="button" className="dt-srow-main" aria-haspopup="dialog" onClick={() => onOpen(null)}>
        <span className="dt-t">{time}</span>
        <span className="dt-dot" style={{ background: dotColour(c.id) }} aria-hidden />
        <span className="dt-who">
          <span className="dt-name pii">{c.full_name}</span>
          <span className="dt-meta">
            {meta === 'date' ? shortDay(dublinYmd(s.session_date)) : `${cadenceLabel(c)} · ${displayFee(s.fee)}`}
          </span>
        </span>
      </button>
      {showQuick && <span className="dt-quick"><span className="dt-quick-in">
        {s.status === 'scheduled' && quick('Session done', <IconDone />, () => onOpen('done'))}
        {quick('Move or edit', <IconMove />, onEdit)}
        {!paid && quick('Mark as paid', <IconMoney />, () => onOpen('paid'))}
        {quick(`Open ${firstName(c.full_name)}'s page`, <IconChart />, onOpenClient)}
      </span></span>}
      {paid ? <span className="dt-tag is-paid">Paid</span> : <span className="dt-tag">{how}</span>}
    </div>
  );
}
