'use client';

// Desktop Calendar (Sage Diary), built to the prototype's `calendar()` view:
// a month grid on the left (up to three sessions a day, today ringed, the
// chosen day outlined), the chosen day's sessions on the right. The existing
// calendar (week view, list with filters, Google events, linking an event to a
// client) is kept in "Week view, Google events and filters" underneath.

import { useMemo, useState, type ReactNode } from 'react';
import { dedupeSessions } from './api';
import { DesktopPage } from './DesktopPage';
import { DesktopSessionRow } from './DesktopSessionRow';
import { DtDisclosure } from './DtDisclosure';
import { addDaysYmd, clockTime, dotColour, dublinYmd, firstName, longDay } from './desktopToday';
import type { PanelOption } from './SessionPanel';
import type { ClientRow, SessionRow } from './types';

interface Props {
  clients: ClientRow[];
  onSchedule: () => void;
  onOpenPanel: (sessionId: string, option?: PanelOption | null) => void;
  panelSessionId: string | null;
  onEditSession: (s: SessionRow, c: ClientRow) => void;
  onOpenClient: (c: ClientRow) => void;
  /** The existing calendar (SessionsList), kept under the month. */
  fullCalendar: ReactNode;
}

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DesktopCalendar({ clients, onSchedule, onOpenPanel, panelSessionId, onEditSession, onOpenClient, fullCalendar }: Props) {
  const todayYmd = dublinYmd(new Date().toISOString());
  const [ty, tm] = todayYmd.split('-').map(Number);
  const [month, setMonth] = useState({ y: ty, m: tm - 1 });
  const [sel, setSel] = useState(todayYmd);

  const byDay = useMemo(() => {
    const m = new Map<string, Array<{ s: SessionRow; c: ClientRow }>>();
    for (const c of clients) {
      for (const s of dedupeSessions(c.sessions)) {
        if (s.status === 'cancelled') continue;
        const k = dublinYmd(s.session_date);
        m.set(k, [...(m.get(k) ?? []), { s, c }]);
      }
    }
    for (const list of m.values()) list.sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());
    return m;
  }, [clients]);

  const monthLabel = new Date(Date.UTC(month.y, month.m, 1)).toLocaleDateString('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const first = `${month.y}-${pad(month.m + 1)}-01`;
  const lead = (new Date(Date.UTC(month.y, month.m, 1)).getUTCDay() + 6) % 7;
  const daysIn = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells = Math.ceil((lead + daysIn) / 7) * 7;
  const days = Array.from({ length: cells }, (_, i) => addDaysYmd(first, i - lead));

  const step = (by: number) => {
    const d = new Date(Date.UTC(month.y, month.m + by, 1));
    const next = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    setMonth(next);
    const k = `${next.y}-${pad(next.m + 1)}`;
    setSel(todayYmd.startsWith(k) ? todayYmd : `${k}-01`);
  };
  const goToday = () => { setMonth({ y: ty, m: tm - 1 }); setSel(todayYmd); };

  const list = byDay.get(sel) ?? [];

  return (
    <DesktopPage
      title="Calendar"
      subtitle={monthLabel}
      action={<button type="button" className="sd-btn sd-btn-primary dt-cta" onClick={onSchedule}>Book a session</button>}
    >
      <div className="dt-cols">
        <div className="dt-group">
          <div className="dt-monthnav">
            <button type="button" className="dt-link" onClick={() => step(-1)}>&lsaquo; Previous month</button>
            <button type="button" className="dt-link" onClick={goToday} disabled={month.y === ty && month.m === tm - 1 && sel === todayYmd}>Today</button>
            <button type="button" className="dt-link" onClick={() => step(1)}>Next month &rsaquo;</button>
          </div>
          <div className="dt-month">
            {WEEKDAYS.map(w => <span key={w} className="dt-mwd">{w}</span>)}
            {days.map(ymd => {
              const on = byDay.get(ymd) ?? [];
              const inMonth = ymd.startsWith(`${month.y}-${pad(month.m + 1)}`);
              const dayNum = Number(ymd.slice(8));
              return (
                <button
                  key={ymd}
                  type="button"
                  className={`dt-mday${inMonth ? '' : ' is-out'}${ymd === todayYmd ? ' is-today' : ''}`}
                  aria-pressed={ymd === sel}
                  aria-label={`${longDay(ymd)}, ${on.length === 0 ? 'nothing booked' : `${on.length} session${on.length === 1 ? '' : 's'}`}`}
                  onClick={() => setSel(ymd)}
                >
                  <span className="dt-mn">{dayNum}</span>
                  {on.slice(0, 3).map(({ s, c }) => (
                    <span key={s.id} className="dt-mev">
                      <i style={{ background: dotColour(c.id) }} aria-hidden />
                      <span className="pii">{clockTime(s.session_date)} {firstName(c.full_name)}</span>
                    </span>
                  ))}
                  {on.length > 3 && <span className="dt-mev dt-more-count">+{on.length - 3} more</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="dt-group">
          <h2 className="dt-h">{longDay(sel)}</h2>
          <div className="dt-card">
            {list.length === 0 && <p className="dt-hint dt-empty">Nothing booked this day.</p>}
            {list.map(({ s, c }) => (
              <DesktopSessionRow key={s.id} s={s} c={c} selected={panelSessionId === s.id}
                onOpen={option => onOpenPanel(s.id, option)} onEdit={() => onEditSession(s, c)} onOpenClient={() => onOpenClient(c)} />
            ))}
          </div>
        </div>
      </div>

      <DtDisclosure title="Week view, Google events and filters" sub="The full calendar: week, list, unpaid and receipt filters, and linking Google events to clients">
        {fullCalendar}
      </DtDisclosure>
    </DesktopPage>
  );
}
