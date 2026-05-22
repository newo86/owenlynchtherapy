import { initials } from './api';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #2D5A42, #4F8A68)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-poppins), Poppins, sans-serif',
        fontWeight: 500,
        fontSize: Math.round(size * 0.36),
        letterSpacing: '0.4px',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {initials(name)}
    </div>
  );
}
