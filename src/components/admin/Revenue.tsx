'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, Video, MapPin, Wallet } from 'lucide-react';
import { startOfWeek } from './api';
import type { ClientRow, SessionRow } from './types';

interface Props {
  clients: ClientRow[];
}

type Scope = 'week' | 'month' | 'year' | 'all';

const ROOM_COST_CENTS = 2000; // €20 deducted from each in-person session for the room

// ── Helpers ────────────────────────────────────────────────────────────────

function startOfMonth(now = new Date()): Date {
  const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}
function startOfYear(now = new Date()): Date {
  return new Date(now.getFullYear(), 0, 1);
}
function inScope(iso: string, scope: Scope, now: Date): boolean {
  const d = new Date(iso);
  if (scope === 'all') return true;
  if (scope === 'week') {
    const monday = startOfWeek(now);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 7);
    return d >= monday && d < sunday;
  }
  if (scope === 'month') return d >= startOfMonth(now);
  return d >= startOfYear(now);
}

/** Net cents for a single session — subtract the €20 room cost for in-person. */
function netCents(s: SessionRow): number {
  const gross = s.fee ?? 0;
  return s.session_format === 'in_person' ? Math.max(0, gross - ROOM_COST_CENTS) : gross;
}

interface Totals {
  sessions: number;
  online: number;
  inPerson: number;
  gross: number;
  net: number;
  grossOnline: number;
  grossInPerson: number;
  netOnline: number;
  netInPerson: number;
}

function aggregate(rows: Array<{ s: SessionRow; c: ClientRow }>): Totals {
  const t: Totals = {
    sessions: 0, online: 0, inPerson: 0,
    gross: 0, net: 0,
    grossOnline: 0, grossInPerson: 0, netOnline: 0, netInPerson: 0,
  };
  for (const { s } of rows) {
    const gross = s.fee ?? 0;
    const net = netCents(s);
    t.sessions += 1;
    t.gross += gross;
    t.net += net;
    if (s.session_format === 'in_person') {
      t.inPerson += 1;
      t.grossInPerson += gross;
      t.netInPerson += net;
    } else {
      t.online += 1;
      t.grossOnline += gross;
      t.netOnline += net;
    }
  }
  return t;
}

function euro(cents: number) {
  return '€' + Math.round(cents / 100).toLocaleString('en-IE');
}

// ── Component ──────────────────────────────────────────────────────────────

export function Revenue({ clients }: Props) {
  const [scope, setScope] = useState<Scope>('month');
  // Which sessions count as revenue. Default: attended sessions only (delivered).
  const [basis, setBasis] = useState<'attended' | 'all_scheduled'>('attended');

  const now = new Date();

  const { fullPayingRows, lowCostRows } = useMemo(() => {
    const full: Array<{ s: SessionRow; c: ClientRow }> = [];
    const low: Array<{ s: SessionRow; c: ClientRow }> = [];
    for (const c of clients) {
      for (const s of c.sessions) {
        if (s.status === 'cancelled') continue;
        if (basis === 'attended' && s.status !== 'attended') continue;
        if (!inScope(s.session_date, scope, now)) continue;
        (c.is_low_cost ? low : full).push({ s, c });
      }
    }
    return { fullPayingRows: full, lowCostRows: low };
  }, [clients, scope, basis, now]);

  const fullTotals = useMemo(() => aggregate(fullPayingRows), [fullPayingRows]);
  const lowTotals = useMemo(() => aggregate(lowCostRows), [lowCostRows]);
  const combinedTotals: Totals = {
    sessions:        fullTotals.sessions + lowTotals.sessions,
    online:          fullTotals.online + lowTotals.online,
    inPerson:        fullTotals.inPerson + lowTotals.inPerson,
    gross:           fullTotals.gross + lowTotals.gross,
    net:             fullTotals.net + lowTotals.net,
    grossOnline:     fullTotals.grossOnline + lowTotals.grossOnline,
    grossInPerson:   fullTotals.grossInPerson + lowTotals.grossInPerson,
    netOnline:       fullTotals.netOnline + lowTotals.netOnline,
    netInPerson:     fullTotals.netInPerson + lowTotals.netInPerson,
  };

  // Monthly bar chart — last 12 months, stacked full vs low.
  const monthly = useMemo(() => buildMonthly(clients, basis, now), [clients, basis, now]);

  // Active low-cost clients count
  const lowCostClientCount = clients.filter(c => c.is_low_cost && c.status === 'active').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Period selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div className="admin-segmented">
          {([
            { id: 'week',  label: 'This week' },
            { id: 'month', label: 'This month' },
            { id: 'year',  label: 'This year' },
            { id: 'all',   label: 'All time' },
          ] as const).map(p => (
            <button
              key={p.id}
              onClick={() => setScope(p.id)}
              className={`admin-segmented-btn${scope === p.id ? ' is-active' : ''}`}
            >{p.label}</button>
          ))}
        </div>

        <div className="admin-segmented" style={{ marginLeft: 'auto' }}>
          {([
            { id: 'attended',      label: 'Attended only' },
            { id: 'all_scheduled', label: 'Inc. scheduled' },
          ] as const).map(b => (
            <button
              key={b.id}
              onClick={() => setBasis(b.id)}
              className={`admin-segmented-btn${basis === b.id ? ' is-active' : ''}`}
            >{b.label}</button>
          ))}
        </div>
      </div>

      {/* Three stat cards: Full-paying / Low-cost / Combined */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 18,
      }}>
        <RevenueCard
          label="Full-paying"
          accent="sage"
          totals={fullTotals}
          subtext={`${clients.filter(c => !c.is_low_cost && c.status === 'active').length} active clients`}
          Icon={TrendingUp}
        />
        <RevenueCard
          label="Low cost"
          accent="lilac"
          totals={lowTotals}
          subtext={`${lowCostClientCount} client${lowCostClientCount === 1 ? '' : 's'} marked low cost`}
          Icon={Wallet}
        />
        <RevenueCard
          label="Combined"
          accent="terracotta"
          totals={combinedTotals}
          subtext={`${combinedTotals.sessions} session${combinedTotals.sessions === 1 ? '' : 's'} ${basis === 'attended' ? 'delivered' : 'on the books'}`}
          Icon={TrendingUp}
          emphasised
        />
      </div>

      {/* Monthly chart */}
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <p className="admin-eyebrow">Monthly trend</p>
            <h2 className="admin-h2">Last 12 months · gross</h2>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11, color: 'var(--ink-muted)' }}>
            <Swatch colour="var(--sage)" label="Full-paying" />
            <Swatch colour="var(--lilac)" label="Low cost" />
          </div>
        </div>
        <MonthlyChart months={monthly} />
      </section>

      {/* Format breakdown */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18,
      }}>
        <FormatCard
          label="Online sessions"
          accent="sage"
          Icon={Video}
          sessions={combinedTotals.online}
          gross={combinedTotals.grossOnline}
          net={combinedTotals.netOnline}
          standardRate={70}
        />
        <FormatCard
          label="In-person sessions"
          accent="gold"
          Icon={MapPin}
          sessions={combinedTotals.inPerson}
          gross={combinedTotals.grossInPerson}
          net={combinedTotals.netInPerson}
          standardRate={80}
          roomCost
        />
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────

interface RevenueCardProps {
  label: string;
  accent: 'sage' | 'lilac' | 'terracotta' | 'gold';
  totals: Totals;
  subtext: string;
  Icon: typeof TrendingUp;
  emphasised?: boolean;
}

function RevenueCard({ label, accent, totals, subtext, Icon, emphasised }: RevenueCardProps) {
  const palette = {
    sage:       { strip: 'var(--sage)',       blob: '#d8e8de', iconBg: 'rgba(79,138,104,0.14)', iconFg: 'var(--sage)' },
    lilac:      { strip: 'var(--lilac)',      blob: '#e3d3eb', iconBg: 'rgba(168,124,185,0.16)', iconFg: 'var(--lilac-dark)' },
    terracotta: { strip: 'var(--terracotta)', blob: '#f6dfd0', iconBg: 'rgba(200,90,27,0.12)', iconFg: 'var(--terracotta)' },
    gold:       { strip: 'var(--gold)',       blob: '#f6e9c2', iconBg: 'rgba(212,168,67,0.18)', iconFg: 'var(--gold-dark)' },
  }[accent];

  const grossEuros = Math.round(totals.gross / 100);
  const netEuros = Math.round(totals.net / 100);
  const roomCost = totals.gross - totals.net;

  return (
    <div className="admin-stat" style={emphasised ? { borderColor: palette.strip } : undefined}>
      <div className="admin-stat-accent" style={{ background: palette.strip }} />
      <div className="admin-stat-blob" style={{ background: palette.blob }} aria-hidden />
      <div className="admin-stat-top">
        <div className="admin-stat-label">{label}</div>
        <div className="admin-stat-icontile" style={{ background: palette.iconBg, color: palette.iconFg }}>
          <Icon size={20} strokeWidth={1.7} aria-hidden />
        </div>
      </div>
      <div className="admin-stat-value">
        <span className="admin-stat-value-prefix">€</span>
        <span>{grossEuros.toLocaleString('en-IE')}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-muted)' }}>
        Gross · {totals.sessions} session{totals.sessions === 1 ? '' : 's'}
      </div>
      <div style={{
        marginTop: 4,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--forest-deep)',
      }}>
        Net €{netEuros.toLocaleString('en-IE')}
        {roomCost > 0 && (
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-muted)', fontWeight: 400 }}>
            (after {euro(roomCost)} room costs)
          </span>
        )}
      </div>
      <div className="admin-stat-foot" style={{ marginTop: 10 }}>{subtext}</div>
    </div>
  );
}

interface FormatProps {
  label: string;
  accent: 'sage' | 'gold';
  Icon: typeof Video;
  sessions: number;
  gross: number;
  net: number;
  standardRate: number;
  roomCost?: boolean;
}

function FormatCard({ label, accent, Icon, sessions, gross, net, standardRate, roomCost }: FormatProps) {
  const palette = {
    sage: { iconBg: 'rgba(79,138,104,0.14)', iconFg: 'var(--sage)' },
    gold: { iconBg: 'rgba(212,168,67,0.18)', iconFg: 'var(--gold-dark)' },
  }[accent];

  return (
    <section className="admin-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div className="admin-stat-icontile" style={{ background: palette.iconBg, color: palette.iconFg }}>
          <Icon size={20} strokeWidth={1.7} aria-hidden />
        </div>
        <div>
          <p className="admin-eyebrow">{label}</p>
          <h2 className="admin-h3" style={{ fontSize: 16 }}>
            Standard rate €{standardRate}{roomCost ? ' · €20 room cost' : ''}
          </h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 24, rowGap: 8, fontSize: 13 }}>
        <span style={{ color: 'var(--ink-muted)' }}>Sessions</span>
        <span style={{ color: 'var(--forest-deep)', fontWeight: 500 }}>{sessions}</span>

        <span style={{ color: 'var(--ink-muted)' }}>Gross</span>
        <span style={{ color: 'var(--forest-deep)', fontWeight: 500 }}>{euro(gross)}</span>

        {roomCost && (
          <>
            <span style={{ color: 'var(--ink-muted)' }}>Room costs</span>
            <span style={{ color: 'var(--terracotta)', fontWeight: 500 }}>− {euro(gross - net)}</span>
          </>
        )}

        <span style={{ color: 'var(--ink-muted)' }}>Net</span>
        <span style={{ color: 'var(--sage)', fontWeight: 600, fontSize: 16 }}>{euro(net)}</span>
      </div>
    </section>
  );
}

function Swatch({ colour, label }: { colour: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: colour }} />
      {label}
    </span>
  );
}

// ── Monthly chart ─────────────────────────────────────────────────────────

interface MonthBucket {
  label: string;
  full: number;   // cents
  low: number;
}

function buildMonthly(clients: ClientRow[], basis: 'attended' | 'all_scheduled', now: Date): MonthBucket[] {
  const months: Array<{ year: number; month: number; label: string }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-IE', { month: 'short' }),
    });
  }

  return months.map(({ year, month, label }) => {
    let full = 0, low = 0;
    for (const c of clients) {
      for (const s of c.sessions) {
        if (s.status === 'cancelled') continue;
        if (basis === 'attended' && s.status !== 'attended') continue;
        const d = new Date(s.session_date);
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        if (c.is_low_cost) low += s.fee ?? 0;
        else full += s.fee ?? 0;
      }
    }
    return { label, full, low };
  });
}

function MonthlyChart({ months }: { months: MonthBucket[] }) {
  const max = Math.max(1, ...months.map(m => m.full + m.low));
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 10, height: 220, marginTop: 16,
    }}>
      {months.map((m, i) => {
        const totalPct = ((m.full + m.low) / max) * 100;
        const fullPct = (m.full / max) * 100;
        const lowPct = (m.low / max) * 100;
        const total = m.full + m.low;
        const isCurrent = i === months.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <div style={{ width: '100%', height: 180, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{
                position: 'relative',
                width: '100%',
                height: `${Math.max(2, totalPct)}%`,
                borderRadius: '8px 8px 4px 4px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                minHeight: total > 0 ? 6 : 4,
                background: total === 0 ? 'var(--line)' : 'transparent',
              }}>
                {m.low > 0 && (
                  <div style={{
                    height: `${(lowPct / totalPct) * 100}%`,
                    background: 'linear-gradient(180deg, #c198d3 0%, var(--lilac) 100%)',
                  }} />
                )}
                {m.full > 0 && (
                  <div style={{
                    height: `${(fullPct / totalPct) * 100}%`,
                    background: isCurrent
                      ? 'linear-gradient(180deg, var(--terracotta) 0%, #e7855a 100%)'
                      : 'linear-gradient(180deg, var(--sage) 0%, #7eae8e 100%)',
                  }} />
                )}
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--forest-deep)', fontWeight: 500 }}>
              {total > 0 ? euro(total) : '—'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{label(m.label, isCurrent)}</div>
          </div>
        );
      })}
    </div>
  );
}

function label(s: string, isCurrent: boolean) {
  return isCurrent ? `${s} ·` : s;
}

