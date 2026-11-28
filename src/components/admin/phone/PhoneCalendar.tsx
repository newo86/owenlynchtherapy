'use client';

// Phone Calendar, built to the prototype: a month grid with a dot per session
// (up to three), previous/next month, and the chosen day's sessions below as
// swipeable rows. The old calendar (week view, Google events, linking an event
// to a client, unpaid and receipt filters) stays reachable under "Week view,
// Google events and filters".

import { useMemo, useState, type ReactNode } from 'react';
import { dedupeSessions } from '../api';
import { DtDisclosure } from '../DtDisclosure';
import { addDaysYmd, dotColour, dublinYmd, longDay } from '../desktopToday';
import { IconChevronLeft, IconChevronRight } from '../sage';
import type { ClientRow, SessionRow } from '../types';
import { PhoneBand } from './PhoneBand';
import { SwipeRow, type PhoneOption } from './SwipeRow';
import { useOpenRow } from './useOpenRow';

interface Props {
  clients: ClientRow[];
  onOpenSession: (id: string, option?: PhoneOption | null) => void;
  /** The existing calendar (SessionsList), kept under the month. */
  fullCalendar: ReactNode;
  /** Open that section on arrival (a "Needs a decision" notice sent Owen here). */
  openFull?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function PhoneCalendar({ clients, onOpenSession, fullCalendar, openFull }: Props) {
  const rows = useOpenRow();
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

  const list = byDay.get(sel) ?? [];

  return (
    <>
      <PhoneBand title="Calendar" sub={monthLabel} />
      <div className="ph-content">
        <div className="ph-group">
          <div className="ph-monthhead">
            <button type="button" className="ph-iconbtn" aria-label="Previous month" onClick={() => step(-1)}><IconChevronLeft /></button>
            <h2 aria-live="polite">{monthLabel}</h2>
            <button type="button" className="ph-iconbtn" aria-label="Next month" onClick={() => step(1)}><IconChevronRight /></button>
          </div>
          <div className="ph-card">
            <div className="ph-grid">
              {WEEKDAYS.map((w, i) => <div key={i} className="ph-wd" aria-hidden>{w}</div>)}
              {days.map(ymd => {
                const on = byDay.get(ymd) ?? [];
                const inMonth = ymd.startsWith(`${month.y}-${pad(month.m + 1)}`);
                return (
                  <button key={ymd} type="button" className={`ph-day${inMonth ? '' : ' is-out'}${ymd === todayYmd ? ' is-today' : ''}`}
                    aria-pressed={ymd === sel}
                    aria-label={`${longDay(ymd)}${on.length ? `, ${on.length} session${on.length === 1 ? '' : 's'}` : ''}`}
                    onClick={() => setSel(ymd)}>
                    <span className="ph-n">{Number(ymd.slice(8))}</span>
                    <span className="ph-dots" aria-hidden>{on.slice(0, 3).map(({ s, c }) => <i key={s.id} style={{ background: dotColour(c.id) }} />)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ph-group">
          <h2 className="ph-group-title">{longDay(sel)}</h2>
          <div className="ph-card" role="list" aria-label={`Sessions on ${longDay(sel)}`}>
            {list.length === 0 && <p className="ph-empty">Nothing booked this day.</p>}
            {list.map(({ s, c }) => (
              <div key={s.id} role="listitem">
                <SwipeRow s={s} c={c} {...rows.props(s.id)} onOpen={opt => onOpenSession(s.id, opt)} />
              </div>
            ))}
          </div>
        </div>

        <DtDisclosure id="calendar-full" defaultOpen={openFull} title="Week view, Google events and filters"
          sub="The full calendar: week, list, unpaid and receipt filters, and linking Google events to clients">
          {fullCalendar}
        </DtDisclosure>
      </div>
    </>
  );
}
