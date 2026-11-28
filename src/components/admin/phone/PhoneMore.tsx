'use client';

// Phone More (prototype): Money, Forms, Waitlist and Settings, each a sub-page
// with a back button; Hours live inside Settings. There is no Analytics item
// (the questionnaires live in Forms and on each client's page). A privacy
// toggle sits below, so client names and emails can be blurred in one tap.

import { useMemo, useState, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { clockTime, dublinYmd, shortDay } from '../desktopToday';
import { DtDisclosure } from '../DtDisclosure';
import { moneySummary } from '../moneySummary';
import { howPaid } from '../paymentMethods';
import { IconChevronRight, IconCog, IconForms, IconMoney, IconWait } from '../sage';
import type { ClientRow } from '../types';
import { PhoneBand } from './PhoneBand';

export type MorePage = 'money' | 'forms' | 'waitlist' | 'settings';

const eur = (cents: number) => `€${Math.round(cents / 100).toLocaleString('en-IE')}`;
const FORM_COUNT = 5;

interface Props {
  clients: ClientRow[];
  waiting: number;
  privacy: boolean;
  onTogglePrivacy: () => void;
  onOpenPage: (p: MorePage) => void;
}

export function PhoneMore({ clients, waiting, privacy, onTogglePrivacy, onOpenPage }: Props) {
  const m = useMemo(() => moneySummary(clients, new Date()), [clients]);
  const row = (page: MorePage, icon: ReactNode, title: string, sub: string) => (
    <button type="button" className="ph-navrow" onClick={() => onOpenPage(page)}>
      <span className="ph-ic" aria-hidden>{icon}</span>
      <span className="ph-txt"><b>{title}</b><span>{sub}</span></span>
      <span className="ph-chev" aria-hidden><IconChevronRight /></span>
    </button>
  );
  return (
    <>
      <PhoneBand title="More" sub="Settings and help" />
      <div className="ph-content">
        <div className="ph-card">
          {row('money', <IconMoney />, 'Money', `${eur(m.paidCents)} paid this month · ${m.unpaid.length} unpaid`)}
          {row('forms', <IconForms />, 'Forms', `${FORM_COUNT} forms to send or download`)}
          {row('waitlist', <IconWait />, 'Waitlist', waiting === 0 ? 'Nobody waiting' : `${waiting} ${waiting === 1 ? 'person' : 'people'} waiting`)}
          {row('settings', <IconCog />, 'Settings', 'Hours, fees, links, calendar')}
        </div>
        <div className="ph-card">
          <div className="ph-privacy">
            <span className="ph-ic" aria-hidden>{privacy ? <EyeOff /> : <Eye />}</span>
            <span className="ph-txt" id="ph-privacy-l"><b>Privacy mode</b><span>{privacy ? 'On: client names and emails are blurred' : 'Blurs client names and emails'}</span></span>
            <button type="button" role="switch" className="ph-switch" aria-checked={privacy} aria-labelledby="ph-privacy-l" onClick={onTogglePrivacy}>{privacy ? 'On' : 'Off'}</button>
          </div>
        </div>
      </div>
    </>
  );
}

interface MoneyProps {
  clients: ClientRow[];
  onOpenSession: (id: string, option: 'paid') => void;
  /** The existing Revenue page and statement import, kept under the summary. */
  fullMoney: ReactNode;
}

/** Money sub-page: three numbers, what isn't paid, how people paid, paid recently. */
export function PhoneMoney({ clients, onOpenSession, fullMoney }: MoneyProps) {
  const [showAll, setShowAll] = useState(false);
  const m = useMemo(() => moneySummary(clients, new Date()), [clients]);
  const total = m.methods.reduce((n, x) => n + x.cents, 0) || 1;
  const rows = showAll ? m.unpaid : m.unpaid.slice(0, 6);
  const recent = m.paidNow.slice().sort((a, b) => new Date(b.s.session_date).getTime() - new Date(a.s.session_date).getTime()).slice(0, 6);

  return (
    <>
      <div className="ph-stats">
        <div className="ph-stat"><b>{eur(m.paidCents)}</b><span>Paid</span></div>
        <div className="ph-stat"><b>{eur(m.unpaidCents)}</b><span>Not paid yet</span></div>
        <div className="ph-stat"><b>{m.paidNow.length}</b><span>Sessions paid</span></div>
      </div>

      <h3 className="ph-section-title">Not paid yet</h3>
      <div className="ph-card">
        {m.unpaid.length === 0 && <p className="ph-empty">Everyone has paid.</p>}
        {rows.map(({ s, c }) => (
          <div key={s.id} className="ph-moneyrow">
            <div className="ph-grow"><b className="pii">{c.full_name}</b><div className="ph-soft">{shortDay(dublinYmd(s.session_date))}, {clockTime(s.session_date)}</div></div>
            <span className="ph-amt">{eur(s.fee)}</span>
            <button type="button" className="ph-smallbtn" aria-label={`Mark paid: ${c.full_name}, ${shortDay(dublinYmd(s.session_date))}`} onClick={() => onOpenSession(s.id, 'paid')}>Mark paid</button>
          </div>
        ))}
      </div>
      {m.unpaid.length > 6 && (
        <button type="button" className="ph-linkbtn" aria-expanded={showAll} onClick={() => setShowAll(a => !a)}>{showAll ? 'Show fewer' : `Show all (${m.unpaid.length})`}</button>
      )}

      <h3 className="ph-section-title">How people paid</h3>
      <div className="ph-card ph-pad">
        {m.methods.length === 0 && <p className="ph-note">Nothing paid yet this month.</p>}
        {m.methods.map(x => (
          <div key={x.label}>
            <div className="dt-bar-row"><span>{x.label}</span><b className="dt-amt">{eur(x.cents)}</b></div>
            <div className="dt-bar" role="img" aria-label={`${x.label}: ${Math.round((x.cents / total) * 100)}% of what was paid`}><i style={{ width: `${(x.cents / total) * 100}%` }} /></div>
          </div>
        ))}
      </div>

      {recent.length > 0 && (
        <>
          <h3 className="ph-section-title">Paid recently</h3>
          <div className="ph-card">
            {recent.map(({ s, c }) => (
              <div key={s.id} className="ph-moneyrow">
                <div className="ph-grow"><b className="pii">{c.full_name}</b><div className="ph-soft">{shortDay(dublinYmd(s.session_date))} · {howPaid(s, c)}</div></div>
                <span className="ph-amt">{eur(s.fee)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <DtDisclosure id="money-detail" title="Income report, monthly chart and statement import"
        sub="The full income report, the CSV for your accountant, the weekly report email and the Revolut statement import">
        {fullMoney}
      </DtDisclosure>
    </>
  );
}
