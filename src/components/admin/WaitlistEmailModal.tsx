'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { adminFetch } from './api';
import {
  DEFAULT_WAITLIST_MESSAGE, DEFAULT_WAITLIST_SUBJECT, MAX_MESSAGE, MAX_SUBJECT,
  hasButtons, messageBlocks,
} from '@/lib/waitlistMessage';

interface Props {
  /** People who would receive it (status 'waiting'). */
  recipientCount: number;
  onClose: () => void;
  onSent: () => void;
}

/** "Email the waiting list": write or edit a short message, send yourself a
 *  test, then send it to everyone waiting — one private email each. */
export function WaitlistEmailModal({ recipientCount, onClose, onSent }: Props) {
  const [subject, setSubject] = useState(DEFAULT_WAITLIST_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_WAITLIST_MESSAGE);
  const [busy, setBusy] = useState<'test' | 'send' | null>(null);
  const [result, setResult] = useState<{ kind: 'ok' | 'error'; msg: string } | null>(null);

  async function send(test: boolean) {
    if (!test && !confirm(`Send this email to ${recipientCount} ${recipientCount === 1 ? 'person' : 'people'} on your waiting list? Each person gets their own private copy.`)) return;
    setBusy(test ? 'test' : 'send');
    setResult(null);
    try {
      const res = await adminFetch('/api/admin/waitlist/email', {
        method: 'POST',
        body: JSON.stringify({ subject, message, test }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setResult({ kind: 'error', msg: json.error ?? 'Not sent. Please try again.' }); return; }
      if (test) {
        setResult({ kind: 'ok', msg: `Test sent to ${json.to}. Its buttons don't do anything; the real ones will.` });
        return;
      }
      const parts = [`Sent to ${json.sent} ${json.sent === 1 ? 'person' : 'people'}.`];
      if (json.skipped_recent) parts.push(`${json.skipped_recent} skipped (already emailed in the last 12 hours).`);
      if (json.failed) parts.push(`${json.failed} couldn't be sent.`);
      if (json.unrecorded) parts.push(`${json.unrecorded} emailed, but their reply buttons won't record an answer (a database error), so check with them by hand.`);
      if (json.remaining) parts.push(`${json.remaining} still to go: press Send again to continue.`);
      setResult({ kind: json.failed || json.unrecorded ? 'error' : 'ok', msg: parts.join(' ') });
      onSent();
    } catch {
      setResult({ kind: 'error', msg: 'Network error. Please try again.' });
    } finally {
      setBusy(null);
    }
  }

  const preview = messageBlocks(message, 'Jane');
  const buttons = hasButtons(message);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(42,77,60,0.32)', backdropFilter: 'blur(3px)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Email the waiting list"
        style={{ background: 'white', borderRadius: 22, padding: '26px 28px', width: 880, maxWidth: '100%', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxShadow: '0 24px 64px rgba(42,77,60,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
          <div>
            <p className="admin-eyebrow">Waiting list</p>
            <h2 className="admin-h3" style={{ margin: '4px 0 6px' }}>Email the waiting list</h2>
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0, lineHeight: 1.5 }}>
              Goes to the {recipientCount} {recipientCount === 1 ? 'person' : 'people'} currently waiting, one private email each.
              Written replies come to your inbox; button answers show on the Waitlist page.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink-muted)', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label className="admin-label" htmlFor="wl-subject">Subject</label>
            <input id="wl-subject" className="admin-input" value={subject} maxLength={MAX_SUBJECT} onChange={e => setSubject(e.target.value)} />
            <label className="admin-label" htmlFor="wl-message">Message</label>
            <textarea id="wl-message" className="admin-input" value={message} maxLength={MAX_MESSAGE} onChange={e => setMessage(e.target.value)} rows={16} style={{ fontFamily: 'inherit', lineHeight: 1.55, resize: 'vertical' }} />
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: 0, lineHeight: 1.5 }}>
              <strong>[first name]</strong> becomes each person&rsquo;s first name. <strong>[buttons]</strong> on its own line adds
              &ldquo;Yes, keep me on the list&rdquo; / &ldquo;No, please take me off&rdquo;; take it out for a message without them.
            </p>
            <button type="button" className="admin-btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={() => { setSubject(DEFAULT_WAITLIST_SUBJECT); setMessage(DEFAULT_WAITLIST_MESSAGE); }}>
              Reset to the check-in email
            </button>
          </div>

          <div>
            <p className="admin-label" style={{ margin: '0 0 8px' }}>Preview (for &ldquo;Jane&rdquo;)</p>
            <div style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '18px 20px', background: '#FAF7F2' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest-deep)', margin: '0 0 14px' }}>{subject || '(no subject)'}</p>
              {preview.map((b, i) => b.kind === 'buttons' ? (
                <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '4px 0 14px' }}>
                  <span style={{ background: 'var(--terracotta)', color: 'white', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Yes, keep me on the list</span>
                  <span style={{ border: '1px solid var(--forest-deep)', color: 'var(--forest-deep)', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>No, please take me off</span>
                </div>
              ) : (
                <p key={i} style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: '0 0 12px', whiteSpace: 'pre-line' }}>{b.lines.join('\n')}</p>
              ))}
              {!buttons && (
                <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', margin: 0 }}>No [buttons] line: this message won&rsquo;t ask for a yes/no answer.</p>
              )}
            </div>
          </div>
        </div>

        {result && (
          <div style={{
            marginTop: 18, padding: '12px 16px', borderRadius: 10, fontSize: 13,
            background: result.kind === 'ok' ? 'rgba(79,138,104,0.10)' : 'rgba(200,90,27,0.10)',
            border: `1px solid ${result.kind === 'ok' ? 'rgba(79,138,104,0.35)' : 'rgba(200,90,27,0.4)'}`,
            color: result.kind === 'ok' ? '#2D5A42' : '#A04714',
          }}>{result.msg}</div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 20 }}>
          <button onClick={onClose} className="admin-btn-secondary" disabled={busy !== null}>Close</button>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button onClick={() => void send(true)} className="admin-btn-secondary" disabled={busy !== null || !subject.trim() || !message.trim()}>
              {busy === 'test' ? 'Sending…' : 'Send a test to me'}
            </button>
            <button onClick={() => void send(false)} className="admin-btn-primary" disabled={busy !== null || recipientCount === 0 || !subject.trim() || !message.trim()}>
              {busy === 'send' ? 'Sending…' : `Send to ${recipientCount} ${recipientCount === 1 ? 'person' : 'people'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
