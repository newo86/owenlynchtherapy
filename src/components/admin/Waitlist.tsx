'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';
import { adminFetch } from './api';
import type { WaitlistRow } from './types';
import { WaitlistEmailModal } from './WaitlistEmailModal';

interface Props {
  waitlist: WaitlistRow[];
  onReload: () => void;
}

const FORMAT_LABEL: Record<string, string> = { online: 'Online', in_person: 'In person', either: 'Online or in person' };

function joinedWhen(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Dublin',
  });
}

export function Waitlist({ waitlist, onReload }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; kind: 'ok' | 'error'; msg: string } | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);

  async function act(id: string, action: 'contacted' | 'waiting' | 'spam' | 'delete') {
    if (action === 'delete'
        && !confirm('Remove this person from the waiting list? Their details are permanently deleted — this is how an erasure request is honoured.')) {
      return;
    }
    setBusyId(id);
    try {
      const res = await adminFetch('/api/admin/waitlist/update', {
        method: 'POST', body: JSON.stringify({ id, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setFeedback({ id, kind: 'error', msg: json.error ?? 'Failed — try again.' }); return; }
      if (action !== 'delete') {
        setFeedback({ id, kind: 'ok', msg: action === 'contacted' ? 'Marked contacted.' : action === 'spam' ? 'Moved to spam.' : 'Back to waiting.' });
      }
      onReload();
    } catch { setFeedback({ id, kind: 'error', msg: 'Network error — try again.' }); }
    finally { setBusyId(null); }
  }

  const waiting = waitlist.filter(w => w.status === 'waiting');
  // Sales pitches caught by the signup filter (lib/waitlistSpam.ts) — kept
  // out of the list, but never deleted automatically.
  const spam = waitlist.filter(w => w.status === 'spam');
  // Said "No, please take me off" to a waiting-list email: off the list, kept
  // only until removed.
  const declined = waitlist.filter(w => w.status === 'declined');
  const people = waitlist.filter(w => w.status !== 'spam' && w.status !== 'declined');
  // Online / in-person breakdown of who's waiting (only people who were asked).
  const byPref = (v: string) => waiting.filter(w => w.format_preference === v).length;
  const asked = waiting.filter(w => w.format_preference).length;
  const prefCounts = asked > 0
    ? `: ${byPref('online')} online, ${byPref('in_person')} in person, ${byPref('either')} either${asked < waiting.length ? `, ${waiting.length - asked} not asked` : ''}`
    : '';
  // Replies to the latest "Email the waiting list" message.
  const emailed = people.filter(w => w.last_emailed_at);
  const saidYes = emailed.filter(w => w.response === 'yes').length;
  const noReply = emailed.filter(w => !w.response).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'var(--forest-deep)' }}>
          {emailed.length > 0
            ? <>Last email: <strong>{emailed.length}</strong> sent · <strong>{saidYes}</strong> still interested · <strong>{declined.length}</strong> no longer looking · <strong>{noReply}</strong> no reply yet</>
            : <>No email sent to the list yet.</>}
        </div>
        <button className="admin-btn-primary" onClick={() => setEmailOpen(true)} disabled={waiting.length === 0}>
          Email the waiting list
        </button>
      </div>
      {emailOpen && (
        <WaitlistEmailModal recipientCount={waiting.length} onClose={() => setEmailOpen(false)} onSent={onReload} />
      )}

      <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0, maxWidth: 640 }}>
        People who asked to be contacted when a space opens up ({waiting.length} waiting{prefCounts}).
        <span className="admin-hide-phone"> Entries store only name, email and phone, with their consent recorded. &ldquo;Remove&rdquo;
        deletes the details permanently — use it once someone becomes a client, asks to be
        taken off, or the entry goes stale.</span>
      </p>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Joined</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' as const }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {people.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' as const, padding: 28, color: 'var(--ink-muted)' }}>
                  No one on the waiting list yet. The signup form is on the contact page.
                </td>
              </tr>
            )}
            {people.map(w => (
              <tr key={w.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={w.full_name} size={32} />
                    <div className="pii" style={{ fontWeight: 500, color: 'var(--forest-deep)' }}>{w.full_name}</div>
                    {w.format_preference && (
                      <span className="admin-tag" title="What they asked for on the sign-up form" style={{ fontSize: 10.5 }}>
                        {FORMAT_LABEL[w.format_preference] ?? w.format_preference}
                      </span>
                    )}
                  </div>
                  {w.reason && (
                    <div
                      className="pii"
                      style={{
                        fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 6,
                        whiteSpace: 'pre-wrap', maxWidth: 340, lineHeight: 1.5,
                        paddingLeft: 42,
                      }}
                    >
                      &ldquo;{w.reason}&rdquo;
                    </div>
                  )}
                </td>
                <td data-label="Contact">
                  <div className="pii" style={{ fontSize: 12 }}>{w.email}</div>
                  {w.phone && <div className="pii" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{w.phone}</div>}
                </td>
                <td data-label="Joined" style={{ whiteSpace: 'nowrap' as const, fontSize: 12 }}>{joinedWhen(w.created_at)}</td>
                <td data-label="Status">
                  <span className={`admin-tag ${w.status === 'contacted' ? 'admin-tag-paid' : 'admin-tag-scheduled'}`}>
                    {w.status === 'contacted' ? 'Contacted' : 'Waiting'}
                  </span>
                  {w.contacted_at && (
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--sd-rail)', marginTop: 3 }}>
                      {joinedWhen(w.contacted_at)}
                    </span>
                  )}
                  {w.last_emailed_at && (
                    <span style={{ display: 'block', fontSize: 11, marginTop: 4, color: w.response === 'yes' ? 'var(--sd-rail)' : 'var(--ink-muted)' }}>
                      Emailed {joinedWhen(w.last_emailed_at)}
                      {' · '}
                      {w.response === 'yes'
                        ? <strong>Still interested{w.responded_at ? ` (${joinedWhen(w.responded_at)})` : ''}</strong>
                        : 'No reply yet'}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right' as const }}>
                  <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {w.status === 'waiting' ? (
                      <button onClick={() => act(w.id, 'contacted')} disabled={busyId === w.id} className="admin-btn-secondary">
                        Mark contacted
                      </button>
                    ) : (
                      <button onClick={() => act(w.id, 'waiting')} disabled={busyId === w.id} className="admin-btn-secondary">
                        Back to waiting
                      </button>
                    )}
                    <button onClick={() => act(w.id, 'spam')} disabled={busyId === w.id} className="admin-btn-secondary" title="A sales pitch, not someone looking for therapy">
                      Spam
                    </button>
                    <button onClick={() => act(w.id, 'delete')} disabled={busyId === w.id} className="admin-btn-secondary">
                      Remove
                    </button>
                  </div>
                  {feedback?.id === w.id && (
                    <div style={{
                      marginTop: 8, fontSize: 11,
                      color: feedback.kind === 'ok' ? 'var(--sd-rail)' : 'var(--sd-danger)',
                    }}>
                      {feedback.msg}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {declined.length > 0 && (
        <details open style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px', background: 'white' }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--forest-deep)' }}>
            No longer looking ({declined.length}): they answered &ldquo;No, please take me off&rdquo;. Remove deletes their details.
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {declined.map(w => (
              <div key={w.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div className="pii" style={{ fontSize: 13, color: 'var(--forest-deep)' }}>
                  {w.full_name} · <span style={{ color: 'var(--ink-muted)' }}>{w.email}</span>
                  {w.responded_at && <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}> · said no {joinedWhen(w.responded_at)}</span>}
                </div>
                <div style={{ display: 'inline-flex', gap: 6 }}>
                  <button
                    onClick={() => {
                      if (confirm(`${w.full_name.split(' ')[0]} said they're no longer looking. Put them back on the waiting list anyway? Only do this if they've asked you to.`)) void act(w.id, 'waiting');
                    }}
                    disabled={busyId === w.id}
                    className="admin-btn-secondary"
                  >Back to waiting</button>
                  <button onClick={() => act(w.id, 'delete')} disabled={busyId === w.id} className="admin-btn-secondary">Remove</button>
                </div>
                {feedback?.id === w.id && (
                  <div style={{ width: '100%', fontSize: 11, color: feedback.kind === 'ok' ? 'var(--sd-rail)' : 'var(--sd-danger)' }}>{feedback.msg}</div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {spam.length > 0 && (
        <details style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px', background: 'white' }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--ink-muted)' }}>
            Likely spam ({spam.length}): sales pitches caught by the signup form, with no email sent to you. Check now and then that no real person is in here.
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
            {spam.map(w => (
              <div key={w.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div className="pii" style={{ fontSize: 13, color: 'var(--forest-deep)' }}>
                    {w.full_name} · <span style={{ color: 'var(--ink-muted)' }}>{w.email}</span> · <span style={{ color: 'var(--ink-muted)', fontSize: 12 }}>{joinedWhen(w.created_at)}</span>
                  </div>
                  <div style={{ display: 'inline-flex', gap: 6 }}>
                    <button onClick={() => act(w.id, 'waiting')} disabled={busyId === w.id} className="admin-btn-secondary">Not spam</button>
                    <button onClick={() => act(w.id, 'delete')} disabled={busyId === w.id} className="admin-btn-secondary">Remove</button>
                  </div>
                </div>
                {w.reason && (
                  <div className="pii" style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                    &ldquo;{w.reason}&rdquo;
                  </div>
                )}
                {feedback?.id === w.id && (
                  <div style={{ marginTop: 6, fontSize: 11, color: feedback.kind === 'ok' ? 'var(--sd-rail)' : 'var(--sd-danger)' }}>{feedback.msg}</div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
