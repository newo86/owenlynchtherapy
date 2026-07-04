'use client';

import { useEffect, useState } from 'react';
import { X, Download, Trash2, Pencil, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar } from './Avatar';
import { adminFetch, displayFee, formatDateTime, formatTime, downloadAdminPdf, dedupeSessions } from './api';
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

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

/** Year-month (YYYY-MM) of a UTC instant in Europe/Dublin. */
function dublinYearMonth(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' }).slice(0, 7);
}

interface NextAction {
  kind: 'warn' | 'info' | 'ok';
  label: string;
  detail: string;
}

/** The single most useful next step for this client, surfaced at a glance. */
function nextAction(client: ClientRow): NextAction {
  const now = new Date();
  const active = dedupeSessions(client.sessions).filter(s => s.status !== 'cancelled');
  const unpaidDue = active.filter(s =>
    s.payment_status !== 'paid' && s.payment_status !== 'refunded' && new Date(s.session_date) <= now
  );
  const needsReceipt = active.filter(s => s.status === 'attended' && !s.receipt_sent_at);
  const upcoming = active
    .filter(s => s.status === 'scheduled' && new Date(s.session_date) > now)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[0];

  if (unpaidDue.length > 0) {
    return {
      kind: 'warn',
      label: client.is_low_cost ? 'Record cash payment' : 'Collect payment',
      detail: `${unpaidDue.length} past session${unpaidDue.length === 1 ? '' : 's'} unpaid.`,
    };
  }
  if (needsReceipt.length > 0) {
    return {
      kind: 'info',
      label: 'Send receipt',
      detail: `${needsReceipt.length} attended session${needsReceipt.length === 1 ? '' : 's'} without a receipt.`,
    };
  }
  if (upcoming) {
    return { kind: 'ok', label: 'All up to date', detail: `Next session ${formatDateTime(upcoming.session_date)}.` };
  }
  return { kind: 'info', label: 'Schedule next session', detail: 'No upcoming sessions booked.' };
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
  const [downloading, setDownloading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const [editingContact, setEditingContact] = useState(false);
  const [contactFields, setContactFields] = useState<ContactFields>({ email: '', phone: '', date_of_birth: '', emergency_contact_name: '', emergency_contact_phone: '', gp_name: '', gp_phone: '' });
  const [contactSaving, setContactSaving] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

  // Reset transient view state only when a DIFFERENT client is opened — keyed
  // on the id, not the object. The 30s poll replaces the client object with a
  // fresh identity on every refresh, and keying on it used to cancel edits
  // mid-type and yank the month view back to "now" every half minute.
  const clientId = client?.id;
  useEffect(() => {
    setEditingContact(false);
    setShowDetails(false);
    setMonthOffset(0);
  }, [clientId]);

  // Keep the contact fields fresh from server data, but never clobber the
  // form while the practitioner is editing it. Sync-props-to-state is the
  // point here (the 30s poll refreshes `client`), hence the rule exception.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (client && !editingContact) setContactFields(toContactFields(client));
  }, [client, editingContact]);

  // Close on Escape.
  useEffect(() => {
    if (!client) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [client, onClose]);

  if (!client) return null;

  const submission =
    submissions.find(s => s.client_id && s.client_id === client.id)
    ?? legacySubmissionMatch(submissions, client);

  const age = ageFromDob(client.date_of_birth);

  // Target month (Dublin), navigable with the chevrons; defaults to this month.
  const nowDub = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' });
  const [ny, nm] = nowDub.split('-').map(Number);
  let ty = ny, tm = nm + monthOffset;
  while (tm < 1) { tm += 12; ty--; }
  while (tm > 12) { tm -= 12; ty++; }
  const targetKey = `${ty}-${String(tm).padStart(2, '0')}`;
  const monthLabel = new Date(Date.UTC(ty, tm - 1, 15)).toLocaleDateString('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  // Deduped — the recurring-sync artefact used to show twin rows here.
  const sessions = dedupeSessions(client.sessions);
  const monthSessions = sessions
    .filter(s => dublinYearMonth(s.session_date) === targetKey)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());

  // At-a-glance numbers for the summary strip.
  const nowMs = Date.now();
  const activeSessions = sessions.filter(s => s.status !== 'cancelled');
  const pastCount = activeSessions.filter(s => new Date(s.session_date).getTime() <= nowMs).length;
  const outstandingCents = activeSessions
    .filter(s => s.payment_status !== 'paid' && s.payment_status !== 'refunded'
      && new Date(s.session_date).getTime() <= nowMs)
    .reduce((sum, s) => sum + (s.fee ?? 0), 0);
  const nextSession = activeSessions
    .filter(s => s.status === 'scheduled' && new Date(s.session_date).getTime() > nowMs)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())[0] ?? null;

  async function saveContact() {
    if (!client) return;
    setContactSaving(true);
    try {
      const res = await adminFetch('/api/admin/clients/update', {
        method: 'POST',
        body: JSON.stringify({
          client_id: client.id,
          email: contactFields.email,
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
      } else {
        const json = await res.json().catch(() => ({}));
        alert(json.error ?? 'Could not save contact details — please try again.');
      }
    } catch {
      alert('Network error — contact details were not saved.');
    } finally { setContactSaving(false); }
  }

  async function toggleClientFlag(patch: Record<string, unknown>) {
    if (!client) return;
    const res = await adminFetch('/api/admin/clients/update', {
      method: 'POST',
      body: JSON.stringify({ client_id: client.id, ...patch }),
    });
    if (res.ok) onReload();
  }

  async function downloadIntake() {
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

  async function deleteClient() {
    if (!client) return;
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
  }

  const action = nextAction(client);
  const actionPalette = {
    warn: { bg: 'rgba(200,90,27,0.10)', border: 'rgba(200,90,27,0.4)', fg: '#A04714' },
    info: { bg: 'rgba(212,168,67,0.12)', border: 'rgba(212,168,67,0.4)', fg: '#7a611f' },
    ok:   { bg: 'rgba(79,138,104,0.10)', border: 'rgba(79,138,104,0.35)', fg: '#2D5A42' },
  }[action.kind];

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(42,77,60,0.34)',
        backdropFilter: 'blur(3px)',
        zIndex: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'admin-fade-in 150ms ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--cream)',
          borderRadius: 22,
          width: 'min(640px, 100%)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 28px 70px rgba(42,77,60,0.30)',
          animation: 'admin-pop-in 180ms ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 22px',
          background: 'var(--forest-deep)',
          color: 'white',
          display: 'flex', alignItems: 'center', gap: 14,
          flexShrink: 0,
        }}>
          <Avatar name={client.full_name} size={46} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="pii" style={{
              fontFamily: 'var(--font-montserrat), Avenir, sans-serif',
              fontWeight: 300, fontSize: 21, color: 'white', letterSpacing: '0.4px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{client.full_name}</div>
            <div className="pii" style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {age != null ? `Age ${age} · ` : ''}{client.email}
            </div>
          </div>
          <button onClick={deleteClient} aria-label="Delete client" title="Delete client"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 6 }}>
            <Trash2 size={18} strokeWidth={1.8} />
          </button>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.9)', cursor: 'pointer', padding: 6 }}>
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Next action — one glanceable line */}
          <div style={{ padding: '11px 15px', borderRadius: 12, background: actionPalette.bg, border: `1px solid ${actionPalette.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: actionPalette.fg }}>
              {action.label}
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginLeft: 8 }}>{action.detail}</span>
          </div>

          {/* At a glance — next session, outstanding, history size */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10,
          }}>
            {[
              {
                label: 'Next session',
                value: nextSession ? formatDateTime(nextSession.session_date) : 'None booked',
                sub: nextSession ? (nextSession.session_format === 'in_person' ? 'In person' : 'Online') : null,
              },
              {
                label: 'Outstanding',
                value: outstandingCents > 0 ? `€${Math.round(outstandingCents / 100)}` : '€0',
                sub: outstandingCents > 0 ? 'past sessions unpaid' : 'all settled',
              },
              {
                label: 'Sessions to date',
                value: String(pastCount),
                sub: `since ${new Date(client.created_at).toLocaleDateString('en-IE', { month: 'short', year: 'numeric' })}`,
              },
            ].map(card => (
              <div key={card.label} style={{
                background: 'white', borderRadius: 12, padding: '10px 14px',
                border: '1px solid var(--line)',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink-muted)' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--forest-deep)', marginTop: 3 }}>
                  {card.value}
                </div>
                {card.sub && <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 1 }}>{card.sub}</div>}
              </div>
            ))}
          </div>

          {/* Sessions — this month, navigable */}
          <section>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => setMonthOffset(o => o - 1)} className="admin-btn-secondary" aria-label="Previous month" style={{ padding: '6px 8px' }}>
                  <ChevronLeft size={13} />
                </button>
                <div style={{ minWidth: 140, textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--forest-deep)' }}>{monthLabel}</div>
                <button onClick={() => setMonthOffset(o => o + 1)} className="admin-btn-secondary" aria-label="Next month" style={{ padding: '6px 8px' }}>
                  <ChevronRight size={13} />
                </button>
                {monthOffset !== 0 && (
                  <button onClick={() => setMonthOffset(0)} className="admin-btn-secondary" style={{ padding: '6px 10px', fontSize: 10 }}>This month</button>
                )}
              </div>
              {client.sessions.length > 0 && (
                <button
                  type="button"
                  onClick={() => downloadAdminPdf(
                    `/api/admin/receipts/statement?client_id=${client.id}`,
                    `statement-${client.full_name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
                  )}
                  className="admin-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: 10, marginLeft: 'auto' }}
                  title="Download a PDF statement of all this client's sessions"
                >
                  <Download size={11} strokeWidth={1.8} /> Statement
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {monthSessions.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: '4px 0', padding: '16px', textAlign: 'center', background: 'white', border: '1px solid var(--line)', borderRadius: 12 }}>
                  No sessions in {monthLabel}.
                </p>
              )}
              {monthSessions.map(s => (
                <div key={s.id} style={{ padding: '13px 15px', borderRadius: 12, background: 'white', border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 13, color: 'var(--forest-deep)', fontWeight: 500 }}>
                      {new Date(s.session_date).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' })}, {formatTime(s.session_date)}
                    </strong>
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                      {FORMAT_LABELS[s.session_format] ?? s.session_format} · {displayFee(s.fee)}
                    </span>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                      {s.payment_status === 'paid' && (
                        <button
                          type="button"
                          onClick={() => downloadAdminPdf(
                            `/api/admin/receipts?session_id=${s.id}`,
                            `receipt-${client.full_name.replace(/\s+/g, '-').toLowerCase()}-${new Date(s.session_date).toISOString().split('T')[0]}.pdf`,
                          )}
                          className="admin-btn-secondary"
                          style={{ padding: '5px 10px', fontSize: 10 }}
                          title="Download a receipt PDF for this session"
                        >
                          <Download size={11} strokeWidth={1.8} /> Receipt
                        </button>
                      )}
                      {onEditSession && (
                        <button type="button" onClick={() => onEditSession(s, client)} className="admin-btn-secondary" style={{ padding: '5px 10px', fontSize: 10 }}>
                          <Pencil size={11} strokeWidth={1.8} /> Edit
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    <span className={`admin-tag ${statusTag(s.status)}`}>{statusLabel(s.status)}</span>
                    <span className={`admin-tag ${payTag(s.payment_status)}`}>{payLabel(s.payment_status)}</span>
                    {s.receipt_sent_at && (
                      <span style={{ fontSize: 11, color: 'var(--ink-muted)', alignSelf: 'center' }}>· Receipt sent</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Details — collapsed by default */}
          <section>
            <button
              type="button"
              onClick={() => setShowDetails(v => !v)}
              aria-expanded={showDetails}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'white', border: '1px solid var(--line)', borderRadius: 12,
                padding: '12px 15px', cursor: 'pointer', fontFamily: 'inherit',
                color: 'var(--forest-deep)', fontSize: 13, fontWeight: 500,
              }}
            >
              Details &amp; contact
              <ChevronDown size={16} strokeWidth={2} style={{ transition: 'transform 200ms ease', transform: showDetails ? 'rotate(180deg)' : 'none', color: 'var(--ink-muted)' }} />
            </button>

            {showDetails && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 14 }}>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <Field label="Status" value={client.status} />
                  <Field label="Default fee" value={displayFee(client.session_fee)} />
                  <Field label="Joined" value={new Date(client.created_at).toLocaleDateString('en-IE')} />
                  <div>
                    <p className="admin-eyebrow" style={{ marginBottom: 4 }}>Pricing tier</p>
                    <button
                      type="button"
                      onClick={() => toggleClientFlag({ is_low_cost: !client.is_low_cost })}
                      className={`admin-tag ${client.is_low_cost ? 'admin-tag-new' : 'admin-tag-active'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                    >
                      {client.is_low_cost ? 'Low cost · click to unmark' : 'Full-paying · click to mark low cost'}
                    </button>
                  </div>
                  <div>
                    <p className="admin-eyebrow" style={{ marginBottom: 4 }}>Reminders</p>
                    <button
                      type="button"
                      onClick={() => toggleClientFlag({ reminders_opted_out: !client.reminders_opted_out })}
                      className={`admin-tag ${client.reminders_opted_out ? 'admin-tag-pause' : 'admin-tag-active'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      title="Click to toggle reminder emails"
                    >
                      {client.reminders_opted_out ? 'Opted out · click to re-enable' : 'On · click to opt out'}
                    </button>
                  </div>
                  {submission && (
                    <button onClick={downloadIntake} disabled={downloading} className="admin-btn-secondary" style={{ marginLeft: 'auto' }}>
                      <Download size={14} strokeWidth={1.8} />
                      {downloading ? 'Generating…' : 'Intake PDF'}
                    </button>
                  )}
                </div>

                <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <p className="admin-eyebrow" style={{ margin: 0 }}>Contact details</p>
                    {!editingContact ? (
                      <button type="button" onClick={() => { setEditingContact(true); setContactSaved(false); }} className="admin-btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }}>
                        <Pencil size={11} strokeWidth={1.8} /> Edit
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {contactSaved && <span style={{ fontSize: 11, color: 'var(--sage)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Check size={11} /> Saved</span>}
                        <button type="button" onClick={() => { setEditingContact(false); setContactFields(toContactFields(client)); }} className="admin-btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }}>Cancel</button>
                        <button type="button" onClick={saveContact} disabled={contactSaving} className="admin-btn-primary" style={{ padding: '6px 14px', fontSize: 11 }}>
                          {contactSaving ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pii" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
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
