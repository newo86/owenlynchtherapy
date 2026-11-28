'use client';

// Desktop Today (Sage Diary stage 2), built to docs/design/prototypes/
// sage-diary-desktop.html: two columns. Left: today's clients (hover for quick
// actions, click for the session panel) and the free times this week. Right:
// "Needs a decision" (the pay prompts, the Google differences and the changes
// followed from Google, in one card, each with its own buttons and confirms)
// and the next clinic days. The header band is rendered by Dashboard.

import { useCallback, useMemo, useRef, useState } from 'react';
import { displayFee } from './api';
import { CalendarDriftCard } from './CalendarDriftCard';
import { PaymentPromptsPanel } from './PaymentPromptsPanel';
import { FollowedFromGooglePanel } from './FollowedFromGooglePanel';
import { SessionPanel, type PanelOption } from './SessionPanel';
import { IconChart, IconDone, IconMoney, IconMove } from './sage';
import { useFreeTimes } from './useFreeTimes';
import {
  cadenceLabel, clinicDays, clinicDaysLabel, clockTime, dotColour, dublinYmd, firstName, shortDay, slotsNextWeek,
} from './desktopToday';
import type { DriftItem } from '@/lib/calendarDrift';
import type { ClientRow, SessionRow } from './types';

interface Props {
  clients: ClientRow[];
  /** Every client's sessions (deduplicated), for the clinic days. */
  allSessions: Array<{ s: SessionRow; c: ClientRow }>;
  /** Today's sessions, soonest first (cancelled ones left out). */
  todaySessions: Array<{ s: SessionRow; c: ClientRow }>;
  drift: DriftItem[];
  onReload: () => void;
  /** Open the existing Schedule session flow, optionally on a chosen time ("YYYY-MM-DDTHH:MM"). */
  onSchedule: (isoLocal?: string) => void;
  /** The existing session editor (SessionEditModal). */
  onEditSession: (s: SessionRow, c: ClientRow) => void;
  onOpenClient: (c: ClientRow) => void;
}

export function DesktopToday({
  clients, allSessions, todaySessions, drift, onReload, onSchedule, onEditSession, onOpenClient,
}: Props) {
  const [sel, setSel] = useState<{ id: string; option: PanelOption | null } | null>(null);
  const [payCount, setPayCount] = useState(0);
  const [followCount, setFollowCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [fgOpen, setFgOpen] = useState(false);
  // What had focus when the panel opened, so Escape/close can give it back.
  const opener = useRef<HTMLElement | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const free = useFreeTimes(clients, reloadKey);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const todayYmd = useMemo(() => dublinYmd(new Date().toISOString()), [todaySessions]);
  const weekSlots = useMemo(() => slotsNextWeek(free.slots, todayYmd).slice(0, 6), [free.slots, todayYmd]);
  const days = useMemo(
    () => clinicDays(free.hours, allSessions, free.slots, todayYmd, 5),
    [free.hours, allSessions, free.slots, todayYmd],
  );
  const decisions = payCount + drift.length;
  const NOTICES = 3;

  const refresh = useCallback(() => { onReload(); setReloadKey(k => k + 1); }, [onReload]);

  const open = (id: string, option: PanelOption | null = null) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSel({ id, option });
  };
  const close = () => {
    const id = sel?.id;
    setSel(null);
    // Focus goes back to what opened the panel (the row, or a notice's button).
    window.setTimeout(() => {
      const el = opener.current?.isConnected ? opener.current : document.querySelector<HTMLElement>(`[data-session-row="${id}"] .dt-srow-main`);
      el?.focus();
    }, 0);
  };
  // Look the session up fresh each render so a reload shows its new state.
  const current = sel ? allSessions.find(x => x.s.id === sel.id) ?? todaySessions.find(x => x.s.id === sel.id) : undefined;

  return (
    <div className="dt-wrap">
      <div className="dt-cols">
        <div className="dt-stack">
          <div className="dt-group">
            <h2 className="dt-h">Today&apos;s clients <small>Hover a client for quick actions, or click to open</small></h2>
            <div className="dt-card">
              {todaySessions.length === 0 && <p className="dt-hint dt-empty">No clients today.</p>}
              {todaySessions.map(({ s, c }) => (
                <TodayRow key={s.id} s={s} c={c} selected={sel?.id === s.id}
                  onOpen={option => open(s.id, option)} onEdit={() => onEditSession(s, c)} onOpenClient={() => onOpenClient(c)} />
              ))}
            </div>
          </div>

          <div className="dt-group">
            <h2 className="dt-h">Free this week</h2>
            {free.loading ? (
              <p className="dt-hint">Checking your calendar…</p>
            ) : free.unavailable ? (
              <p className="dt-hint">Couldn&apos;t read Google Calendar, so free times aren&apos;t shown. Check it&apos;s connected.</p>
            ) : weekSlots.length === 0 ? (
              <p className="dt-hint">Nothing free for the rest of this week.</p>
            ) : (
              <div className="dt-chips">
                {weekSlots.map(f => (
                  <button key={f.local} type="button" className="dt-chip"
                    aria-label={`Book ${shortDay(f.local)}, ${f.local.slice(11, 16)}`}
                    onClick={() => onSchedule(f.local)}>
                    {shortDay(f.local)}, {f.local.slice(11, 16)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dt-stack">
          <div className="dt-group">
            <h2 className="dt-h">Needs a decision <small>{decisions}</small></h2>
            <div className="dt-card dt-pad dt-nd">
              <div className="dt-nd-group">
                <PaymentPromptsPanel bare onChanged={refresh} onCount={setPayCount}
                  limit={showAll ? undefined : NOTICES} onOpenSession={id => open(id, 'paid')} />
              </div>
              <div className="dt-nd-group">
                <CalendarDriftCard bare items={drift} onResolved={refresh}
                  limit={showAll ? undefined : Math.max(0, NOTICES - payCount)} />
              </div>
              {decisions > NOTICES && (
                <button type="button" className="dt-link" aria-expanded={showAll} onClick={() => setShowAll(s => !s)}>
                  {showAll ? 'Show fewer' : `Show all (${decisions})`}
                </button>
              )}
              {decisions === 0 && <p className="dt-hint">Nothing needs a decision right now.</p>}
            </div>
          </div>

          <div className="dt-group">
            <h2 className="dt-h">Clinic days <small>{clinicDaysLabel(free.hours)}</small></h2>
            <ul className="dt-week">
              {days.map(d => (
                <li key={d.ymd} className={`dt-wday${d.isToday ? ' is-today' : ''}`} aria-current={d.isToday ? 'date' : undefined}>
                  <b>{shortDay(d.ymd)}</b>
                  {d.items.map((it, i) => it.kind === 'session'
                    ? <span key={i} className="dt-wslot pii">{it.time} {it.name}</span>
                    : <span key={i} className="dt-wslot is-free">{it.time} free</span>)}
                </li>
              ))}
            </ul>
            {free.unavailable && <p className="dt-hint">Free times aren&apos;t shown: Google Calendar couldn&apos;t be read.</p>}
            {/* Changes the app copied from Google: a quiet line, not a decision. Undo is in the expanded list. */}
            {(followCount > 0 || fgOpen) && (
              <p className="dt-fg-line">
                {followCount} {followCount === 1 ? 'change' : 'changes'} followed from Google ·{' '}
                <button type="button" className="dt-link" aria-expanded={fgOpen} onClick={() => setFgOpen(o => !o)}>
                  {fgOpen ? 'Hide' : 'Review'}
                </button>
              </p>
            )}
            <div className="dt-card dt-pad" hidden={!fgOpen}>
              <FollowedFromGooglePanel bare onChanged={refresh} onCount={setFollowCount} />
            </div>
          </div>
        </div>
      </div>

      {sel && current && (
        <SessionPanel
          key={sel.id}
          session={current.s}
          client={current.c}
          initialOption={sel.option}
          onClose={close}
          onChanged={refresh}
          onOpenClient={() => { setSel(null); onOpenClient(current.c); }}
          onEdit={() => { setSel(null); onEditSession(current.s, current.c); }}
        />
      )}
    </div>
  );
}

function TodayRow({ s, c, selected, onOpen, onEdit, onOpenClient }: {
  s: SessionRow; c: ClientRow; selected: boolean;
  onOpen: (option: PanelOption | null) => void; onEdit: () => void; onOpenClient: () => void;
}) {
  const paid = s.payment_status === 'paid';
  const lowCost = Boolean(c.is_low_cost);
  const how = s.session_format === 'online' ? 'Online' : 'In person';
  const time = clockTime(s.session_date);
  const quick = (label: string, icon: React.ReactNode, go: () => void) => (
    <button type="button" className="dt-qbtn" aria-label={`${label}: ${c.full_name}`} title={label} onClick={go}>{icon}</button>
  );
  return (
    <div className={`dt-srow${selected ? ' is-sel' : ''}`} data-session-row={s.id}>
      {/* One button holds the time, dot and name; its stretched hit area (CSS)
          makes the whole row open the panel without nesting buttons. */}
      <button type="button" className="dt-srow-main" aria-haspopup="dialog" onClick={() => onOpen(null)}>
        <span className="dt-t">{time}</span>
        <span className="dt-dot" style={{ background: dotColour(c.id) }} aria-hidden />
        <span className="dt-who">
          <span className="dt-name pii">{c.full_name}</span>
          <span className="dt-meta">{cadenceLabel(c)} · {displayFee(s.fee)}</span>
        </span>
      </button>
      <span className="dt-quick">
        {s.status === 'scheduled' && quick('Session done', <IconDone />, () => onOpen('done'))}
        {quick('Move or edit', <IconMove />, onEdit)}
        {!paid && quick(lowCost ? 'Cash received' : 'Mark as paid', <IconMoney />, () => onOpen('paid'))}
        {quick(`Open ${firstName(c.full_name)}'s page`, <IconChart />, onOpenClient)}
      </span>
      {paid ? <span className="dt-tag is-paid">Paid</span> : <span className="dt-tag">{how}</span>}
    </div>
  );
}
