'use client';

// Desktop Today (Sage Diary stage 2), built to docs/design/prototypes/
// sage-diary-desktop.html: two columns. Left: today's clients (hover for quick
// actions, click for the session panel) and the free times this week. Right:
// "Needs a decision" (the pay prompts, the Google differences and the changes
// followed from Google, in one card, each with its own buttons and confirms)
// and the next clinic days. The header band is rendered by Dashboard.

import { useCallback, useMemo, useState } from 'react';
import { CalendarDriftCard } from './CalendarDriftCard';
import { PaymentPromptsPanel } from './PaymentPromptsPanel';
import { FollowedFromGooglePanel } from './FollowedFromGooglePanel';
import type { PanelOption } from './SessionPanel';
import { DesktopSessionRow } from './DesktopSessionRow';
import { useFreeTimes } from './useFreeTimes';
import {
  clinicDays, clinicDaysLabel, dublinYmd, shortDay, slotsNextWeek,
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
  /** Open the session panel (hosted by AdminShell). */
  onOpenPanel: (sessionId: string, option?: PanelOption | null) => void;
  /** The session whose panel is open, to mark its row. */
  panelSessionId: string | null;
}

export function DesktopToday({
  clients, allSessions, todaySessions, drift, onReload, onSchedule, onEditSession, onOpenClient, onOpenPanel, panelSessionId,
}: Props) {
  const [payCount, setPayCount] = useState(0);
  const [followCount, setFollowCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [fgOpen, setFgOpen] = useState(false);
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

  const open = onOpenPanel;

  return (
    <div className="dt-wrap">
      <div className="dt-cols">
        <div className="dt-stack">
          <div className="dt-group">
            <h2 className="dt-h">Today&apos;s clients <small>Hover a client for quick actions, or click to open</small></h2>
            <div className="dt-card">
              {todaySessions.length === 0 && <p className="dt-hint dt-empty">No clients today.</p>}
              {todaySessions.map(({ s, c }) => (
                <DesktopSessionRow key={s.id} s={s} c={c} selected={panelSessionId === s.id}
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

    </div>
  );
}
