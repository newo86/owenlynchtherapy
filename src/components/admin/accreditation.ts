'use client';

import { useEffect, useMemo, useState } from 'react';
import { PRACTICE } from '@/practice.config';
import { adminFetch, dedupeSessions } from './api';
import type { ClientRow } from './types';

export interface AccreditationSettings {
  hoursTarget: number;
  hoursBaseline: number;
  hoursCountFrom: string;
}

/**
 * Accreditation client-hours settings: config defaults, overridden by the
 * dashboard Settings page once it loads. Shared by Revenue and Today so both
 * always show the same number.
 */
export function useAccreditationSettings(): AccreditationSettings {
  const [accred, setAccred] = useState<AccreditationSettings>({
    hoursTarget: PRACTICE.accreditation.hoursTarget,
    hoursBaseline: PRACTICE.accreditation.hoursBaseline,
    hoursCountFrom: PRACTICE.accreditation.hoursCountFrom as string,
  });
  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/settings');
        if (!res.ok) return;
        const a = (await res.json())?.settings?.accreditation;
        if (a && typeof a.hoursTarget === 'number') {
          setAccred(prev => ({
            hoursTarget: a.hoursTarget,
            hoursBaseline: typeof a.hoursBaseline === 'number' ? a.hoursBaseline : 0,
            hoursCountFrom: typeof a.hoursCountFrom === 'string' ? a.hoursCountFrom : prev.hoursCountFrom,
          }));
        }
      } catch { /* keep config defaults */ }
    })();
  }, []);
  return accred;
}

/**
 * Baseline + one hour for every non-cancelled, non-no-show session from the
 * count-from date up to `now`.
 */
export function useAccreditationHours(clients: ClientRow[], accred: AccreditationSettings, now: Date) {
  return useMemo(() => {
    const from = new Date(accred.hoursCountFrom + 'T00:00:00');
    let count = 0;
    for (const c of clients) {
      for (const s of dedupeSessions(c.sessions)) {
        if (s.status === 'cancelled' || s.status === 'no_show') continue;
        const d = new Date(s.session_date);
        if (d >= from && d <= now) count++;
      }
    }
    return { sessionsSince: count, total: accred.hoursBaseline + count };
  }, [clients, accred, now]);
}
