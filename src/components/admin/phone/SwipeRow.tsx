'use client';

// A session row you can swipe left (prototype `.row-wrap`): Move / Forms / Paid /
// Cancel appear behind it. Swiping is an extra: tapping the row (or Enter) opens
// the full-screen session page, and Left/Right arrow keys open and close the
// actions for keyboard users. Only one row is open at a time (the list owns it).

import { useRef, type ReactNode } from 'react';
import { clockTime, cadenceLabel, dotColour, dublinYmd, shortDay } from '../desktopToday';
import { displayFee } from '../api';
import { IconMove, IconForms, IconMoney, IconTrash } from '../sage';
import { clampSwipe, settlesOpen } from './phoneHelpers';
import type { ClientRow, SessionRow } from '../types';

export type PhoneOption = 'reschedule' | 'forms' | 'paid' | 'cancel' | 'done' | 'reminder' | 'receipt';

const ACTIONS: Array<{ opt: PhoneOption; label: string; icon: ReactNode; cls?: string }> = [
  { opt: 'reschedule', label: 'Move', icon: <IconMove /> },
  { opt: 'forms', label: 'Forms', icon: <IconForms /> },
  { opt: 'paid', label: 'Paid', icon: <IconMoney />, cls: 'is-paid' },
  { opt: 'cancel', label: 'Cancel', icon: <IconTrash />, cls: 'is-delete' },
];
const ACT_W = 76 * ACTIONS.length;

interface Props {
  s: SessionRow;
  c: ClientRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Open the session page, optionally on one option. */
  onOpen: (option: PhoneOption | null) => void;
  /** The quiet line: "Weekly · €80" (default) or the date. */
  meta?: 'cadence' | 'date';
}

export function SwipeRow({ s, c, open, onOpenChange, onOpen, meta = 'cadence' }: Props) {
  const rowRef = useRef<HTMLButtonElement>(null);
  const drag = useRef({ startX: 0, startY: 0, dx: 0, base: 0, dragging: false, moved: false });
  const paid = s.payment_status === 'paid';
  const time = clockTime(s.session_date);
  const how = s.session_format === 'online' ? 'Online' : 'In person';
  const first = c.full_name.split(/\s+/)[0];

  // The row's resting position follows `open`; a drag moves it directly.
  const rest = open ? `translateX(-${ACT_W}px)` : '';

  function down(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    d.startX = e.clientX; d.startY = e.clientY; d.dx = 0; d.moved = false; d.dragging = true;
    d.base = open ? -ACT_W : 0;
    rowRef.current?.classList.add('is-dragging');
  }
  function move(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d.dragging || !rowRef.current) return;
    d.dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(d.dx) < 6) return;
    if (!d.moved && Math.abs(dy) > Math.abs(d.dx)) { d.dragging = false; rowRef.current.classList.remove('is-dragging'); return; }
    d.moved = true;
    try { rowRef.current.setPointerCapture(e.pointerId); } catch { /* not capturable: fine */ }
    rowRef.current.style.transform = `translateX(${clampSwipe(d.base + d.dx, ACT_W)}px)`;
  }
  function end() {
    const d = drag.current;
    if (!d.dragging || !rowRef.current) return;
    d.dragging = false;
    rowRef.current.classList.remove('is-dragging');
    if (!d.moved) return;
    const willOpen = settlesOpen(d.base + d.dx, ACT_W);
    // Hand the position back to React (it re-applies `rest`).
    rowRef.current.style.transform = willOpen ? `translateX(-${ACT_W}px)` : '';
    onOpenChange(willOpen);
  }
  function click(e: React.MouseEvent) {
    const d = drag.current;
    if (d.moved) { e.preventDefault(); d.moved = false; return; }
    if (open) { onOpenChange(false); return; }
    onOpen(null);
  }
  function key(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); onOpenChange(true); }
    else if (e.key === 'ArrowRight' || e.key === 'Escape') { if (open) { e.preventDefault(); e.stopPropagation(); onOpenChange(false); } }
  }

  return (
    <div className="ph-rowwrap" data-session-row={s.id}>
      <div className="ph-rowactions" aria-hidden={!open}>
        {ACTIONS.map(a => (
          <button key={a.opt} type="button" tabIndex={open ? 0 : -1} className={a.cls}
            aria-label={`${a.label}: ${first}`}
            onClick={() => { onOpenChange(false); onOpen(a.opt); }}>
            {a.icon}{a.label}
          </button>
        ))}
      </div>
      <button ref={rowRef} type="button" className="ph-row" style={{ transform: rest || undefined }}
        aria-label={`${c.full_name}, ${time}. Open options`}
        onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        onClick={click} onKeyDown={key}>
        <span className="ph-t">{time}</span>
        <span className="ph-dot" style={{ background: dotColour(c.id) }} aria-hidden />
        <span className="ph-who">
          <span className="ph-name pii">{c.full_name}</span>
          <span className="ph-meta">{meta === 'date' ? shortDay(dublinYmd(s.session_date)) : `${cadenceLabel(c)} · ${displayFee(s.fee)}`}</span>
        </span>
        {paid ? <span className="ph-tag is-paid">Paid</span> : <span className="ph-tag">{how}</span>}
      </button>
    </div>
  );
}
