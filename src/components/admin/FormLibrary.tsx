'use client';

import { useState } from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { downloadAdminPdf } from './api';

// Blank copies of every document clients receive, to read, print or share.
const FORMS = [
  { id: 'intake', title: 'Intake form', file: 'intake-form-blank.pdf', desc: 'The questions clients answer before a first session, as a printable blank.' },
  { id: 'agreement', title: 'Therapeutic agreement', file: 'therapeutic-agreement.pdf', desc: 'Sessions, fees, the 48-hour cancellation policy, confidentiality and contact.' },
  { id: 'privacy', title: 'Privacy policy', file: 'privacy-policy.pdf', desc: 'How client information is collected, stored and deleted (GDPR).' },
] as const;

export function FormLibrary() {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <section className="admin-card admin-formlib" aria-labelledby="formlib-h">
      <h2 id="formlib-h" className="admin-h2">Form library</h2>
      <p className="admin-formlib-sub">Blank copies of everything clients receive. Opening one never sends anything.</p>
      <ul className="admin-formlib-list">
        {FORMS.map(f => (
          <li key={f.id}>
            <span className="admin-formlib-icon" aria-hidden><FileText size={20} strokeWidth={1.6} /></span>
            <div className="admin-formlib-text">
              <b>{f.title}</b>
              <span>{f.desc}</span>
            </div>
            <div className="admin-formlib-actions">
              <a className="admin-btn-secondary" href={`/api/admin/forms/blank?form=${f.id}&inline=1`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={13} aria-hidden /> Open
              </a>
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={busy === f.id}
                onClick={async () => { setBusy(f.id); await downloadAdminPdf(`/api/admin/forms/blank?form=${f.id}`, f.file); setBusy(null); }}
              >
                <Download size={13} aria-hidden /> {busy === f.id ? 'Preparing…' : 'Download'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
