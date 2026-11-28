'use client';

// Desktop Forms (Sage Diary), built to the prototype's `forms()` view: one row
// per form with "Send to a client" and "Download PDF". What exists today:
//  - Intake form: Send opens the existing "Add a client" flow (it makes the
//    private intake link and emails it after you confirm); PDF is the blank.
//  - Therapeutic agreement, Privacy policy: PDFs only (the agreement goes with
//    the intake form).
//  - Values and Therapy preferences questionnaires: Send goes to the existing
//    "Send a questionnaire" panel below (link or email, test mode, send to all,
//    each with its confirm); there is no blank PDF of these.
// Below: that panel and the questionnaire results (also shown on each client's
// page), and the intake forms received / waiting.

import { useState } from 'react';
import { downloadAdminPdf } from './api';
import { Analytics } from './Analytics';
import { DesktopPage } from './DesktopPage';
import { FormsTable } from './FormsTable';
import type { ClientRow, SubmissionRow, TokenRow, FormsTab } from './types';

interface Props {
  clients: ClientRow[];
  submissions: SubmissionRow[];
  tokens: TokenRow[];
  formsTab?: FormsTab;
  /** The existing intake send flow ("Add a client"). */
  onNewClient: () => void;
}

type Row = {
  id: string; title: string; desc: string;
  send?: 'intake' | 'values' | 'cnip';
  pdf?: { form: string; file: string };
  note?: string;
};
const ROWS: Row[] = [
  { id: 'intake', title: 'Intake form', desc: 'Contact details, GP, what brings them', send: 'intake', pdf: { form: 'intake', file: 'intake-form-blank.pdf' } },
  { id: 'agreement', title: 'Therapeutic agreement', desc: 'Fees, cancellations, confidentiality', pdf: { form: 'agreement', file: 'therapeutic-agreement.pdf' }, note: 'Sent with the intake form' },
  { id: 'privacy', title: 'Privacy policy', desc: 'How client information is kept and deleted', pdf: { form: 'privacy', file: 'privacy-policy.pdf' }, note: 'Sent with the intake form' },
  { id: 'values', title: 'Values questionnaire', desc: 'What matters to them, at the start', send: 'values' },
  { id: 'cnip', title: 'Therapy preferences (C–NIP–2)', desc: 'What they want from therapy', send: 'cnip' },
];

export function DesktopForms({ clients, submissions, tokens, formsTab, onNewClient }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [preset, setPreset] = useState<{ kind: 'values' | 'cnip'; n: number } | undefined>();

  function send(kind: 'intake' | 'values' | 'cnip') {
    if (kind === 'intake') { onNewClient(); return; }
    setPreset(p => ({ kind, n: (p?.n ?? 0) + 1 }));
    window.setTimeout(() => {
      const select = document.querySelector<HTMLElement>('.admin-qa-send select');
      select?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      select?.focus();
    }, 60);
  }

  return (
    <DesktopPage title="Forms" subtitle="Send to a client, or download a PDF">
      <div className="dt-stack">
        <div className="dt-card">
          {ROWS.map(r => (
            <div key={r.id} className="dt-lrow dt-lrow-static dt-lrow-forms">
              <div className="dt-grow"><b>{r.title}</b><div className="dt-soft">{r.desc}</div></div>
              {r.send
                ? <button type="button" className="dt-btn" aria-label={`Send ${r.title} to a client`} onClick={() => send(r.send!)}>Send to a client</button>
                : <span className="dt-soft">{r.note}</span>}
              {r.pdf ? (
                <button type="button" className="dt-btn" disabled={busy === r.id} aria-label={`Download ${r.title} as a PDF`}
                  onClick={async () => { setBusy(r.id); await downloadAdminPdf(`/api/admin/forms/blank?form=${r.pdf!.form}`, r.pdf!.file); setBusy(null); }}>
                  {busy === r.id ? 'Preparing…' : 'Download PDF'}
                </button>
              ) : <span />}
            </div>
          ))}
        </div>

        <Analytics clients={clients} embedded sendPreset={preset} />

        <div className="dt-group">
          <h2 className="dt-h">Intake forms received</h2>
          <FormsTable submissions={submissions} tokens={tokens} initialTab={formsTab} />
        </div>
      </div>
    </DesktopPage>
  );
}
