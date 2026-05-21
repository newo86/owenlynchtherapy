'use client';

import { useMemo } from 'react';
import { colors, fonts, shadows } from './theme';
import { Badge } from './Badge';
import { displayFee, formatTime, isSameDay, startOfWeek } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SessionRow, CalendarEvent } from './types';

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
        background: colors.white,
        borderRadius: 8,
        borderTop: `3px solid ${colors.gold}`,
        boxShadow: shadows.card,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
      }}
    >
      {days.map((day, i) => {
        const blocks = blocksForDay(day);
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={i}
            style={{
              borderLeft: i === 0 ? 'none' : `1px solid ${colors.border}`,
              padding: '14px 12px',
              minHeight: 240,
              background: isToday ? `${colors.gold}10` : 'transparent',
            }}
          >
            <div style={{
              fontFamily: fonts.sans,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: isToday ? colors.terracotta : colors.textMuted,
              marginBottom: 4,
            }}>
              {DAY_NAMES[i]}
            </div>
            <div style={{
              fontFamily: fonts.display,
              fontWeight: 300,
              fontSize: 22,
              color: isToday ? colors.terracotta : colors.forest,
              marginBottom: 14,
              lineHeight: 1,
            }}>
              {day.getDate()}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blocks.length === 0 && (
                <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textFaint, fontStyle: 'italic' }}>
                  —
                </div>
              )}
              {blocks.map((b, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 5,
                    background: b.type === 'session' ? `${colors.forest}10` : `${colors.sage}15`,
                    border: b.type === 'gcal' ? `1px dashed ${colors.sage}` : 'none',
                    fontFamily: fonts.sans,
                    fontSize: 12,
                    color: colors.text,
                  }}
                >
                  <div style={{ fontWeight: 600, color: b.type === 'session' ? colors.forest : colors.sageDark, fontSize: 11 }}>
                    {formatTime(b.start)}
                  </div>
                  <div style={{ marginTop: 2, fontWeight: 500, color: colors.forest }}>
                    {b.title}
                  </div>
                  {b.subtitle && (
                    <div style={{ marginTop: 1, fontSize: 11, color: colors.textMuted }}>
                      {b.subtitle}
                    </div>
                  )}
                  {b.type === 'session' && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                      {b.format && <Badge kind={b.format} />}
                      {b.payment && <Badge kind={b.payment} />}
                    </div>
                  )}
                  {b.type === 'gcal' && (
                    <div style={{ marginTop: 4 }}>
                      <Badge kind="calendar" />
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
