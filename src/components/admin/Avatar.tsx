import { colors, fonts } from './theme';
import { initials } from './api';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors.forest,
        color: colors.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: fonts.sans,
        fontWeight: 500,
        fontSize: Math.round(size * 0.36),
        letterSpacing: '0.5px',
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}
