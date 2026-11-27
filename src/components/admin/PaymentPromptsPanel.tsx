'use client';

// Loads the "Did they pay?" prompts, saves the practitioner's answer, and
// handles the dashboard link from the digest email
// (/admin/intake?payprompt=<session>&choice=<choice>). The link carries no
// secret: it only opens the matching confirmation here, once logged in.

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from './api';
import {
  PaymentPromptsCard, type PaymentChoice, type PaymentPromptItem, type PendingChoice,
} from './PaymentPromptsCard';

const CHOICES: PaymentChoice[] = ['paid_receipt', 'paid_no_receipt', 'remind_tomorrow'];

// Module-level so that if the dashboard remounts (desktop <-> phone layout)
// the link isn't lost after it has been taken off the address bar.
let emailLink: PendingChoice | null = null;
let emailLinkRead = false;
function takeEmailLink(): PendingChoice | null {
  if (emailLinkRead || typeof window === 'undefined') return emailLink;
  emailLinkRead = true;
  try {
    const url = new URL(window.location.href);
    const id = url.searchParams.get('payprompt');
    const choice = url.searchParams.get('choice');
    if (id) {
      // An unknown choice still only opens the safest confirmation.
      emailLink = { sessionId: id, choice: CHOICES.includes(choice as PaymentChoice) ? choice as PaymentChoice : 'remind_tomorrow' };
      url.searchParams.delete('payprompt');
      url.searchParams.delete('choice');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  } catch { /* no URL access: just no deep link */ }
  return emailLink;
}

async function fetchPrompts(): Promise<PaymentPromptItem[] | null> {
  try {
    const res = await adminFetch('/api/admin/payment-prompts');
    if (!res.ok) return null;
    const json = await res.json();
    return json.prompts ?? [];
  } catch { return null; }
}

interface Props {
  /** Refresh the rest of the dashboard after a change. */
  onChanged: () => void;
}

export function PaymentPromptsPanel({ onChanged }: Props) {
  const [prompts, setPrompts] = useState<PaymentPromptItem[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'alert'; text: string } | null>(null);
  // The email link is read once (and taken off the address bar) on first render.
  const [linked, setLinked] = useState<PendingChoice | null>(() => takeEmailLink());

  const reload = useCallback(async () => {
    const list = await fetchPrompts();
    if (list) setPrompts(list);
  }, []);
  useEffect(() => {
    let alive = true;
    fetchPrompts().then(list => { if (alive && list) setPrompts(list); });
    return () => { alive = false; };
  }, []);

  // A link to a prompt that's already been dealt with: say so, don't act.
  const staleLink = Boolean(linked && prompts && !prompts.some(p => p.session_id === linked.sessionId));

  async function choose(sessionId: string, choice: PaymentChoice) {
    const p = prompts?.find(x => x.session_id === sessionId);
    setBusy(sessionId); setMessage(null); setLinked(null); emailLink = null;
    try {
      const res = await adminFetch('/api/admin/payment-prompts', {
        method: 'POST', body: JSON.stringify({ session_id: sessionId, choice }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setMessage({ kind: 'alert', text: json.error ?? 'That did not save. Nothing was changed.' }); return; }
      const who = p?.label ?? 'That session';
      if (json.alreadyPaid) setMessage({ kind: 'ok', text: `${who} was already marked paid. Nothing was sent.` });
      else if (json.outcome === 'snoozed') setMessage({ kind: 'ok', text: `OK, I'll ask again tomorrow morning about ${who}.` });
      else if (json.receipt_requested && json.receipt_sent) setMessage({ kind: 'ok', text: `${who} marked paid, and the receipt was emailed.` });
      else if (json.receipt_requested) setMessage({ kind: 'alert', text: `${who} marked paid, but the receipt was NOT sent (it may have gone already, or emails are off). Check the session.` });
      else setMessage({ kind: 'ok', text: `${who} marked paid. No receipt sent.` });
      await reload();
      onChanged();
    } catch {
      setMessage({ kind: 'alert', text: 'No connection. Nothing was changed.' });
    } finally {
      setBusy(null);
    }
  }

  const initial = linked && prompts?.some(p => p.session_id === linked.sessionId) ? linked : null;
  const shown = message ?? (staleLink ? { kind: 'ok' as const, text: "That one's already been dealt with. Nothing to do." } : null);

  return (
    <>
      {shown && (
        <div className={`admin-banner is-${shown.kind}`} role="status">{shown.text}</div>
      )}
      {prompts && prompts.length > 0 && (
        // Keyed on the link so the confirmation opens once the list has loaded.
        <PaymentPromptsCard
          key={initial ? `link-${initial.sessionId}` : 'list'}
          prompts={prompts}
          busy={busy}
          initialConfirm={initial}
          onChoose={(id, c) => void choose(id, c)}
        />
      )}
    </>
  );
}
