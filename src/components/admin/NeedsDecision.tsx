'use client';

// "Needs a decision": what Owen has to settle, in one card shared by the desktop
// Today (right column) and the phone Today. In order: "Did they pay?" prompts,
// differences with Google Calendar, then compact notices for the old "Needs
// attention" counts (past sessions not marked paid, paid sessions without a
// receipt sent, intake forms not returned, Google events not linked to a
// client), each with a button to the right place. At most three show until
// "Show all". Nothing here emails anyone; each existing card keeps its own
// buttons and confirms.

import { useCallback, useMemo, useState } from 'react';
import { CalendarDriftCard } from './CalendarDriftCard';
import { PaymentPromptsPanel } from './PaymentPromptsPanel';
import { attentionNotices, type AttentionKey } from './needsAttention';
import type { DriftItem } from '@/lib/calendarDrift';
import type { AdminSection, CalendarEvent, ClientRow, FormsTab, SessionFilter, TokenRow } from './types';

export type Navigate = (section: AdminSection, opts?: { sessionsFilter?: SessionFilter; formsTab?: FormsTab }) => void;

const GO: Record<AttentionKey, { section: AdminSection; sessionsFilter?: SessionFilter; formsTab?: FormsTab }> = {
  unpaid: { section: 'revenue' },
  receipts: { section: 'sessions', sessionsFilter: 'needs_receipt' },
  forms: { section: 'forms', formsTab: 'pending' },
  unlinked: { section: 'sessions', sessionsFilter: 'all' },
};

const NOTICES = 3;

interface Props {
  clients: ClientRow[];
  tokens: TokenRow[];
  events: CalendarEvent[];
  drift: DriftItem[];
  /** Reload the dashboard (and the free times) after a change. */
  onChanged: () => void;
  /** Open that session on its payment (panel on desktop, session page on phone). */
  onOpenSession: (sessionId: string) => void;
  onNavigate: Navigate;
  /** Phone: the heading sits in the group title above and an empty card is not shown. */
  phone?: boolean;
}

export function NeedsDecision({ clients, tokens, events, drift, onChanged, onOpenSession, onNavigate, phone = false }: Props) {
  const [payCount, setPayCount] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const onCount = useCallback((n: number) => { setPayCount(n); setLoaded(true); }, []);

  const notices = useMemo(() => attentionNotices(clients, tokens, events, new Date()), [clients, tokens, events]);
  const decisions = payCount + drift.length + notices.length;

  const driftLimit = showAll ? undefined : Math.max(0, NOTICES - payCount);
  const noticeLimit = showAll ? undefined : Math.max(0, NOTICES - payCount - drift.length);
  const shownNotices = noticeLimit === undefined ? notices : notices.slice(0, noticeLimit);

  // On a phone an empty "Needs a decision" would only add noise to Today.
  if (phone && loaded && decisions === 0) return null;

  return (
    <div className="dt-group" data-needs-decision>
      <h2 className="dt-h">Needs a decision <small>{decisions}</small></h2>
      <div className="dt-card dt-pad dt-nd">
        <div className="dt-nd-group">
          <PaymentPromptsPanel bare onChanged={onChanged} onCount={onCount}
            limit={showAll ? undefined : NOTICES} onOpenSession={onOpenSession} />
        </div>
        <div className="dt-nd-group">
          <CalendarDriftCard bare items={drift} onResolved={onChanged} limit={driftLimit} />
        </div>
        {shownNotices.length > 0 && (
          <div className="dt-nd-group">
            <ul className="pp-list" aria-label="Things to look at">
              {shownNotices.map(n => (
                <li key={n.key} className="pp-row is-notice" data-attention={n.key}>
                  <span className="dt-ndot" aria-hidden />
                  <div className="dt-notice-body">
                    <p className="dt-notice-line">{n.line}</p>
                    <p className="dt-notice-hint">{n.hint}</p>
                    <div className="dt-notice-actions">
                      <button type="button" className="dt-btn" onClick={() => onNavigate(GO[n.key].section, GO[n.key])}>{n.action}</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {decisions > NOTICES && (
          <button type="button" className="dt-link" aria-expanded={showAll} onClick={() => setShowAll(s => !s)}>
            {showAll ? 'Show fewer' : `Show all (${decisions})`}
          </button>
        )}
        {decisions === 0 && <p className="dt-hint">Nothing needs a decision right now.</p>}
      </div>
    </div>
  );
}
