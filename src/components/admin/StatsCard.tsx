import { colors, fonts, shadows } from './theme';

interface Props {
  label: string;
  value: number | string;
  hint?: string;
  accent?: 'gold' | 'terracotta' | 'sage';
}

export function StatsCard({ label, value, hint, accent = 'gold' }: Props) {
  const borderColor = accent === 'terracotta' ? colors.terracotta
    : accent === 'sage' ? colors.sage : colors.gold;

  return (
    <div
      style={{
        background: colors.white,
        borderRadius: 8,
        borderTop: `3px solid ${borderColor}`,
        boxShadow: shadows.card,
        padding: '20px 22px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 110,
      }}
    >
      <div style={{
        fontFamily: fonts.sans,
        fontSize: 10,
        fontWeight: 500,
        color: colors.terracotta,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: fonts.display,
        fontWeight: 300,
        fontSize: 36,
        color: colors.forest,
        lineHeight: 1,
        letterSpacing: '-0.02em',
      }}>{value}</div>
      {hint && (
        <div style={{
          fontFamily: fonts.sans,
          fontSize: 12,
          color: colors.textMuted,
          opacity: 0.85,
        }}>{hint}</div>
      )}
    </div>
  );
}
