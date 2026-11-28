'use client';

// Phone Today, built to the prototype's Today screen: today's clients as a card
// of swipeable rows with the hint under it, then "Free this week" chips that
// open the Book sheet on that time. Below, what the old phone home also kept
// reachable, in the prototype's card style: "Needs a decision" (pay prompts,
// Google differences and the old needs-attention notices) and a quiet line for
// changes followed from Google. A warning row shows when Google Calendar is not
// connected, and the morning reminder run shouts only when it went wrong.

import { useMemo } from 'react';
import { dedupeSessions } from '../api';
import { dublinYmd, longDay, shortDay, slotsNextWeek } from '../desktopToday';
import { reminderStripState } from '../Dashboard';
import { NeedsDecision, type Navigate } from '../NeedsDecision';
import { FollowedQuiet } from '../FollowedQuiet';
import type { FreeTimes } from '../useFreeTimes';
import type { DriftItem } from '@/lib/calendarDrift';
import type { CalendarEvent, CalendarStatus, ClientRow, ReminderHealth, SessionRow, TokenRow } from '../types';
import { PhoneBand } from './PhoneBand';
import { SwipeRow, type PhoneOption } from './SwipeRow';
import { useOpenRow } from './useOpenRow';

interface Props {
  clients: ClientRow[];
  tokens: TokenRow[];
  events: CalendarEvent[];
  drift: DriftItem[];
  calendar: CalendarStatus | null;
  reminderHealth: ReminderHealth | null;
  flash: { kind: 'success' | 'error'; msg: string } | null;
  loadError: boolean;
  onRetry: () => void;
  free: FreeTimes;
  onOpenSession: (id: string, option?: PhoneOption | null) => void;
  /** Open the Book sheet, optionally on a free time ("YYYY-MM-DDTHH:MM"). */
  onBook: (slot?: string) => void;
  onReload: () => void;
  onConnectCalendar: () => void;
  onNavigate: Navigate;
}

export function PhoneToday({
  clients, tokens, events, drift, calendar, reminderHealth, flash, loadError, onRetry, free,
  onOpenSession, onBook, onReload, onConnectCalendar, onNavigate,
}: Props) {
  const rows = useOpenRow();
  const todayYmd = dublinYmd(new Date().toISOString());
  const today = useMemo(() => {
    const out: Array<{ s: SessionRow; c: ClientRow }> = [];
    for (const c of clients) for (const s of dedupeSessions(c.sessions)) {
      if (s.status !== 'cancelled' && dublinYmd(s.session_date) === todayYmd) out.push({ s, c });
    }
    return out.sort((a, b) => new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime());
  }, [clients, todayYmd]);
  const weekSlots = useMemo(() => slotsNextWeek(free.slots, todayYmd).slice(0, 6), [free.slots, todayYmd]);
  const strip = reminderStripState(reminderHealth);

  return (
    <>
      <PhoneBand title="Today" sub={longDay(todayYmd)} />
      <div className="ph-content">
        {loadError && (
          <div className="admin-banner ph-banner is-alert" role="alert">
            Couldn&apos;t refresh the dashboard: the numbers below are from the last successful load.{' '}
            <button type="button" className="admin-link" onClick={onRetry}>Retry</button>
          </div>
        )}
        {flash && <div className={`admin-banner ph-banner is-${flash.kind === 'success' ? 'ok' : 'alert'}`} role="status">{flash.msg}</div>}
        {/* "Not connected" is a warning Owen must see. */}
        {calendar && !calendar.connected && (
          <button type="button" className="sd-notice" style={{ margin: 0 }} onClick={onConnectCalendar}>
            Google Calendar isn&apos;t connected. Tap to reconnect.
          </button>
        )}
        {strip && strip.tone !== 'ok' && (
          <div className={`admin-banner ph-banner is-${strip.tone}`} role="alert">
            <span className="admin-banner-dot" aria-hidden />{strip.msg}
          </div>
        )}

        <div className="ph-group">
          <div className="ph-card" role="list" aria-label="Today's clients">
            {today.length === 0 && <p className="ph-empty">No clients today.</p>}
            {today.map(({ s, c }) => (
              <div key={s.id} role="listitem">
                <SwipeRow s={s} c={c} {...rows.props(s.id)} onOpen={opt => onOpenSession(s.id, opt)} />
              </div>
            ))}
          </div>
          <p className="ph-hint">Swipe a client left for options, or tap them.</p>
        </div>

        <div className="ph-group">
          <h2 className="ph-group-title">Free this week</h2>
          {free.loading ? (
            <p className="ph-hint">Checking your calendar…</p>
          ) : free.unavailable ? (
            <p className="ph-hint">Couldn&apos;t read Google Calendar, so free times aren&apos;t shown. Check it&apos;s connected.</p>
          ) : weekSlots.length === 0 ? (
            <p className="ph-hint">Nothing free for the rest of this week.</p>
          ) : (
            <div className="ph-chips">
              {weekSlots.map(f => (
                <button key={f.local} type="button" className="ph-chip"
                  aria-label={`Book ${shortDay(f.local)}, ${f.local.slice(11, 16)}`}
                  onClick={() => onBook(f.local)}>
                  {shortDay(f.local)}, {f.local.slice(11, 16)}
                </button>
              ))}
            </div>
          )}
        </div>

        <NeedsDecision phone clients={clients} tokens={tokens} events={events} drift={drift}
          onChanged={onReload} onOpenSession={id => onOpenSession(id, 'paid')} onNavigate={onNavigate} />
        <FollowedQuiet onChanged={onReload} />
      </div>
    </>
  );
}
