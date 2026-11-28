'use client';

// Phone Clients (prototype): a search box and one row per client (dot, name,
// "Next: ...", cadence tag). A row opens the client's page (a sub-page with a
// back button): three numbers, questionnaire results, what's coming up, and
// "Details and records", which opens the existing client record.

import { useMemo, useState } from 'react';
import { formatShortWhen } from '@/lib/dateUtils';
import { dedupeSessions, displayFee } from '../api';
import { ClientQuestionnaireResults } from '../Analytics';
import { OUTSTANDING_FLOOR } from '../moneySummary';
import { cadenceLabel, dotColour } from '../desktopToday';
import { IconChevronRight, IconPeople } from '../sage';
import type { ClientRow } from '../types';
import { PhoneBand } from './PhoneBand';
import { SwipeRow, type PhoneOption } from './SwipeRow';
import { useOpenRow } from './useOpenRow';
import { nextScheduled } from './phoneHelpers';

export function PhoneClients({ clients, onOpenClientPage }: { clients: ClientRow[]; onOpenClientPage: (id: string) => void }) {
  const [q, setQ] = useState('');
  const sorted = useMemo(
    () => clients.slice().sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || a.full_name.localeCompare(b.full_name)),
    [clients],
  );
  const shown = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return lower ? sorted.filter(c => c.full_name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower)) : sorted;
  }, [sorted, q]);
  const now = new Date();

  return (
    <>
      <PhoneBand title="Clients" sub={`${clients.length} client${clients.length === 1 ? '' : 's'}`} />
      <div className="ph-content">
        <label className="ph-field-label"><span className="ph-hint">Search</span>
          <input className="ph-search" type="search" placeholder="Search clients" value={q} onChange={e => setQ(e.target.value)} />
        </label>
        <div className="ph-card" role="list" aria-label="Clients">
          {shown.length === 0 && <p className="ph-empty">No client by that name.</p>}
          {shown.map(c => {
            const next = nextScheduled(c, now);
            return (
              <div key={c.id} role="listitem">
                <button type="button" className="ph-navrow ph-clientrow" onClick={() => onOpenClientPage(c.id)}>
                  <span className="ph-dot" style={{ background: dotColour(c.id) }} aria-hidden />
                  <span className="ph-txt">
                    <b className="pii">{c.full_name}</b>
                    <span>{next ? `Next: ${formatShortWhen(next.session_date)}` : 'Nothing booked'}</span>
                  </span>
                  <span className="ph-tag">{c.status === 'completed' ? 'Completed' : cadenceLabel(c)}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

interface PageProps {
  client: ClientRow;
  onOpenSession: (id: string, option?: PhoneOption | null) => void;
  onBook: (clientId: string) => void;
  onSendForms: () => void;
  /** The existing client record (ClientDetail). */
  onDetails: () => void;
}

/** The body of a client's page (the sub-page frame comes from PhoneApp). */
export function PhoneClientPage({ client, onOpenSession, onBook, onSendForms, onDetails }: PageProps) {
  const rows = useOpenRow();
  const now = new Date();
  const mine = dedupeSessions(client.sessions).filter(s => s.status !== 'cancelled');
  const soFar = mine.filter(s => new Date(s.session_date) <= now).length;
  const ahead = mine.filter(s => s.status === 'scheduled' && new Date(s.session_date) > now)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  const owed = mine.filter(s => s.payment_status !== 'paid' && s.payment_status !== 'refunded'
    && new Date(s.session_date) <= now && new Date(s.session_date) >= OUTSTANDING_FLOOR)
    .reduce((n, s) => n + (s.fee ?? 0), 0);

  return (
    <>
      <div className="ph-stats">
        <div className="ph-stat"><b>{soFar}</b><span>Sessions so far</span></div>
        <div className="ph-stat"><b>{ahead.length}</b><span>Booked ahead</span></div>
        <div className="ph-stat"><b>{displayFee(owed)}</b><span>Not paid</span></div>
      </div>

      <h3 className="ph-section-title">Coming up</h3>
      <div className="ph-card" role="list" aria-label="Coming up">
        {ahead.length === 0 && <p className="ph-empty">Nothing booked.</p>}
        {ahead.slice(0, 5).map(s => (
          <div key={s.id} role="listitem">
            <SwipeRow s={s} c={client} meta="date" {...rows.props(s.id)} onOpen={opt => onOpenSession(s.id, opt)} />
          </div>
        ))}
      </div>

      <div className="ph-btns">
        <button type="button" className="ph-smallbtn is-yellow" onClick={() => onBook(client.id)}>Book next session</button>
        <button type="button" className="ph-smallbtn" onClick={onSendForms}>Send forms</button>
      </div>

      <h3 className="ph-section-title">Questionnaire results</h3>
      <ClientQuestionnaireResults key={client.id} client={client} />

      <div className="ph-card">
        <button type="button" className="ph-navrow" onClick={onDetails}>
          <span className="ph-ic" aria-hidden><IconPeople /></span>
          <span className="ph-txt"><b>Details and records</b><span>Contact details, notes, forms, receipts, how often, reminders</span></span>
          <span className="ph-chev" aria-hidden><IconChevronRight /></span>
        </button>
      </div>
    </>
  );
}
