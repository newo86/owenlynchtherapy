import { initials } from './api';

// Rotate avatar colour based on the name so the same person stays in the same
// hue across the dashboard.
const PALETTE = [
  { bg: '#4F8A68', fg: '#FFFFFF' }, // sage
  { bg: '#C85A1B', fg: '#FFFFFF' }, // terracotta
  { bg: '#a87cb9', fg: '#FFFFFF' }, // lilac
  { bg: '#a3801a', fg: '#FFFFFF' }, // gold-dark
  { bg: '#2A4D3C', fg: '#FFFFFF' }, // forest
];

function tone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const t = tone(name);
  return (
    <div
      aria-hidden
      className="pii"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: t.bg,
        color: t.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-poppins), Poppins, sans-serif',
        fontWeight: 500,
        fontSize: Math.round(size * 0.36),
        letterSpacing: '0.4px',
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}
