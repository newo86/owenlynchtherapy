import type { LucideIcon } from 'lucide-react';

interface Props {
  label: string;
  value: number | string;
  hint?: string;
  Icon?: LucideIcon;
}

export function StatsCard({ label, value, hint, Icon }: Props) {
  return (
    <div className="admin-glass admin-glass-hover admin-stat">
      {Icon && (
        <div className="admin-stat-icon" aria-hidden>
          <Icon size={40} strokeWidth={1.4} />
        </div>
      )}
      <div style={{
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        color: '#C85A1A',
        marginBottom: 14,
      }}>{label}</div>
      <div style={{
        fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
        fontWeight: 200,
        fontSize: 40,
        color: 'white',
        letterSpacing: '-1.5px',
        lineHeight: 1,
        marginBottom: hint ? 10 : 0,
      }}>{value}</div>
      {hint && (
        <div style={{
          fontSize: 12,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.5)',
        }}>{hint}</div>
      )}
    </div>
  );
}
