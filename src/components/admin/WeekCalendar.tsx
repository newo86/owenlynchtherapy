'use client';

import { useMemo } from 'react';
import { colors, fonts } from './theme';
import { displayFee, formatTime, isSameDay, startOfWeek } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, CalendarEvent } from './types';

/** Compact badge styled for the dark forest-green session card. */
function DarkBadge({ tone }: { tone: 'paid' | 'unpaid' | 'refunded' | 'in_person' | 'online' }) {
  const tones: Record<string, { bg: string; fg: string; border: string; label: string }> = {
    paid:      { bg: 'rgba(79,138,104,0.3)',  fg: '#A6E3BD', border: 'rgba(79,138,104,0.45)', label: 'Paid' },
    unpaid:    { bg: 'rgba(200,90,26,0.25)',  fg: '#F4956A', border: 'rgba(200,90,26,0.4)',   label: 'Unpaid' },
    refunded:  { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.15)', label: 'Refunded' },
    in_person: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.7)',  border: 'rgba(255,255,255,0.12)', label: 'In Person' },
    online:    { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.7)',  border: 'rgba(255,255,255,0.12)', label: 'Online' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 6px',
      borderRadius: 4,
      background: t.bg,
      color: t.fg,
      border: `1px solid ${t.border}`,
      fontFamily: fonts.sans,
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '1px',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>{t.label}</span>
  );
}

interface Props {
  clients: ClientRow[];
  events: CalendarEvent[];
  weekOffset?: number;
}

interface DayBlock {
  type: 'session' | 'gcal';
  start: string;
  end?: string;
  title: string;
  subtitle?: string;
  payment?: 'paid' | 'unpaid' | 'refunded';
  format?: 'in_person' | 'online';
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekCalendar({ clients, events, weekOffset = 0 }: Props) {
  const days = useMemo(() => {
    const monday = startOfWeek(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day;
    });
  }, [weekOffset]);

  function blocksForDay(day: Date): DayBlock[] {
    const sessionBlocks: DayBlock[] = [];
    const matchedGcalIds = new Set<string>();

    for (const client of clients) {
      for (const s of client.sessions) {
        const sDate = new Date(s.session_date);
        if (!isSameDay(sDate, day)) continue;
        if (s.status === 'cancelled') continue;

        const matched = events.find(e => {
          const eStart = new Date(e.start);
          if (!isSameDay(eStart, sDate)) return false;
          const sameTitle = e.title?.toLowerCase().includes(client.full_name.toLowerCase().split(' ')[0]);
          const closeInTime = Math.abs(eStart.getTime() - sDate.getTime()) < 30 * 60 * 1000;
          return sameTitle || closeInTime;
        });
        if (matched) matchedGcalIds.add(matched.id);

        sessionBlocks.push({
          type: 'session',
          start: s.session_date,
          title: client.full_name,
          subtitle: `${FORMAT_LABELS[s.session_format] ?? s.session_format} · ${displayFee(s.fee)}`,
          payment: (s.payment_status === 'paid' ? 'paid'
            : s.payment_status === 'refunded' ? 'refunded' : 'unpaid'),
          format: s.session_format === 'in_person' ? 'in_person' : 'online',
        });
      }
    }

    const gcalBlocks: DayBlock[] = events
      .filter(e => isSameDay(new Date(e.start), day) && !matchedGcalIds.has(e.id))
      .map(e => ({
        type: 'gcal',
        start: e.start,
        end: e.end,
        title: e.title || '(no title)',
        subtitle: e.location ?? undefined,
      }));

    return [...sessionBlocks, ...gcalBlocks].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: 10,
      }}
    >
      {days.map((day, i) => {
        const blocks = blocksForDay(day);
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={i}
            className={`admin-day${isToday ? ' is-today' : ''}`}
          >
            <div className="admin-day-header">
              <div className="admin-day-name" style={{
                fontFamily: fonts.sans,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: 'rgba(42,77,60,0.5)',
              }}>
                {DAY_NAMES[i]}
              </div>
              <div className="admin-day-number" style={{
                fontFamily: fonts.display,
                fontWeight: 300,
                fontSize: 20,
                color: colors.forest,
                lineHeight: 1.2,
              }}>
                {day.getDate()}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', padding: '2px 0 6px', flex: 1 }}>
              {blocks.length === 0 && (
                <div style={{
                  padding: '12px',
                  textAlign: 'center',
                  color: 'rgba(42,77,60,0.25)',
                  fontSize: 20,
                  fontFamily: fonts.display,
                  fontWeight: 300,
                }}>—</div>
              )}
              {blocks.map((b, idx) => (
                <div
                  key={idx}
                  className={`admin-session${b.type === 'gcal' ? ' is-gcal' : ''}`}
                >
                  <div style={{
                    fontFamily: fonts.sans,
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '1px',
                    color: b.type === 'gcal' ? colors.sage : colors.gold,
                    marginBottom: 3,
                  }}>
                    {formatTime(b.start)}
                  </div>
                  <div style={{
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    fontWeight: 500,
                    color: b.type === 'gcal' ? colors.forest : colors.white,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {b.title}
                  </div>
                  {b.subtitle && (
                    <div style={{
                      marginTop: 2,
                      fontFamily: fonts.sans,
                      fontSize: 10,
                      color: b.type === 'gcal' ? 'rgba(42,77,60,0.55)' : 'rgba(255,255,255,0.6)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {b.subtitle}
                    </div>
                  )}
                  {b.type === 'session' && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {b.format && <DarkBadge tone={b.format} />}
                      {b.payment && <DarkBadge tone={b.payment} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
