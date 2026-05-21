'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { colors, fonts, shadows, input as inputStyle } from './theme';
import { Avatar } from './Avatar';
import { Badge } from './Badge';
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
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
          <Search
            size={16}
            strokeWidth={1.8}
            color={colors.textMuted}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            aria-hidden
          />
          <input
            type="text"
            placeholder="Search by name or email"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>

        <div style={{ display: 'flex', gap: 4, padding: 4, background: colors.white, borderRadius: 6, border: `1px solid ${colors.border}` }}>
          {(['all', 'active', 'new', 'completed'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px',
                background: filter === f ? colors.forest : 'transparent',
                color: filter === f ? colors.white : colors.forest,
                border: 'none',
                borderRadius: 4,
                fontFamily: fonts.sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 150ms ease, color 150ms ease',
              }}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={onNewClient}
          style={{
            marginLeft: 'auto',
            padding: '9px 18px',
            background: colors.terracotta,
            color: colors.white,
            border: 'none',
            borderRadius: 6,
            fontFamily: fonts.sans,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          + New Client
        </button>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{
          background: colors.white,
          borderRadius: 8,
          borderTop: `3px solid ${colors.gold}`,
          boxShadow: shadows.card,
          padding: '32px 24px',
          textAlign: 'center',
          color: colors.textMuted,
          fontFamily: fonts.sans,
          fontSize: 14,
        }}>
          {clients.length === 0 ? 'No clients yet.' : 'No clients match your search.'}
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
                style={{
                  background: colors.white,
                  borderRadius: 8,
                  borderTop: `3px solid ${colors.gold}`,
                  boxShadow: shadows.card,
                  padding: '16px 20px',
                  display: 'grid',
                  gridTemplateColumns: 'auto 2.5fr 2fr 1fr 1fr auto',
                  gap: 18,
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'box-shadow 150ms ease, transform 150ms ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.cardHover;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = shadows.card;
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                }}
              >
                <Avatar name={c.full_name} size={42} />

                <div>
                  <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 15, color: colors.forest }}>
                    {c.full_name}
                  </div>
                  <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {c.email}
                  </div>
                </div>

                <div>
                  {s ? (
                    <>
                      <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.text }}>
                        {formatDate(s.session_date)}
                      </div>
                      <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        {FORMAT_LABELS[s.session_format] ?? s.session_format} · {displayFee(s.fee)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.textFaint }}>—</div>
                  )}
                </div>

                <div>
                  {payment && <Badge kind={payment} />}
                </div>

                <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted }}>
                  {c.sessions.length} session{c.sessions.length === 1 ? '' : 's'}
                </div>

                <div>
                  <button
                    onClick={e => { e.stopPropagation(); onOpen(c); }}
                    style={{
                      padding: '7px 14px',
                      background: 'transparent',
                      color: colors.forest,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 5,
                      fontFamily: fonts.sans,
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: '1.2px',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
