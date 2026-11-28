'use client';

// "Followed from Google": the changes the app copied from Google Calendar by
// itself (an occurrence or a series deleted there, a repeat changed there),
// each with Undo for 7 days. Purely presentational so it renders on the
// dev-only /admin-demo page with fake data; loading and undoing live in
// FollowedFromGooglePanel. Hidden when there is nothing to show.
//
// Phone (`compact`): Undo is a quiet text button, and at most two rows show
// until "Show all".

import { useEffect, useId, useRef, useState } from 'react';
import type { FollowedItem } from '@/lib/followGoogle';

const COMPACT_ROWS = 2;

interface Props {
  items: FollowedItem[];
  onUndo: (id: string) => void;
  /** Id currently being undone. */
  busy?: string | null;
  /** Result of the last undo, shown above the list (and given focus). */
  message?: { kind: 'ok' | 'alert'; text: string } | null;
  compact?: boolean;
  /** Desktop "Needs a decision": no card of its own, a smaller heading. */
  bare?: boolean;
}

export function FollowedFromGoogleCard({ items, onUndo, busy = null, message = null, compact = false, bare = false }: Props) {
  const headingId = useId();
  const msgRef = useRef<HTMLParagraphElement>(null);
  const [all, setAll] = useState(false);

  // After an Undo the row disappears; move focus to the result so keyboard
  // and screen-reader users aren't left on nothing.
  useEffect(() => { if (message) msgRef.current?.focus(); }, [message]);

  const open = items.filter(i => !i.undone);
  if (open.length === 0 && !message) return null;
  const shown = compact && !all ? open.slice(0, COMPACT_ROWS) : open;

  return (
    <section className={`${bare ? 'is-bare' : 'admin-card'} fg-card${compact ? ' is-compact' : ''}`} aria-labelledby={headingId}>
      {bare ? (
        <h3 className="nd-sub" id={headingId}>Followed from Google</h3>
      ) : (
        <div className="admin-card-head">
          <h2 className="admin-h2" id={headingId}>Followed from Google</h2>
        </div>
      )}
      <p className="fg-note">You changed these in Google Calendar, so the app did the same. No client was emailed.</p>
      {message && (
        <p
          ref={msgRef}
          tabIndex={-1}
          className={message.kind === 'ok' ? 'fg-done' : 'fg-problem'}
          role={message.kind === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      )}
      {shown.length > 0 && (
        <ul className="fg-list">
          {shown.map(i => (
            <li key={i.id} className="fg-item">
              <p className="fg-line pii">{i.line}</p>
              {i.canUndo && (
                <button
                  type="button"
                  className={compact ? 'fg-btn fg-btn-quiet' : 'admin-btn-secondary fg-btn'}
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
      {compact && open.length > COMPACT_ROWS && (
        <button type="button" className="admin-link fg-more" onClick={() => setAll(a => !a)} aria-expanded={all}>
          {all ? 'Show fewer' : `Show all (${open.length})`}
        </button>
      )}
    </section>
  );
}
