'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import { colors, fonts, shadows } from './theme';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
import { adminFetch, displayFee, formatDateTime } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SubmissionRow } from './types';

/** Pick the submission whose timestamp is closest to (and not before) the
 *  client's creation. Only used for rows that pre-date the client_id FK. */
function legacySubmissionMatch(submissions: SubmissionRow[], client: ClientRow): SubmissionRow | undefined {
  const created = new Date(client.created_at).getTime();
  const candidates = submissions.filter(s =>
    !s.client_id
    && (s.email?.toLowerCase() === client.email.toLowerCase()
      || s.full_name.toLowerCase() === client.full_name.toLowerCase())
    && new Date(s.submitted_at).getTime() + 5 * 60_000 >= created
  );
  if (candidates.length === 0) return undefined;
  return candidates
    .slice()
    .sort((a, b) =>
      Math.abs(new Date(a.submitted_at).getTime() - created)
      - Math.abs(new Date(b.submitted_at).getTime() - created)
    )[0];
}

interface Props {
  client: ClientRow | null;
  submissions: SubmissionRow[];
  onClose: () => void;
  onReload: () => void;
}

export function ClientDetail({ client, submissions, onClose, onReload }: Props) {
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNotes(client?.notes ?? '');
    setNotesSaved(false);
  }, [client]);

  if (!client) return null;

  // Prefer the proper FK link — falls back to email/name temporal match for
  // legacy submissions that were created before client_id existed on the row.
  const submission =
    submissions.find(s => s.client_id && s.client_id === client.id)
    ?? legacySubmissionMatch(submissions, client);

  const sortedSessions = client.sessions
    .slice()
    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());

  function handleNotesChange(v: string) {
    setNotes(v);
    setNotesSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistNotes(v), 700);
  }

  async function persistNotes(v: string) {
    if (!client) return;
    setNotesSaving(true);
    try {
      const res = await adminFetch('/api/admin/clients/notes', {
        method: 'POST',
        body: JSON.stringify({ client_id: client.id, notes: v }),
      });
      if (res.ok) {
        setNotesSaved(true);
        onReload();
      }
    } finally {
      setNotesSaving(false);
    }
  }

  async function downloadPdf() {
    if (!submission) return;
    setDownloading(true);
    try {
      const res = await adminFetch(`/api/intake/download-pdf?submission_id=${submission.id}`);
      if (!res.ok) { alert(`Failed to generate PDF (${res.status}).`); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name = submission.full_name.replace(/\s+/g, '-').toLowerCase();
      const date = new Date(submission.submitted_at).toISOString().split('T')[0];
      a.href = url;
      a.download = `intake-${name}-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(42,77,60,0.32)',
          zIndex: 90,
          animation: 'fadeIn 150ms ease',
        }}
      />
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 'min(560px, 100vw)',
          background: colors.linen,
          boxShadow: shadows.panel,
          zIndex: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 220ms ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          background: colors.forest,
          color: colors.white,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}>
          <Avatar name={client.full_name} size={48} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: fonts.display, fontWeight: 300, fontSize: 22 }}>
              {client.full_name}
            </div>
            <div style={{ fontFamily: fonts.sans, fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              {client.email}{client.phone ? ` · ${client.phone}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: colors.white, cursor: 'pointer', padding: 6 }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <div style={eyebrowSm}>Status</div>
              <div style={dataSm}>{client.status}</div>
            </div>
            <div>
              <div style={eyebrowSm}>Default fee</div>
              <div style={dataSm}>{displayFee(client.session_fee)}</div>
            </div>
            <div>
              <div style={eyebrowSm}>Joined</div>
              <div style={dataSm}>{new Date(client.created_at).toLocaleDateString('en-IE')}</div>
            </div>
            {submission && (
              <button
                onClick={downloadPdf}
                disabled={downloading}
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  background: 'transparent',
                  color: colors.forest,
                  border: `1px solid ${colors.forest}`,
                  borderRadius: 5,
                  fontFamily: fonts.sans,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '1.2px',
                  textTransform: 'uppercase',
                  cursor: downloading ? 'default' : 'pointer',
                  alignSelf: 'flex-end',
                }}
              >
                <Download size={14} strokeWidth={1.8} />
                {downloading ? 'Generating…' : 'Intake PDF'}
              </button>
            )}
          </div>

          {/* Sessions */}
          <section>
            <div style={eyebrowSm}>Session history</div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedSessions.length === 0 && (
                <p style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted, margin: 0 }}>No sessions.</p>
              )}
              {sortedSessions.map(s => (
                <div key={s.id} style={{
                  background: colors.white,
                  borderRadius: 6,
                  border: `1px solid ${colors.border}`,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.forest, fontWeight: 500 }}>
                      {formatDateTime(s.session_date)}
                    </strong>
                    <span style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted }}>
                      {FORMAT_LABELS[s.session_format] ?? s.session_format} · {displayFee(s.fee)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge kind={s.status === 'attended' ? 'attended'
                      : s.status === 'cancelled' ? 'cancelled'
                      : s.status === 'no_show' ? 'no_show' : 'scheduled'} />
                    <Badge kind={s.payment_status === 'paid' ? 'paid'
                      : s.payment_status === 'refunded' ? 'refunded' : 'unpaid'} />
                  </div>
                  {s.receipt_sent_at && (
                    <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textFaint }}>
                      Receipt sent {formatDateTime(s.receipt_sent_at)}
                    </div>
                  )}
                  {s.stripe_payment_link_url && (
                    <a
                      href={s.stripe_payment_link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.terracotta, textDecoration: 'underline' }}
                    >
                      Payment link ↗
                    </a>
                  )}
                  {s.notes && (
                    <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, fontStyle: 'italic' }}>
                      {s.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={eyebrowSm}>Notes</div>
              <div style={{ fontFamily: fonts.sans, fontSize: 11, color: notesSaved ? colors.sageDark : colors.textFaint }}>
                {notesSaving ? 'Saving…' : notesSaved ? 'Saved' : 'Auto-saves'}
              </div>
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Private notes about this client. Auto-saves as you type."
              rows={6}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontFamily: fonts.sans,
                fontSize: 14,
                color: colors.text,
                background: colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: 6,
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </section>
        </div>

        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `}</style>
      </aside>
    </>
  );
}

const eyebrowSm = {
  fontFamily: fonts.sans,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: colors.terracotta,
  marginBottom: 4,
};

const dataSm = {
  fontFamily: fonts.sans,
  fontSize: 14,
  color: colors.forest,
};
