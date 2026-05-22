import type { CSSProperties } from 'react';

export const colors = {
  forest: '#2A4D3C',
  forestDark: '#1F3A2D',
  forestLight: '#3A6450',
  terracotta: '#C85A1A',
  terracottaDark: '#A64810',
  gold: '#D4A843',
  goldDark: '#8B6914',
  sage: '#4F8A68',
  sageDark: '#2D5A42',
  linen: '#F5F0E8',
  linenDeep: '#EDE5D6',
  cream: '#FAF7F2',
  border: '#E0D8CE',
  text: '#1a1a1a',
  textMuted: '#666',
  textFaint: '#999',
  white: '#FFFFFF',
} as const;

export const fonts = {
  display: 'var(--font-montserrat), Montserrat, Avenir, "Helvetica Neue", sans-serif',
  sans: 'var(--font-poppins), Poppins, system-ui, sans-serif',
  mono: '"SF Mono", Menlo, monospace',
} as const;

export const shadows = {
  xs: '0 1px 2px rgba(42,77,60,0.04)',
  sm: '0 2px 4px rgba(42,77,60,0.06), 0 1px 2px rgba(42,77,60,0.04)',
  md: '0 4px 12px rgba(42,77,60,0.08), 0 2px 4px rgba(42,77,60,0.05)',
  lg: '0 8px 24px rgba(42,77,60,0.12), 0 4px 8px rgba(42,77,60,0.06)',
  xl: '0 16px 40px rgba(42,77,60,0.14), 0 8px 16px rgba(42,77,60,0.08)',
  glowTerracotta: '0 0 0 1px rgba(200,90,26,0.3), 0 4px 16px rgba(200,90,26,0.12)',
  glowForest: '0 0 0 1px rgba(42,77,60,0.3), 0 4px 16px rgba(42,77,60,0.12)',
  glowGold: '0 0 0 1px rgba(212,168,67,0.4), 0 4px 16px rgba(212,168,67,0.15)',
  // Back-compat aliases used by the older components
  card: '0 2px 4px rgba(42,77,60,0.06), 0 1px 2px rgba(42,77,60,0.04)',
  cardHover: '0 8px 24px rgba(42,77,60,0.12), 0 4px 8px rgba(42,77,60,0.06)',
  panel: '0 24px 64px rgba(42,77,60,0.18)',
} as const;

export const easing = {
  fast: '120ms cubic-bezier(0.4, 0, 0.2, 1)',
  base: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
  slow: '350ms cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// Reusable style fragments —————————————————————————————————————

export const card: CSSProperties = {
  background: colors.white,
  borderRadius: 8,
  borderTop: `3px solid ${colors.gold}`,
  boxShadow: shadows.card,
  padding: 24,
};

export const eyebrow: CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 11,
  fontWeight: 500,
  color: colors.terracotta,
  letterSpacing: '3px',
  textTransform: 'uppercase',
  margin: 0,
};

export const tableHeader: CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 11,
  fontWeight: 500,
  color: 'rgba(42,77,60,0.7)',
  letterSpacing: '2px',
  textTransform: 'uppercase',
  textAlign: 'left',
  padding: '12px 16px',
};

export const pageTitle: CSSProperties = {
  fontFamily: fonts.display,
  fontWeight: 300,
  fontSize: 28,
  color: colors.forest,
  margin: 0,
  letterSpacing: '-0.01em',
};

export const dataText: CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 14,
  fontWeight: 400,
  color: colors.text,
};

export const mutedText: CSSProperties = {
  fontFamily: fonts.sans,
  fontSize: 13,
  fontWeight: 300,
  color: colors.textMuted,
  opacity: 0.85,
};

export const input: CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  fontSize: 14,
  fontFamily: fonts.sans,
  color: colors.text,
  background: colors.white,
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
};

export const label: CSSProperties = {
  display: 'block',
  fontFamily: fonts.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '2px',
  textTransform: 'uppercase',
  color: colors.sageDark,
  marginBottom: 8,
};

export const btnPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  background: colors.terracotta,
  color: colors.white,
  fontFamily: fonts.sans,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'background 150ms ease, transform 150ms ease',
};

export const btnSecondary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px',
  background: 'transparent',
  color: colors.forest,
  fontFamily: fonts.sans,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  border: `1px solid ${colors.forest}`,
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'background 150ms ease',
};

export const btnGhost: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '8px 14px',
  background: 'transparent',
  color: colors.forest,
  fontFamily: fonts.sans,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
};

export const btnSmall: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 12px',
  fontFamily: fonts.sans,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  border: `1px solid ${colors.border}`,
  borderRadius: 5,
  background: colors.white,
  color: colors.forest,
  cursor: 'pointer',
  transition: 'background 150ms ease, border-color 150ms ease',
};
