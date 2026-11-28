'use client';

// Desktop Clients (Sage Diary), built to the prototype's `clients()` view: a
// searchable list on the left, the chosen client's page on the right (three
// numbers, their questionnaire results where the prototype has the progress
// chart, and what's coming up). Everything the client record offers (contact
// details, notes, intake and forms, receipts and statement PDFs, "How often",
// reminders opt-out, Completed, delete) is in "Details and records", which
// opens the existing client record.

import { useMemo, useState } from 'react';
import { dedupeSessions, displayFee } from './api';
import { ClientQuestionnaireResults } from './Analytics';
import { DesktopPage } from './DesktopPage';
import { DesktopSessionRow } from './DesktopSessionRow';
import { IconPeople } from './sage';
import { cadenceLabel, dotColour } from './desktopToday';
import type { PanelOption } from './SessionPanel';
import type { ClientRow, SessionRow } from './types';

interface Props {
  clients: ClientRow[];
  onNewClient: () => void;
  onOpenPanel: (sessionId: string, option?: PanelOption | null) => void;
  panelSessionId: string | null;
  onEditSession: (s: SessionRow, c: ClientRow) => void;
  /** Opens the existing client record (ClientDetail). */
  onOpenClient: (c: ClientRow) => void;
}

// Sessions before this date predate proper payment tracking (as on Today and Money).
const OUTSTANDING_FLOOR = new Date('2026-06-01');

function formatOf(c: ClientRow): string {
  const last = dedupeSessions(c.sessions).filter(s => s.status !== 'cancelled')
    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];
  if (!last) return 'No sessions yet';
  return last.session_format === 'online' ? 'Online' : 'In person';
}
function lineOf(c: ClientRow): string {
  const sessions = dedupeSessions(c.sessions).filter(s => s.status !== 'cancelled');
  return sessions.length === 0 ? 'No sessions yet' : `${cadenceLabel(c)} · ${formatOf(c)}`;
}

export function DesktopClients({ clients, onNewClient, onOpenPanel, panelSessionId, onEditSession, onOpenClient }: Props) {
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);

  const sorted = useMemo(
    () => clients.slice().sort((a, b) =>
      Number(a.status === 'completed') - Number(b.status === 'completed') || a.full_name.localeCompare(b.full_name)),
    [clients],
  );
  const shown = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return lower ? sorted.filter(c => c.full_name.toLowerCase().includes(lower) || c.email.toLowerCase().includes(lower)) : sorted;
  }, [sorted, q]);
  const current = clients.find(c => c.id === selId) ?? sorted[0] ?? null;

  const now = new Date();
  const mine = current ? dedupeSessions(current.sessions).filter(s => s.status !== 'cancelled') : [];
  const soFar = mine.filter(s => new Date(s.session_date) <= now).length;
  const ahead = mine.filter(s => s.status === 'scheduled' && new Date(s.session_date) > now)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  const owed = mine.filter(s => s.payment_status !== 'paid' && s.payment_status !== 'refunded'
    && new Date(s.session_date) <= now && new Date(s.session_date) >= OUTSTANDING_FLOOR)
    .reduce((n, s) => n + (s.fee ?? 0), 0);

  return (
    <DesktopPage
      title="Clients"
      subtitle={`${clients.length} client${clients.length === 1 ? '' : 's'}`}
      action={<button type="button" className="sd-btn sd-btn-primary dt-cta" onClick={onNewClient}>Add a client</button>}
    >
      <div className="dt-cols dt-cols-clients">
        <div className="dt-group">
          <input className="dt-search" type="search" placeholder="Search clients" aria-label="Search clients"
            value={q} onChange={e => setQ(e.target.value)} />
          <div className="dt-card">
            {shown.length === 0 && <p className="dt-hint dt-empty">No client by that name.</p>}
            {shown.map(c => (
              <button key={c.id} type="button" className={`dt-lrow${c.id === current?.id ? ' is-sel' : ''}`}
                aria-pressed={c.id === current?.id} onClick={() => setSelId(c.id)}>
                <span className="dt-dot" style={{ background: dotColour(c.id) }} aria-hidden />
                <span className="dt-who">
                  <span className="dt-name pii">{c.full_name}</span>
                  <span className="dt-meta">{lineOf(c)}</span>
                </span>
                {c.status === 'completed' && <span className="dt-tag">Completed</span>}
              </button>
            ))}
          </div>
        </div>

        {current ? (
          <div className="dt-stack">
            <div className="dt-group">
              <h2 className="dt-h dt-h-lg">
                <span className="pii">{current.full_name}</span>
                <small>{lineOf(current)}{current.session_fee ? ` · ${displayFee(current.session_fee)}` : ''}</small>
              </h2>
              <div className="dt-stats">
                <div className="dt-stat"><b>{soFar}</b><span>Sessions so far</span></div>
                <div className="dt-stat"><b>{ahead.length}</b><span>Booked ahead</span></div>
                <div className="dt-stat"><b>{displayFee(owed)}</b><span>Not paid</span></div>
              </div>
            </div>

            <div className="dt-group">
              <h2 className="dt-h">Questionnaire results</h2>
              <ClientQuestionnaireResults key={current.id} client={current} />
            </div>

            <div className="dt-group">
              <h2 className="dt-h">Coming up</h2>
              <div className="dt-card">
                {ahead.length === 0 && <p className="dt-hint dt-empty">Nothing booked.</p>}
                {ahead.slice(0, 4).map(s => (
                  <DesktopSessionRow key={s.id} s={s} c={current} meta="date" selected={panelSessionId === s.id}
                    onOpen={option => onOpenPanel(s.id, option)} onEdit={() => onEditSession(s, current)} onOpenClient={() => onOpenClient(current)} />
                ))}
              </div>
            </div>

            <div className="dt-opt">
              <button type="button" className="dt-opt-head" onClick={() => onOpenClient(current)}>
                <span className="dt-opt-ic" aria-hidden><IconPeople /></span>
                <span className="dt-opt-txt">
                  <b>Details and records</b>
                  <span>Contact details, notes, forms, receipts, how often, reminders</span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <p className="dt-hint">No clients yet.</p>
        )}
      </div>
    </DesktopPage>
  );
}
