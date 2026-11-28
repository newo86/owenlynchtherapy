'use client';

// "Followed from Google": the changes the app copied from Google Calendar by
// itself (an occurrence or a series deleted there, a repeat changed there),
// each with Undo for 7 days. Purely presentational so it renders on the
// dev-only /admin-demo page with fake data; loading and undoing live in
// FollowedFromGooglePanel. Hidden when there is nothing to show.

import type { FollowedItem } from '@/lib/followGoogle';

interface Props {
  items: FollowedItem[];
  onUndo: (id: string) => void;
  /** Id currently being undone. */
  busy?: string | null;
  /** Result of the last undo, shown above the list. */
  message?: { kind: 'ok' | 'alert'; text: string } | null;
}

export function FollowedFromGoogleCard({ items, onUndo, busy = null, message = null }: Props) {
  const shown = items.filter(i => !i.undone);
  if (shown.length === 0 && !message) return null;
  return (
    <section className="admin-card fg-card" aria-label="Changes followed from Google Calendar">
      <div className="admin-card-head">
        <h2 className="admin-h2">Followed from Google</h2>
      </div>
      <p className="fg-note">You changed these in Google Calendar, so the app did the same. No client was emailed.</p>
      {message && (
        <p className={message.kind === 'ok' ? 'fg-done' : 'fg-problem'} role={message.kind === 'ok' ? 'status' : 'alert'}>{message.text}</p>
      )}
      {shown.length > 0 && (
        <ul className="fg-list">
          {shown.map(i => (
            <li key={i.id} className="fg-item">
              <p className="fg-line pii">{i.line}</p>
              {i.canUndo && (
                <button
                  type="button"
                  className="admin-btn-secondary fg-btn"
                  disabled={busy !== null}
                  aria-label={`Undo: ${i.line}`}
                  onClick={() => onUndo(i.id)}
                >
                  {busy === i.id ? 'Undoing…' : 'Undo'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
