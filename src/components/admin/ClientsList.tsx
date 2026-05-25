'use client';

import { useMemo, useState } from 'react';
import { Search, UsersRound } from 'lucide-react';
import { Avatar } from './Avatar';
import { displayFee, formatDate } from './api';
import { FORMAT_LABELS } from './types';
import type { ClientRow, SessionRow } from './types';

interface Props {
  clients: ClientRow[];
  onOpen: (c: ClientRow) => void;
  onNewClient: () => void;
  onScheduleSession?: () => void;
}

type Filter = 'all' | 'active' | 'new' | 'completed';

function nextSession(c: ClientRow): SessionRow | null {
  const now = new Date();
  const upcoming = c.sessions
    .filter(s => s.status === 'scheduled' && new Date(s.session_date) > now)
    .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime());
  if (upcoming.length) return upcoming[0];
  return c.sessions
    .slice()
    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0] ?? null;
}

export function ClientsList({ clients, onOpen, onNewClient, onScheduleSession }: Props) {
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
          <button
            onClick={onScheduleSession}
            className="admin-btn-secondary"
            title="Schedule a session for an existing client"
          >
            + Add
          </button>
          <button
            onClick={onNewClient}
            className="admin-btn-primary"
            title="Create a brand new client"
          >
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => {
            const s = nextSession(c);
            const paymentTag = !s ? null
              : s.payment_status === 'paid' ? 'admin-tag-paid'
              : s.payment_status === 'refunded' ? 'admin-tag-scheduled'
              : 'admin-tag-unpaid';
            const paymentLabel = !s ? null
              : s.payment_status === 'paid' ? 'Paid'
              : s.payment_status === 'refunded' ? 'Refunded'
              : 'Unpaid';

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(c)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(c); }}
                className="admin-card"
                style={{
                  padding: '18px 22px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 2.5fr 2fr 1fr 1fr auto',
                  gap: 18,
                  alignItems: 'center',
                  cursor: 'pointer',
                  borderRadius: 16,
                }}
              >
                <Avatar name={c.full_name} size={42} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--forest-deep)' }}>{c.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{c.email}</div>
                </div>

                <div>
                  {s ? (
                    <>
                      <div style={{ fontSize: 13, color: 'var(--forest-deep)' }}>{formatDate(s.session_date)}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                        {FORMAT_LABELS[s.session_format] ?? s.session_format} · {displayFee(s.fee)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>—</div>
                  )}
                </div>

                <div>
                  {paymentTag && paymentLabel && (
                    <span className={`admin-tag ${paymentTag}`}>{paymentLabel}</span>
                  )}
                </div>

                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  {c.sessions.length} session{c.sessions.length === 1 ? '' : 's'}
                </div>

                <button
                  onClick={e => { e.stopPropagation(); onOpen(c); }}
                  className="admin-btn-secondary"
                >View</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
