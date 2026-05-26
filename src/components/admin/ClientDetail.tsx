'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Download, Trash2, Pencil, Check } from 'lucide-react';
import { Avatar } from './Avatar';
import { adminFetch, displayFee, formatDateTime } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SessionRow, SubmissionRow } from './types';

interface Props {
  client: ClientRow | null;
  submissions: SubmissionRow[];
  onClose: () => void;
  onReload: () => void;
  onEditSession?: (session: SessionRow, client: ClientRow) => void;
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

function statusTag(status: string) {
  if (status === 'attended') return 'admin-tag-attended';
  if (status === 'cancelled' || status === 'no_show') return 'admin-tag-pause';
  return 'admin-tag-scheduled';
}
function statusLabel(status: string) {
  return status === 'attended' ? 'Attended'
    : status === 'cancelled' ? 'Cancelled'
    : status === 'no_show' ? 'No show'
    : 'Scheduled';
}
function payTag(status: string) {
  return status === 'paid' ? 'admin-tag-paid'
    : status === 'refunded' ? 'admin-tag-pause'
    : 'admin-tag-unpaid';
}
function payLabel(status: string) {
  return status === 'paid' ? 'Paid' : status === 'refunded' ? 'Refunded' : 'Unpaid';
}

interface ContactFields {
  email: string;
  phone: string;
  date_of_birth: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  gp_name: string;
  gp_phone: string;
}

function toContactFields(c: ClientRow): ContactFields {
  return {
    email: c.email ?? '',
    phone: c.phone ?? '',
    date_of_birth: c.date_of_birth ?? '',
    emergency_contact_name: c.emergency_contact_name ?? '',
    emergency_contact_phone: c.emergency_contact_phone ?? '',
    gp_name: c.gp_name ?? '',
    gp_phone: c.gp_phone ?? '',
  };
}

export function ClientDetail({ client, submissions, onClose, onReload, onEditSession }: Props) {
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingContact, setEditingContact] = useState(false);
  const [contactFields, setContactFields] = useState<ContactFields>({ email: '', phone: '', date_of_birth: '', emergency_contact_name: '', emergency_contact_phone: '', gp_name: '', gp_phone: '' });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

  useEffect(() => {
    setNotes(client?.notes ?? '');
    setNotesSaved(false);
    setEditingContact(false);
    if (client) setContactFields(toContactFields(client));
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
      if (res.ok) { setNotesSaved(true); onReload(); }
    } finally { setNotesSaving(false); }
  }

  async function saveContact() {
    if (!client) return;
    setContactSaving(true);
    try {
      const res = await adminFetch('/api/admin/clients/update', {
        method: 'POST',
        body: JSON.stringify({
          client_id: client.id,
          phone: contactFields.phone,
          date_of_birth: contactFields.date_of_birth,
          emergency_contact_name: contactFields.emergency_contact_name,
          emergency_contact_phone: contactFields.emergency_contact_phone,
          gp_name: contactFields.gp_name,
          gp_phone: contactFields.gp_phone,
        }),
      });
      if (res.ok) {
        setContactSaved(true);
        setEditingContact(false);
        onReload();
        setTimeout(() => setContactSaved(false), 2500);
      }
    } finally { setContactSaving(false); }
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
    } finally { setDownloading(false); }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(42, 77, 60, 0.32)',
          zIndex: 90,
          animation: 'admin-fade-in 150ms ease',
        }}
      />
      <aside
        style={{
          position: 'fixed',
          top: 0, right: 0,
          height: '100vh',
          width: 'min(560px, 100vw)',
          background: 'var(--cream)',
          boxShadow: '0 24px 64px rgba(42, 77, 60, 0.18)',
          zIndex: 100,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          animation: 'admin-slide-in-right 220ms ease',
        }}
      >
        <div style={{
          padding: '22px 28px',
          background: 'var(--forest-deep)',
          color: 'white',
          display: 'flex', alignItems: 'center', gap: 16,
          position: 'sticky', top: 0, zIndex: 2,
        }}>
          <Avatar name={client.full_name} size={48} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-montserrat), Avenir, sans-serif',
              fontWeight: 300, fontSize: 22, color: 'white',
              letterSpacing: '0.5px',
            }}>{client.full_name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              {client.email}{client.phone ? ` · ${client.phone}` : ''}
            </div>
          </div>
          <button
            onClick={async () => {
              if (!confirm(`Are you sure you want to delete ${client.full_name}? This will permanently delete all their sessions and intake data. This cannot be undone.`)) return;
              const res = await adminFetch('/api/admin/clients/delete', {
                method: 'POST',
                body: JSON.stringify({ client_id: client.id }),
              });
              if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                alert(`Failed to delete client: ${json.error ?? res.status}`);
                return;
              }
              onReload();
              onClose();
            }}
            aria-label="Delete client"
            title="Delete client"
            style={{
              background: 'transparent', border: 'none',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 6,
              marginRight: 4,
            }}
          >
            <Trash2 size={18} strokeWidth={1.8} />
          </button>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 6 }}>
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding: '26px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Field label="Status" value={client.status} />
            <Field label="Default fee" value={displayFee(client.session_fee)} />
            <Field label="Joined" value={new Date(client.created_at).toLocaleDateString('en-IE')} />
            <div>
              <p className="admin-eyebrow" style={{ marginBottom: 4 }}>Pricing tier</p>
              <button
                type="button"
                onClick={async () => {
                  const next = !client.is_low_cost;
                  const res = await adminFetch('/api/admin/clients/update', {
                    method: 'POST',
                    body: JSON.stringify({ client_id: client.id, is_low_cost: next }),
                  });
                  if (res.ok) onReload();
                }}
                className={`admin-tag ${client.is_low_cost ? 'admin-tag-new' : 'admin-tag-active'}`}
                style={{ cursor: 'pointer', border: 'none' }}
                title="Click to toggle"
              >
                {client.is_low_cost ? 'Low cost · click to unmark' : 'Full-paying · click to mark low cost'}
              </button>
            </div>
            {submission && (
              <button
                onClick={downloadPdf}
                disabled={downloading}
                className="admin-btn-secondary"
                style={{ marginLeft: 'auto' }}
              >
                <Download size={14} strokeWidth={1.8} />
                {downloading ? 'Generating…' : 'Intake PDF'}
              </button>
            )}
          </div>

          {/* Contact details */}
          <section style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p className="admin-eyebrow" style={{ margin: 0 }}>Contact details</p>
              {!editingContact ? (
                <button
                  type="button"
                  onClick={() => { setEditingContact(true); setContactSaved(false); }}
                  className="admin-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 11 }}
                >
                  <Pencil size={11} strokeWidth={1.8} /> Edit
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {contactSaved && <span style={{ fontSize: 11, color: 'var(--sage)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={11} /> Saved</span>}
                  <button type="button" onClick={() => { setEditingContact(false); if (client) setContactFields(toContactFields(client)); }} className="admin-btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }}>Cancel</button>
                  <button type="button" onClick={saveContact} disabled={contactSaving} className="admin-btn-primary" style={{ padding: '6px 14px', fontSize: 11 }}>
                    {contactSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ContactField label="Email" value={contactFields.email} editing={editingContact} type="email"
                onChange={v => setContactFields(f => ({ ...f, email: v }))} />
              <ContactField label="Phone" value={contactFields.phone} editing={editingContact} type="tel"
                onChange={v => setContactFields(f => ({ ...f, phone: v }))} />
              <ContactField label="Date of birth" value={contactFields.date_of_birth} editing={editingContact} type="date"
                onChange={v => setContactFields(f => ({ ...f, date_of_birth: v }))} />
              <div />
              <ContactField label="Emergency contact name" value={contactFields.emergency_contact_name} editing={editingContact}
                onChange={v => setContactFields(f => ({ ...f, emergency_contact_name: v }))} />
              <ContactField label="Emergency contact phone" value={contactFields.emergency_contact_phone} editing={editingContact} type="tel"
                onChange={v => setContactFields(f => ({ ...f, emergency_contact_phone: v }))} />
              <ContactField label="GP name" value={contactFields.gp_name} editing={editingContact}
                onChange={v => setContactFields(f => ({ ...f, gp_name: v }))} />
              <ContactField label="GP phone" value={contactFields.gp_phone} editing={editingContact} type="tel"
                onChange={v => setContactFields(f => ({ ...f, gp_phone: v }))} />
            </div>
          </section>

          <section>
            <p className="admin-eyebrow" style={{ marginBottom: 10 }}>Session history</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedSessions.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0 }}>No sessions.</p>
              )}
              {sortedSessions.map(s => (
                <div key={s.id} style={{
                  padding: '14px 16px', borderRadius: 12,
                  background: 'white', border: '1px solid var(--line)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13, color: 'var(--forest-deep)', fontWeight: 500 }}>
                      {formatDateTime(s.session_date)}
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      {FORMAT_LABELS[s.session_format] ?? s.session_format} · {displayFee(s.fee)}
                    </span>
                    {onEditSession && client && (
                      <button
                        type="button"
                        onClick={() => onEditSession(s, client)}
                        className="admin-btn-secondary"
                        style={{ padding: '5px 10px', fontSize: 10, marginLeft: 'auto' }}
                      >
                        <Pencil size={11} strokeWidth={1.8} /> Edit
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    <span className={`admin-tag ${statusTag(s.status)}`}>{statusLabel(s.status)}</span>
                    <span className={`admin-tag ${payTag(s.payment_status)}`}>{payLabel(s.payment_status)}</span>
                  </div>
                  {s.paid_at && (
                    <div style={{ fontSize: 11, color: 'var(--sage)', marginTop: 8, fontWeight: 500 }}>
                      Paid {formatDateTime(s.paid_at)} · €{Math.round((s.fee ?? 0) / 100)}
                    </div>
                  )}
                  {s.receipt_sent_at && (
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
                      Receipt sent {formatDateTime(s.receipt_sent_at)}
                    </div>
                  )}
                  {s.stripe_payment_link_url && (
                    <a href={s.stripe_payment_link_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'inline-block', marginTop: 6,
                        fontSize: 11, color: 'var(--terracotta)', textDecoration: 'underline',
                      }}>Payment link ↗</a>
                  )}
                  {s.notes && (
                    <div style={{
                      fontSize: 12, color: 'var(--ink-muted)',
                      fontStyle: 'italic', marginTop: 6,
                    }}>{s.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
              <p className="admin-eyebrow" style={{ margin: 0 }}>Notes</p>
              <div style={{
                fontSize: 11,
                color: notesSaved ? 'var(--sage)' : 'var(--ink-muted)',
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="admin-eyebrow" style={{ marginBottom: 4 }}>{label}</p>
      <div style={{ fontSize: 14, color: 'var(--forest-deep)', textTransform: 'capitalize' }}>{value}</div>
    </div>
  );
}

interface ContactFieldProps {
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  onChange: (v: string) => void;
}

function ContactField({ label, value, editing, type = 'text', onChange }: ContactFieldProps) {
  return (
    <div>
      <p className="admin-eyebrow" style={{ marginBottom: 4 }}>{label}</p>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="admin-input"
          style={{ padding: '8px 10px', fontSize: 13 }}
        />
      ) : (
        <div style={{ fontSize: 13, color: value ? 'var(--forest-deep)' : 'var(--ink-muted)', minHeight: 20 }}>
          {value || <span style={{ fontStyle: 'italic' }}>—</span>}
        </div>
      )}
    </div>
  );
}
