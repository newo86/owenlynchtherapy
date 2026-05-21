import type { CSSProperties } from 'react';
import { colors, fonts } from './theme';

export type BadgeKind =
  | 'paid' | 'unpaid' | 'refunded'
  | 'in_person' | 'online'
  | 'new' | 'attended' | 'cancelled' | 'no_show' | 'scheduled'
  | 'pending' | 'expired' | 'submitted'
  | 'calendar';

const STYLES: Record<BadgeKind, { bg: string; fg: string; border: string; label: string }> = {
  paid:       { bg: `${colors.sage}20`, fg: colors.sageDark, border: colors.sage, label: 'Paid' },
  unpaid:     { bg: `${colors.terracotta}20`, fg: colors.terracottaDark, border: colors.terracotta, label: 'Unpaid' },
  refunded:   { bg: '#9999991A', fg: '#666', border: '#999', label: 'Refunded' },
  in_person:  { bg: `${colors.forest}15`, fg: colors.forest, border: 'transparent', label: 'In Person' },
  online:     { bg: `${colors.sage}15`, fg: colors.sageDark, border: 'transparent', label: 'Online' },
  new:        { bg: `${colors.gold}20`, fg: colors.goldDark, border: colors.gold, label: 'New' },
  attended:   { bg: `${colors.sage}20`, fg: colors.sageDark, border: colors.sage, label: 'Attended' },
  cancelled:  { bg: '#9999991A', fg: '#666', border: '#bbb', label: 'Cancelled' },
  no_show:    { bg: '#9999991A', fg: '#666', border: '#bbb', label: 'No show' },
  scheduled:  { bg: `${colors.forest}12`, fg: colors.forest, border: 'transparent', label: 'Scheduled' },
  pending:    { bg: `${colors.terracotta}20`, fg: colors.terracottaDark, border: colors.terracotta, label: 'Pending' },
  expired:    { bg: '#9999991A', fg: '#999', border: '#bbb', label: 'Expired' },
  submitted:  { bg: `${colors.sage}20`, fg: colors.sageDark, border: colors.sage, label: 'Submitted' },
  calendar:   { bg: '#9999991A', fg: '#666', border: '#bbb', label: 'Calendar' },
};

export function Badge({ kind, children, style }: { kind: BadgeKind; children?: React.ReactNode; style?: CSSProperties }) {
  const s = STYLES[kind];
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 999,
      background: s.bg,
      color: s.fg,
      border: `1px solid ${s.border}`,
      fontFamily: fonts.sans,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children ?? s.label}
    </span>
  );
}
