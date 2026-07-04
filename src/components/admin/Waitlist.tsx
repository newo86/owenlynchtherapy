'use client';

import { useState } from 'react';
import { Avatar } from './Avatar';
import { adminFetch } from './api';
import type { WaitlistRow } from './types';

interface Props {
  waitlist: WaitlistRow[];
  onReload: () => void;
}

function joinedWhen(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Dublin',
  });
}

export function Waitlist({ waitlist, onReload }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; kind: 'ok' | 'error'; msg: string } | null>(null);

  async function act(id: string, action: 'contacted' | 'waiting' | 'delete') {
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
        setFeedback({ id, kind: 'ok', msg: action === 'contacted' ? 'Marked contacted.' : 'Back to waiting.' });
      }
      onReload();
    } catch { setFeedback({ id, kind: 'error', msg: 'Network error — try again.' }); }
    finally { setBusyId(null); }
  }

  const waiting = waitlist.filter(w => w.status === 'waiting');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0, maxWidth: 640 }}>
        People who asked to be contacted when a space opens up ({waiting.length} waiting).
        Entries store only name, email and phone, with their consent recorded. &ldquo;Remove&rdquo;
        deletes the details permanently — use it once someone becomes a client, asks to be
        taken off, or the entry goes stale.
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
            {waitlist.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' as const, padding: 28, color: 'var(--ink-muted)' }}>
                  No one on the waiting list yet. The signup form is on the contact page.
                </td>
              </tr>
            )}
            {waitlist.map(w => (
              <tr key={w.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={w.full_name} size={32} />
                    <div className="pii" style={{ fontWeight: 500, color: 'var(--forest-deep)' }}>{w.full_name}</div>
                  </div>
                </td>
                <td>
                  <div className="pii" style={{ fontSize: 12 }}>{w.email}</div>
                  {w.phone && <div className="pii" style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{w.phone}</div>}
                </td>
                <td style={{ whiteSpace: 'nowrap' as const, fontSize: 12 }}>{joinedWhen(w.created_at)}</td>
                <td>
                  <span className={`admin-tag ${w.status === 'contacted' ? 'admin-tag-paid' : 'admin-tag-scheduled'}`}>
                    {w.status === 'contacted' ? 'Contacted' : 'Waiting'}
                  </span>
                  {w.contacted_at && (
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--sage)', marginTop: 3 }}>
                      {joinedWhen(w.contacted_at)}
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right' as const }}>
                  <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {w.status === 'waiting' ? (
                      <button onClick={() => act(w.id, 'contacted')} disabled={busyId === w.id} className="admin-btn-primary" style={{ padding: '8px 14px', fontSize: 10 }}>
                        Mark contacted
                      </button>
                    ) : (
                      <button onClick={() => act(w.id, 'waiting')} disabled={busyId === w.id} className="admin-btn-secondary">
                        Back to waiting
                      </button>
                    )}
                    <button onClick={() => act(w.id, 'delete')} disabled={busyId === w.id} className="admin-btn-secondary">
                      Remove
                    </button>
                  </div>
                  {feedback?.id === w.id && (
                    <div style={{
                      marginTop: 8, fontSize: 11,
                      color: feedback.kind === 'ok' ? 'var(--sage)' : 'var(--terracotta)',
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
    </div>
  );
}
