'use client';

// Settings at a glance (Sage Diary desktop, the prototype's `settings()` view):
// grouped rows of label and current value on the left, accreditation hours as
// bars on the right. Every row opens the page where it is edited (Practice,
// Hours or Account), so nothing here is read-only in practice.

import { useEffect, useMemo, useState } from 'react';
import { PRACTICE } from '@/practice.config';
import type { PracticeSettings } from '@/lib/practiceSettings';
import { adminFetch } from './api';
import { useAccreditationHours, useAccreditationLog, useAccreditationSettings } from './accreditation';
import type { CalendarStatus, ClientRow } from './types';

type Tab = 'practice' | 'hours' | 'account';

interface Props {
  clients: ClientRow[];
  calendar: CalendarStatus | null;
  onGo: (tab: Tab) => void;
}

const DAY3: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
const ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** "16:00","20:00" -> "16:00–20:00" (24-hour clock, like the rest of the dashboard). */
function range(a: string, b: string): string {
  return `${a.slice(0, 5)}–${b.slice(0, 5)}`;
}
const euro = (cents: number) => `€${Math.round(cents / 100)}`;
const round1 = (n: number) => Math.round(n * 10) / 10;

function addMonths(d: Date, n: number): Date { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

export function SettingsOverview({ clients, calendar, onGo }: Props) {
  const [s, setS] = useState<PracticeSettings | null>(null);
  const [mfa, setMfa] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await adminFetch('/api/admin/settings');
        if (res.ok && alive) setS((await res.json()).settings ?? null);
      } catch { /* the config values below stand in */ }
      try {
        const res = await adminFetch('/api/admin/mfa');
        const json = await res.json().catch(() => ({}));
        if (alive && res.ok) setMfa(Boolean(json.enabled));
      } catch { /* shown as unknown */ }
    })();
    return () => { alive = false; };
  }, []);

  const p = s ?? PRACTICE;
  const hours = useMemo(() => {
    const byDay = ORDER.map(d => ({ d, h: p.openingHours.filter(x => x.dayOfWeek === d) })).filter(x => x.h.length > 0);
    return byDay.map(x => `${DAY3[x.d]} ${x.h.map(h => range(h.opens, h.closes)).join(', ')}`).join(', ') || 'Not set';
  }, [p.openingHours]);
  const host = (() => { try { return p.telehealthUrl ? new URL(p.telehealthUrl).hostname.replace(/^www\./, '') : 'Not set'; } catch { return p.telehealthUrl || 'Not set'; } })();

  const now = useMemo(() => new Date(), []);
  const accred = useAccreditationSettings();
  const clientHours = useAccreditationHours(clients, accred, now);
  const log = useAccreditationLog();
  const sum = (k: 'supervision' | 'cpd' | 'own_therapy') => (log.entries ?? []).filter(e => e.kind === k).reduce((n, e) => n + e.hours, 0);
  const accreditedOn = new Date(accred.accreditedOn + 'T00:00:00');
  const bars = [
    { name: 'Client hours', v: clientHours.total, t: accred.hoursTarget },
    { name: 'Supervision', v: round1(accred.supervisionVerifiedHours + sum('supervision')), t: accred.supervisionTarget },
    { name: 'Own therapy', v: round1(accred.ownTherapyHours + sum('own_therapy')), t: accred.ownTherapyTarget },
    { name: 'CPD', v: round1(sum('cpd')), t: now < addMonths(accreditedOn, 18) ? accred.cpdTargetEarly : accred.cpdTargetLate },
  ];

  const groups: Array<Array<[string, string, Tab]>> = [
    [
      ['Working hours', hours, 'practice'],
      ['Fees', `Online ${euro(p.fees.onlineCents)}, in person ${euro(p.fees.inPersonCents)}, low cost ${euro(p.fees.lowCostCents)}`, 'practice'],
      ['In-person address', p.hasInPerson ? `${p.address.venue}, ${p.address.streetAddress}` : 'Online only', 'practice'],
      ['Payment link', PRACTICE.revolutLink ? 'Revolut' : p.stripeLinks.online || p.stripeLinks.inPerson ? 'Stripe' : 'Not set', 'practice'],
      ['Video link', host, 'practice'],
    ],
    [
      ['Google Calendar', calendar === null ? 'Checking…' : calendar.connected ? (calendar.email ? `Connected as ${calendar.email}` : 'Connected') : 'Not connected', 'account'],
      ['Reminders', 'Emailed the morning of the session', 'account'],
      ['Two-factor sign-in', mfa === null ? 'Checking…' : mfa ? 'On' : 'Off', 'account'],
    ],
  ];

  return (
    <div className="dt-cols">
      <div className="dt-stack">
        {groups.map((g, i) => (
          <div key={i} className="dt-card">
            {g.map(([label, value, tab]) => (
              <button key={label} type="button" className="dt-lrow dt-setrow" aria-label={`${label}: ${value}. Edit`} onClick={() => onGo(tab)}>
                <span className="dt-grow">{label}</span>
                <span className="dt-soft">{value}</span>
                <span className="dt-chev" aria-hidden>›</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="dt-group">
        <h2 className="dt-h">Accreditation hours</h2>
        <button type="button" className="dt-card dt-pad dt-bars" aria-label="Accreditation hours. Open the tracker" onClick={() => onGo('hours')}>
          {bars.map(b => (
            <span key={b.name} className="dt-bar-block">
              <span className="dt-bar-row"><span>{b.name}</span><b className="dt-amt">{b.v} / {b.t}</b></span>
              <span className="dt-bar"><i style={{ width: `${Math.min(100, Math.round((b.v / Math.max(b.t, 1)) * 100))}%` }} /></span>
            </span>
          ))}
        </button>
      </div>
    </div>
  );
}
