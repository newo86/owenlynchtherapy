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

const PAYMENT_TONES = {
  paid:     { bg: 'rgba(79,138,104,0.2)',  fg: '#A6E3BD', border: 'rgba(79,138,104,0.35)', label: 'Paid' },
  unpaid:   { bg: 'rgba(200,90,26,0.22)',  fg: '#F4956A', border: 'rgba(200,90,26,0.4)',   label: 'Unpaid' },
  refunded: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.15)', label: 'Refunded' },
};

export function ClientsList({ clients, onOpen, onNewClient }: Props) {
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

        <button onClick={onNewClient} className="admin-btn-primary" style={{ marginLeft: 'auto' }}>
          + New Client
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-glass" style={{
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, margin: '0 auto 16px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.3)',
          }}>
            <UsersRound size={20} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 300, margin: 0 }}>
            {clients.length === 0 ? 'No clients yet' : 'No clients match your search'}
          </p>
          {clients.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: 12, marginTop: 6 }}>
              Generate a new client link to get started
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(c => {
            const s = nextSession(c);
            const payment = s
              ? (s.payment_status === 'paid' ? 'paid'
                : s.payment_status === 'refunded' ? 'refunded' : 'unpaid')
              : null;

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(c)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(c); }}
                className="admin-glass admin-glass-hover"
                style={{
                  padding: '18px 22px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 2.5fr 2fr 1fr 1fr auto',
                  gap: 18,
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <Avatar name={c.full_name} size={42} />

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'white' }}>{c.full_name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{c.email}</div>
                </div>

                <div>
                  {s ? (
                    <>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{formatDate(s.session_date)}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
                        {FORMAT_LABELS[s.session_format] ?? s.session_format} · {displayFee(s.fee)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>—</div>
                  )}
                </div>

                <div>
                  {payment && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '3px 8px',
                      borderRadius: 5,
                      background: PAYMENT_TONES[payment].bg,
                      color: PAYMENT_TONES[payment].fg,
                      border: `1px solid ${PAYMENT_TONES[payment].border}`,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}>{PAYMENT_TONES[payment].label}</span>
                  )}
                </div>

                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  {c.sessions.length} session{c.sessions.length === 1 ? '' : 's'}
                </div>

                <button
                  onClick={e => { e.stopPropagation(); onOpen(c); }}
                  className="admin-btn-ghost"
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
