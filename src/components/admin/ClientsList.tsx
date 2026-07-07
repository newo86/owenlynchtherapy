'use client';

import { useMemo, useState } from 'react';
import { Search, UsersRound, CalendarDays } from 'lucide-react';
import { Avatar } from './Avatar';
import { formatDate, formatTime, ageFromDob, clientDob } from './api';
import type { ClientRow, SessionRow, SubmissionRow } from './types';

interface Props {
  clients: ClientRow[];
  submissions: SubmissionRow[];
  onOpen: (c: ClientRow) => void;
  onNewClient: () => void;
  onScheduleSession?: () => void;
}

type Filter = 'all' | 'active' | 'new' | 'completed';

/** Soonest still-scheduled future session, or null. */
function upcomingSession(c: ClientRow): SessionRow | null {
  const now = new Date();
  const up = c.sessions
    .filter(s => s.status === 'scheduled' && new Date(s.session_date) > now)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  return up[0] ?? null;
}

export function ClientsList({ clients, submissions, onOpen, onNewClient, onScheduleSession }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const lower = q.trim().toLowerCase();
    return clients.filter(c => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (!lower) return true;
      return c.full_name.toLowerCase().includes(lower)
        || c.email.toLowerCase().includes(lower);
    });
  }, [clients, filter, q]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div className="admin-input-icon-wrap" style={{ flex: '1 1 280px', maxWidth: 420 }}>
          <Search size={16} strokeWidth={1.8} aria-hidden />
          <input
            type="text"
            placeholder="Search by name or email"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="admin-input"
          />
        </div>

        <div className="admin-segmented">
          {(['all', 'active', 'new', 'completed'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`admin-segmented-btn${filter === f ? ' is-active' : ''}`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button onClick={onScheduleSession} className="admin-btn-secondary" title="Schedule a session for an existing client">
            + Add
          </button>
          <button onClick={onNewClient} className="admin-btn-primary" title="Create a brand new client">
            + New
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 16px',
            borderRadius: '50%', background: 'var(--cream)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-muted)',
          }}>
            <UsersRound size={20} />
          </div>
          <p style={{ color: 'var(--forest-deep)', fontSize: 14, margin: 0 }}>
            {clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
          </p>
          {clients.length === 0 && (
            <p style={{ color: 'var(--ink-muted)', fontSize: 12, marginTop: 6 }}>
              Generate a new client link to get started
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))', gap: 12 }}>
          {filtered.map(c => {
            const up = upcomingSession(c);
            const age = ageFromDob(clientDob(c, submissions));
            return (
              <button
                key={c.id}
                onClick={() => onOpen(c)}
                className="admin-client-card"
                aria-label={`Open ${c.full_name}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={c.full_name} size={40} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      className="pii"
                      style={{
                        fontSize: 14, fontWeight: 500, color: 'var(--forest-deep)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                    >{c.full_name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2 }}>
                      {age != null ? `Age ${age}` : 'Age not on file'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontSize: 12, lineHeight: 1.4,
                    color: up ? 'var(--forest-deep)' : 'var(--ink-muted)',
                    borderTop: '1px solid var(--line-soft)', paddingTop: 9,
                  }}
                >
                  <CalendarDays size={13} strokeWidth={1.8} aria-hidden style={{ color: up ? 'var(--sage)' : 'var(--ink-muted)', flexShrink: 0 }} />
                  {up
                    ? <span><span style={{ color: 'var(--sage)', fontWeight: 500 }}>Next</span>&nbsp; {formatDate(up.session_date)}, {formatTime(up.session_date)}</span>
                    : <span>No upcoming session</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
