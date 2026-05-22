'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Avatar } from './Avatar';
import { adminFetch, displayFee, formatDateTime } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SubmissionRow } from './types';

interface Props {
  client: ClientRow | null;
  submissions: SubmissionRow[];
  onClose: () => void;
  onReload: () => void;
}

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

const STATUS_TONES: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  scheduled: { bg: 'rgba(255,255,255,0.07)', fg: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.14)', label: 'Scheduled' },
  attended:  { bg: 'rgba(212,168,67,0.15)',  fg: '#D4A843',                border: 'rgba(212,168,67,0.3)',   label: 'Attended' },
  cancelled: { bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.4)',  border: 'rgba(255,255,255,0.1)',  label: 'Cancelled' },
  no_show:   { bg: 'rgba(255,255,255,0.05)', fg: 'rgba(255,255,255,0.4)',  border: 'rgba(255,255,255,0.1)',  label: 'No show' },
};
const PAYMENT_TONES: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  paid:     { bg: 'rgba(79,138,104,0.2)',  fg: '#A6E3BD', border: 'rgba(79,138,104,0.35)', label: 'Paid' },
  unpaid:   { bg: 'rgba(200,90,26,0.22)',  fg: '#F4956A', border: 'rgba(200,90,26,0.4)',   label: 'Unpaid' },
  refunded: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.15)', label: 'Refunded' },
};

function Pill({ tones, kind }: { tones: typeof STATUS_TONES; kind: string }) {
  const t = tones[kind] ?? tones[Object.keys(tones)[0]];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 5,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
    }}>{t.label}</span>
  );
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
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 90,
          animation: 'admin-fade-in 150ms ease',
        }}
      />
      <aside
        className="admin-glass"
        style={{
          position: 'fixed',
          top: 0, right: 0,
          height: '100vh',
          width: 'min(560px, 100vw)',
          borderRadius: 0,
          borderLeft: '1px solid rgba(255,255,255,0.14)',
          borderRight: 'none', borderTop: 'none', borderBottom: 'none',
          background: 'rgba(30, 61, 47, 0.85)',
          zIndex: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          animation: 'admin-slide-in-right 220ms ease',
        }}
      >
        <div style={{
          padding: '20px 28px',
          background: 'rgba(0,0,0,0.25)',
          display: 'flex', alignItems: 'center', gap: 16,
          position: 'sticky', top: 0, zIndex: 2,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <Avatar name={client.full_name} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
              fontWeight: 300, fontSize: 22, color: 'white',
            }}>{client.full_name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              {client.email}{client.phone ? ` · ${client.phone}` : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 6,
            }}
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <Field label="Status" value={client.status} />
            <Field label="Default fee" value={displayFee(client.session_fee)} />
            <Field label="Joined" value={new Date(client.created_at).toLocaleDateString('en-IE')} />
            {submission && (
              <button
                onClick={downloadPdf}
                disabled={downloading}
                className="admin-btn-secondary"
                style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}
              >
                <Download size={14} strokeWidth={1.8} />
                {downloading ? 'Generating…' : 'Intake PDF'}
              </button>
            )}
          </div>

          <section>
            <div style={eyebrow}>Session history</div>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedSessions.length === 0 && (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>No sessions.</p>
              )}
              {sortedSessions.map(s => (
                <div key={s.id} className="admin-glass-light" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13, color: 'white', fontWeight: 500 }}>
                      {formatDateTime(s.session_date)}
                    </strong>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                      {FORMAT_LABELS[s.session_format] ?? s.session_format} · {displayFee(s.fee)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    <Pill tones={STATUS_TONES} kind={s.status} />
                    <Pill tones={PAYMENT_TONES} kind={s.payment_status} />
                  </div>
                  {s.receipt_sent_at && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                      Receipt sent {formatDateTime(s.receipt_sent_at)}
                    </div>
                  )}
                  {s.stripe_payment_link_url && (
                    <a href={s.stripe_payment_link_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', marginTop: 6,
                        fontSize: 11, color: '#F4956A', textDecoration: 'underline',
                      }}>Payment link ↗</a>
                  )}
                  {s.notes && (
                    <div style={{
                      fontSize: 12, color: 'rgba(255,255,255,0.55)',
                      fontStyle: 'italic', marginTop: 6,
                    }}>{s.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={eyebrow}>Notes</div>
              <div style={{
                fontSize: 11,
                color: notesSaved ? '#A6E3BD' : 'rgba(255,255,255,0.4)',
              }}>
                {notesSaving ? 'Saving…' : notesSaved ? 'Saved' : 'Auto-saves'}
              </div>
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Private notes about this client. Auto-saves as you type."
              rows={6}
              className="admin-textarea"
            />
          </section>
        </div>
      </aside>
    </>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '2.4px',
  textTransform: 'uppercase',
  color: '#C85A1A',
  marginBottom: 4,
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={eyebrow}>{label}</div>
      <div style={{ fontSize: 14, color: 'white', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}
