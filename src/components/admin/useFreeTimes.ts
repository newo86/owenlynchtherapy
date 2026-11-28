'use client';

// Free times and clinic days for the desktop Today page. Same rules as the
// phone's "Free times" (freeSlots.ts): working hours from Settings, minus
// sessions and Google Calendar events. Reads only; nothing is written.

import { useEffect, useMemo, useState } from 'react';
import { PRACTICE } from '@/practice.config';
import { adminFetch, startOfWeek, dedupeSessions } from './api';
import { findFreeSlots, type FreeSlot, type OpeningHours } from './freeSlots';
import type { CalendarEvent, ClientRow } from './types';

const WEEKS_AHEAD = 8;
const DAYS_AHEAD = 28;

interface CalendarLoad { events: CalendarEvent[]; error: boolean; at: number }

async function fetchCalendar(): Promise<CalendarLoad> {
  try {
    const res = await adminFetch(`/api/admin/calendar?weekOffset=0&weeks=${WEEKS_AHEAD}`);
    const json = await res.json();
    const error = !res.ok || json.connected === false;
    return { events: error ? [] : (json.events ?? []), error, at: Date.now() };
  } catch {
    return { events: [], error: true, at: Date.now() };
  }
}

async function fetchHours(): Promise<{ open: OpeningHours[]; minutes: number } | null> {
  try {
    const res = await adminFetch('/api/admin/settings');
    if (!res.ok) return null;
    const { settings } = await res.json();
    return Array.isArray(settings?.openingHours) && Number(settings.sessionMinutes) > 0
      ? { open: settings.openingHours, minutes: Number(settings.sessionMinutes) }
      : null;
  } catch { return null; }
}

export interface FreeTimes {
  /** Working hours from Settings (falls back to the config). */
  hours: OpeningHours[];
  /** Free slots for the next four weeks, soonest first. */
  slots: FreeSlot[];
  /** Still reading the calendar. */
  loading: boolean;
  /** Google Calendar couldn't be read, so free times are unknown. */
  unavailable: boolean;
}

/** `reloadKey` re-reads Google Calendar (bump it after booking something). */
export function useFreeTimes(clients: ClientRow[], reloadKey: number): FreeTimes {
  const [cal, setCal] = useState<CalendarLoad | null>(null);
  const [hours, setHours] = useState<{ open: OpeningHours[]; minutes: number }>({
    open: [...PRACTICE.openingHours], minutes: PRACTICE.sessionMinutes,
  });

  useEffect(() => {
    let alive = true;
    fetchHours().then(h => { if (alive && h) setHours(h); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    let alive = true;
    fetchCalendar().then(r => { if (alive) setCal(r); });
    return () => { alive = false; };
  }, [reloadKey]);

  const slots = useMemo(() => {
    if (!cal || cal.error) return [];
    const now = new Date(cal.at);
    const knownUntil = startOfWeek(now);
    knownUntil.setDate(knownUntil.getDate() + WEEKS_AHEAD * 7);
    return findFreeSlots({
      hours: hours.open, sessionMinutes: hours.minutes,
      sessions: clients.flatMap(c => dedupeSessions(c.sessions)),
      events: cal.events, now, knownUntil, days: DAYS_AHEAD,
    });
  }, [cal, clients, hours]);

  return { hours: hours.open, slots, loading: cal === null, unavailable: cal?.error ?? false };
}
