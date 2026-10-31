'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PRACTICE } from '@/practice.config';
import { adminFetch, dedupeSessions } from './api';
import type { ClientRow } from './types';

export type AccreditationSettings = typeof PRACTICE.accreditation;

/**
 * Accreditation client-hours settings: config defaults, overridden by the
 * dashboard Settings page once it loads. Shared by Revenue and Today so both
 * always show the same number.
 */
export function useAccreditationSettings(): AccreditationSettings {
  const [accred, setAccred] = useState<AccreditationSettings>(PRACTICE.accreditation);
  useEffect(() => {
    (async () => {
      try {
        const res = await adminFetch('/api/admin/settings');
        if (!res.ok) return;
        const a = (await res.json())?.settings?.accreditation;
        if (a && typeof a.hoursTarget === 'number') {
          setAccred(prev => ({ ...prev, ...a }));
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

export type LogKind = 'supervision' | 'cpd' | 'own_therapy';
export interface LogEntry { id: string; kind: LogKind; entry_date: string; hours: number; detail: string | null }

/** Supervision / CPD / own-therapy log, with add and delete. */
export function useAccreditationLog() {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchLog = useCallback(async (): Promise<{ entries?: LogEntry[]; error?: string }> => {
    try {
      const res = await adminFetch('/api/admin/accreditation');
      if (!res.ok) return { error: 'Could not load the hours log.' };
      const json = await res.json();
      return { entries: (json.entries ?? []).map((e: LogEntry) => ({ ...e, hours: Number(e.hours) })) };
    } catch { return { error: 'Could not load the hours log.' }; }
  }, []);
  const apply = useCallback((r: { entries?: LogEntry[]; error?: string }) => {
    if (r.entries) { setEntries(r.entries); setError(null); } else setError(r.error ?? null);
  }, []);
  const load = useCallback(async () => apply(await fetchLog()), [apply, fetchLog]);
  useEffect(() => {
    let alive = true;
    fetchLog().then(r => { if (alive) apply(r); });
    return () => { alive = false; };
  }, [fetchLog, apply]);
  async function add(entry: Omit<LogEntry, 'id'>): Promise<string | null> {
    const res = await adminFetch('/api/admin/accreditation', { method: 'POST', body: JSON.stringify(entry) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return json.error ?? 'Could not save. Try again.';
    await load();
    return null;
  }
  async function remove(id: string): Promise<string | null> {
    const res = await adminFetch('/api/admin/accreditation/delete', { method: 'POST', body: JSON.stringify({ id }) });
    if (!res.ok) return 'Delete failed. Try again.';
    await load();
    return null;
  }
  return { entries, error, add, remove };
}
