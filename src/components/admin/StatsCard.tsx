import { colors, fonts } from './theme';

interface Props {
  label: string;
  value: number | string;
  hint?: string;
  accent?: 'gold' | 'terracotta' | 'sage';
}

export function StatsCard({ label, value, hint, accent = 'gold' }: Props) {
  // The accent prop tints the top gradient bar. Hover glow stays gold for
  // visual consistency across all four cards.
  const accentStart = accent === 'terracotta' ? colors.terracotta
    : accent === 'sage' ? colors.sage : colors.gold;

  return (
    <div className="admin-stat" style={{
      // Top accent bar is set via CSS pseudo, but we override the gradient
      // colour by setting a CSS custom prop the rule could pick up. The
      // simpler path: render a real div for the bar so each card can be
      // its own accent.
    }}>
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${accentStart}, transparent)`,
        opacity: 0.7,
        pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative' }}>
        <div style={{
          fontFamily: fonts.sans,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          color: colors.terracotta,
          marginBottom: 14,
        }}>{label}</div>
        <div style={{
          fontFamily: fonts.display,
          fontWeight: 300,
          fontSize: 36,
          color: colors.forest,
          letterSpacing: '-1px',
          lineHeight: 1,
          marginBottom: hint ? 8 : 0,
        }}>{value}</div>
        {hint && (
          <div style={{
            fontFamily: fonts.sans,
            fontSize: 12,
            fontWeight: 300,
            color: 'rgba(42,77,60,0.55)',
          }}>{hint}</div>
        )}
      </div>
    </div>
  );
}
