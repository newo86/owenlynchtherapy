'use client';

// "Google Calendar doesn't match the app": the list of differences between the
// app (the diary) and Google (its mirror). Nothing here changes by itself.
// Each line says what differs in plain words and offers the two sensible
// choices as buttons; the server re-checks every choice before acting.

import { useState } from 'react';
import { utcToDublinLocal } from '@/lib/dateUtils';
import type { DriftItem, DriftKind } from '@/lib/calendarDrift';
import type { FixChoice } from '@/lib/calendarFix';
import { adminFetch } from './api';

const SHOW_FIRST = 4;

function when(iso?: string): string {
  if (!iso) return '';
  const local = utcToDublinLocal(new Date(iso).toISOString());
  const [y, m, d] = local.slice(0, 10).split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const [h, min] = local.slice(11, 16).split(':').map(Number);
  const t = `${h % 12 || 12}${min ? ':' + String(min).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
  return `${day}, ${t}`;
}

const COPY: Record<DriftKind, {
  line: (i: DriftItem) => string;
  actions: Array<{ choice: FixChoice; label: string }>;
}> = {
  not_in_google: {
    line: i => `${when(i.appStart)}: in the app, but not in Google Calendar.`,
    actions: [{ choice: 'add_to_google', label: 'Add to Google' }, { choice: 'cancel_in_app', label: 'Cancel it here' }],
  },
  moved_in_google: {
    line: i => `Google has it at ${when(i.googleStart)}. The app says ${when(i.appStart)}. Your client isn't told either way.`,
    actions: [{ choice: 'keep_google', label: "Use Google's time" }, { choice: 'reset_google', label: 'Put Google back' }],
  },
  cancelled_still_in_google: {
    line: i => `${when(i.appStart)}: cancelled here, still in Google Calendar.`,
    actions: [{ choice: 'remove_from_google', label: 'Remove from Google' }, { choice: 'restore_in_app', label: 'Bring it back here' }],
  },
  only_in_google: {
    line: i => `${when(i.googleStart)}: in Google Calendar, not in the app.`,
    actions: [{ choice: 'add_to_app', label: 'Add to the app' }, { choice: 'remove_from_google', label: 'Remove from Google' }],
  },
};

interface Props {
  items: DriftItem[];
  /** Reload the dashboard after a choice is applied. */
  onResolved: () => void;
  /** Phone: a one-line banner that opens on tap, so it never pushes today's
   *  clients off the first screen. */
  compact?: boolean;
  /** Desktop "Needs a decision": no card of its own, a smaller heading. */
  bare?: boolean;
  /** Desktop: show at most this many differences (no "show more" here). */
  limit?: number;
}

export function CalendarDriftCard({ items, onResolved, compact = false, bare = false, limit }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<{ key: string; msg: string } | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState(false);

  if ((items.length === 0 || limit === 0) && !done) return null;
  const shown = limit !== undefined ? items.slice(0, limit) : all ? items : items.slice(0, SHOW_FIRST);
  const collapsed = compact && !open && items.length > 0;

  async function apply(item: DriftItem, choice: FixChoice) {
    setBusy(item.key + choice);
    setProblem(null);
    try {
      const res = await adminFetch('/api/admin/calendar/fix', { method: 'POST', body: JSON.stringify({ key: item.key, choice }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setDone(json.message ?? 'Done.');
        window.setTimeout(() => setDone(null), 6000);
        onResolved();
      } else if (json.resolved) {
        onResolved();                      // already changed elsewhere: just refresh
      } else {
        setProblem({ key: item.key, msg: json.message ?? json.error ?? 'That did not work. Nothing was changed.' });
      }
    } catch {
      setProblem({ key: item.key, msg: 'No connection. Nothing was changed.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={`${bare ? 'is-bare' : 'admin-card'} drift-card${collapsed ? ' is-collapsed' : ''}`} aria-label="Differences between the app and Google Calendar">
      {collapsed ? (
        <button type="button" className="drift-banner" onClick={() => setOpen(true)}>
          <span className="drift-banner-dot" aria-hidden />
          <span>{items.length} {items.length === 1 ? 'difference' : 'differences'} with Google</span>
          <span className="drift-banner-go">Review</span>
        </button>
      ) : items.length > 0 && (
        <>
          {!bare && (
            <>
              <div className="admin-card-head">
                <h2 className="admin-h2">Google Calendar doesn&apos;t match the app</h2>
              </div>
              <p className="drift-note">
                The app is your diary. Choose what to do with each one; nothing changes until you tap.
              </p>
            </>
          )}
        </>
      )}
      {done && <p className="drift-done" role="status">{done}</p>}
      {!collapsed && <ul className="drift-list">
        {shown.map(i => (
          <li key={i.key} className={`drift-item${bare ? ' is-notice' : ''}`}>
            {bare && <span className="dt-ndot" aria-hidden />}
            <div className={bare ? 'dt-notice-body' : undefined}>
            <p className="drift-line"><b className="pii">{i.clientName}</b> · {COPY[i.kind].line(i)}</p>
            <div className="drift-actions">
              {COPY[i.kind].actions.map(a => (
                <button
                  key={a.choice}
                  type="button"
                  className={bare ? 'dt-btn' : 'admin-btn-secondary'}
                  disabled={busy !== null}
                  onClick={() => void apply(i, a.choice)}
                >
                  {busy === i.key + a.choice ? 'Working…' : a.label}
                </button>
              ))}
            </div>
            {problem?.key === i.key && <p className="drift-problem" role="alert">{problem.msg}</p>}
            </div>
          </li>
        ))}
      </ul>}
      {!collapsed && limit === undefined && items.length > SHOW_FIRST && (
        <button type="button" className="admin-link" onClick={() => setAll(a => !a)}>
          {all ? 'Show fewer' : `Show ${items.length - SHOW_FIRST} more`}
        </button>
      )}
      {compact && open && items.length > 0 && (
        <button type="button" className="admin-link" onClick={() => setOpen(false)}>Hide</button>
      )}
    </section>
  );
}
