import { initials } from './api';

// Rotate avatar colour based on the name so the same person stays in the same
// hue across the dashboard.
const PALETTE = [
  { bg: '#2F5A44', fg: '#FFFFFF' },
  { bg: '#AFC3DE', fg: '#1F2B24' },
  { bg: '#DCE8E0', fg: '#1F2B24' },
  { bg: '#A8C8B5', fg: '#1F2B24' },
  { bg: '#1F2B24', fg: '#FAF6EC' },
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
      className="pii admin-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: t.bg,
        color: t.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans)',
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
