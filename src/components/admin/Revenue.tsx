'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, Video, MapPin, Wallet, X } from 'lucide-react';
import { startOfWeek, isSameDay, formatDateTime } from './api';
import type { ClientRow, SessionRow } from './types';

interface Props {
  clients: ClientRow[];
}

type Scope = 'week' | 'month' | 'year' | 'all';

const ROOM_COST_CENTS = 2000;

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

type DrillRow = { s: SessionRow; c: ClientRow };

// ── Component ──────────────────────────────────────────────────────────────

export function Revenue({ clients }: Props) {
  const [scope, setScope] = useState<Scope>('month');
  const [basis, setBasis] = useState<'attended' | 'all_scheduled'>('attended');
  const [drill, setDrill] = useState<{ title: string; rows: DrillRow[] } | null>(null);

  const now = new Date();

  const { fullPayingRows, lowCostRows } = useMemo(() => {
    const full: DrillRow[] = [];
    const low: DrillRow[] = [];
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
  const lowTotals  = useMemo(() => aggregate(lowCostRows),   [lowCostRows]);
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

  const scopeLabel =
    scope === 'week'  ? 'this week' :
    scope === 'month' ? 'this month' :
    scope === 'year'  ? 'this year' : 'all time';

  const chartData = useMemo(() => {
    if (scope === 'week') return buildWeekly(clients, basis, now);
    if (scope === 'year') return buildYearly(clients, basis, now);
    return buildMonthly(clients, basis, now);
  }, [clients, scope, basis, now]);

  const chartCurrentIdx =
    scope === 'week'  ? (now.getDay() === 0 ? 6 : now.getDay() - 1) :
    scope === 'year'  ? now.getMonth() :
    11;
  const chartEyebrow =
    scope === 'week'  ? 'Weekly trend' :
    scope === 'year'  ? 'Yearly trend' : 'Monthly trend';
  const chartTitle =
    scope === 'week'  ? 'This week · paid sessions only' :
    scope === 'year'  ? `${now.getFullYear()} · month by month · gross` :
    'Last 12 months · gross';

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

      {/* Three stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18 }}>
        <RevenueCard
          label="Full-paying"
          accent="sage"
          totals={fullTotals}
          subtext={`${clients.filter(c => !c.is_low_cost && c.status === 'active').length} active clients`}
          Icon={TrendingUp}
          onClick={() => setDrill({ title: `Full-paying · ${scopeLabel}`, rows: fullPayingRows })}
        />
        <RevenueCard
          label="Low cost"
          accent="lilac"
          totals={lowTotals}
          subtext={`${lowCostClientCount} client${lowCostClientCount === 1 ? '' : 's'} marked low cost`}
          Icon={Wallet}
          onClick={() => setDrill({ title: `Low cost · ${scopeLabel}`, rows: lowCostRows })}
        />
        <RevenueCard
          label="Combined"
          accent="terracotta"
          totals={combinedTotals}
          subtext={`${combinedTotals.sessions} session${combinedTotals.sessions === 1 ? '' : 's'} ${basis === 'attended' ? 'delivered' : 'on the books'}`}
          Icon={TrendingUp}
          emphasised
          onClick={() => setDrill({ title: `All sessions · ${scopeLabel}`, rows: [...fullPayingRows, ...lowCostRows] })}
        />
      </div>

      {/* Trend chart */}
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <p className="admin-eyebrow">{chartEyebrow}</p>
            <h2 className="admin-h2">{chartTitle}</h2>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 11, color: 'var(--ink-muted)' }}>
            <Swatch colour="var(--sage)" label="Full-paying" />
            <Swatch colour="var(--lilac)" label="Low cost" />
          </div>
        </div>
        <MonthlyChart
          months={chartData}
          currentIdx={chartCurrentIdx}
          onBarClick={(rows, barLabel) =>
            setDrill({ title: `${barLabel} · sessions`, rows })
          }
        />
      </section>

      {/* Format breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
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

      {drill && (
        <DrillDownModal
          title={drill.title}
          rows={drill.rows}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  );
}

// ── DrillDownModal ────────────────────────────────────────────────────────

function payTag(status: string) {
  return status === 'paid' ? 'admin-tag-paid'
    : status === 'refunded' ? 'admin-tag-pause'
    : 'admin-tag-unpaid';
}
function payLabel(status: string) {
  return status === 'paid' ? 'Paid' : status === 'refunded' ? 'Refunded' : 'Unpaid';
}

function DrillDownModal({ title, rows, onClose }: { title: string; rows: DrillRow[]; onClose: () => void }) {
  const sorted = [...rows].sort((a, b) =>
    new Date(a.s.session_date).getTime() - new Date(b.s.session_date).getTime()
  );
  const total = rows.reduce((sum, { s }) => sum + (s.fee ?? 0), 0);

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(42,77,60,0.32)', zIndex: 110, animation: 'admin-fade-in 150ms ease' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        background: 'white', borderRadius: 18,
        boxShadow: '0 24px 64px rgba(42,77,60,0.18)',
        zIndex: 120, width: 'min(580px, 92vw)',
        maxHeight: '82vh', overflowY: 'auto',
        animation: 'admin-pop-in 180ms ease',
      }}>
        <div style={{
          padding: '20px 26px',
          background: 'var(--forest-deep)', color: 'white',
          borderRadius: '18px 18px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 1,
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 500, letterSpacing: '4px', textTransform: 'uppercase', color: 'var(--terracotta-soft)' }}>
              Revenue breakdown
            </p>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-montserrat), Avenir, sans-serif', fontWeight: 300, fontSize: 20, color: 'white' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 6 }}
          >
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {sorted.length === 0 ? (
            <p style={{ color: 'var(--ink-muted)', fontSize: 13, textAlign: 'center', padding: '32px 0', margin: 0 }}>
              No sessions for this period.
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sorted.map(({ s, c }, i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto auto',
                    gap: 12,
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: 'var(--cream)',
                    borderRadius: 10,
                  }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--forest-deep)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.full_name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                        {formatDateTime(s.session_date)}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                      {s.session_format === 'online' ? 'Online' : 'In Person'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--forest-deep)', whiteSpace: 'nowrap' }}>
                      {euro(s.fee ?? 0)}
                    </span>
                    <span className={`admin-tag ${payTag(s.payment_status)}`}>
                      {payLabel(s.payment_status)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 16, paddingTop: 14,
                borderTop: '1px solid rgba(42,77,60,0.1)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                  {sorted.length} session{sorted.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--forest-deep)' }}>
                  Total {euro(total)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
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
  onClick?: () => void;
}

function RevenueCard({ label, accent, totals, subtext, Icon, emphasised, onClick }: RevenueCardProps) {
  const palette = {
    sage:       { strip: 'var(--sage)',       blob: '#d8e8de', iconBg: 'rgba(79,138,104,0.14)', iconFg: 'var(--sage)' },
    lilac:      { strip: 'var(--lilac)',      blob: '#e3d3eb', iconBg: 'rgba(168,124,185,0.16)', iconFg: 'var(--lilac-dark)' },
    terracotta: { strip: 'var(--terracotta)', blob: '#f6dfd0', iconBg: 'rgba(200,90,27,0.12)', iconFg: 'var(--terracotta)' },
    gold:       { strip: 'var(--gold)',       blob: '#f6e9c2', iconBg: 'rgba(212,168,67,0.18)', iconFg: 'var(--gold-dark)' },
  }[accent];

  const grossEuros = Math.round(totals.gross / 100);
  const netEuros   = Math.round(totals.net / 100);
  const roomCost   = totals.gross - totals.net;

  return (
    <div
      className="admin-stat"
      style={{
        ...(emphasised ? { borderColor: palette.strip } : {}),
        ...(onClick ? { cursor: 'pointer' } : {}),
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
      title={onClick ? `View ${label} sessions` : undefined}
    >
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
      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 500, color: 'var(--forest-deep)' }}>
        Net €{netEuros.toLocaleString('en-IE')}
        {roomCost > 0 && (
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--ink-muted)', fontWeight: 400 }}>
            (after {euro(roomCost)} room costs)
          </span>
        )}
      </div>
      <div className="admin-stat-foot" style={{ marginTop: 10 }}>{subtext}</div>
      {onClick && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--sage)', fontWeight: 500 }}>
          View sessions ↗
        </div>
      )}
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
  full: number;
  low: number;
  rows: DrillRow[];
}

function buildWeekly(clients: ClientRow[], _basis: 'attended' | 'all_scheduled', now: Date): MonthBucket[] {
  const monday = startOfWeek(now);
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday); day.setDate(monday.getDate() + i);
    let full = 0, low = 0;
    const rows: DrillRow[] = [];
    for (const c of clients) {
      for (const s of c.sessions) {
        if (s.status === 'cancelled') continue;
        if (s.payment_status !== 'paid') continue;
        if (!isSameDay(new Date(s.session_date), day)) continue;
        if (c.is_low_cost) low += s.fee ?? 0;
        else full += s.fee ?? 0;
        rows.push({ s, c });
      }
    }
    return { label: DAY_LABELS[i], full, low, rows };
  });
}

function buildYearly(clients: ClientRow[], basis: 'attended' | 'all_scheduled', now: Date): MonthBucket[] {
  const year = now.getFullYear();
  return Array.from({ length: 12 }, (_, month) => {
    let full = 0, low = 0;
    const rows: DrillRow[] = [];
    for (const c of clients) {
      for (const s of c.sessions) {
        if (s.status === 'cancelled') continue;
        if (basis === 'attended' && s.status !== 'attended') continue;
        const d = new Date(s.session_date);
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        if (c.is_low_cost) low += s.fee ?? 0;
        else full += s.fee ?? 0;
        rows.push({ s, c });
      }
    }
    return { label: new Date(year, month, 1).toLocaleDateString('en-IE', { month: 'short' }), full, low, rows };
  });
}

function buildMonthly(clients: ClientRow[], basis: 'attended' | 'all_scheduled', now: Date): MonthBucket[] {
  const months: Array<{ year: number; month: number; label: string }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('en-IE', { month: 'short' }) });
  }
  return months.map(({ year, month, label }) => {
    let full = 0, low = 0;
    const rows: DrillRow[] = [];
    for (const c of clients) {
      for (const s of c.sessions) {
        if (s.status === 'cancelled') continue;
        if (basis === 'attended' && s.status !== 'attended') continue;
        const d = new Date(s.session_date);
        if (d.getFullYear() !== year || d.getMonth() !== month) continue;
        if (c.is_low_cost) low += s.fee ?? 0;
        else full += s.fee ?? 0;
        rows.push({ s, c });
      }
    }
    return { label, full, low, rows };
  });
}

function MonthlyChart({
  months, currentIdx, onBarClick,
}: {
  months: MonthBucket[];
  currentIdx: number;
  onBarClick?: (rows: DrillRow[], label: string) => void;
}) {
  const max = Math.max(1, ...months.map(m => m.full + m.low));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 220, marginTop: 16 }}>
      {months.map((m, i) => {
        const totalPct = ((m.full + m.low) / max) * 100;
        const fullPct  = (m.full / max) * 100;
        const lowPct   = (m.low  / max) * 100;
        const total    = m.full + m.low;
        const isCurrent = i === currentIdx;
        const clickable = !!onBarClick && total > 0;
        return (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}
          >
            <div
              style={{
                width: '100%', height: 180,
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                cursor: clickable ? 'pointer' : 'default',
              }}
              onClick={clickable ? () => onBarClick!(m.rows, m.label) : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={clickable ? e => { if (e.key === 'Enter' || e.key === ' ') onBarClick!(m.rows, m.label); } : undefined}
              title={clickable ? `View ${m.label} sessions` : undefined}
            >
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
                transition: 'opacity 120ms ease',
              }}
              onMouseEnter={clickable ? e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; } : undefined}
              onMouseLeave={clickable ? e => { (e.currentTarget as HTMLElement).style.opacity = '1'; } : undefined}
              >
                {m.low > 0 && (
                  <div style={{ height: `${(lowPct / totalPct) * 100}%`, background: 'linear-gradient(180deg, #c198d3 0%, var(--lilac) 100%)' }} />
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
            <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>{barLabel(m.label, isCurrent)}</div>
          </div>
        );
      })}
    </div>
  );
}

function barLabel(s: string, isCurrent: boolean) {
  return isCurrent ? `${s} ·` : s;
}
