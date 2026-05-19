/**
 * Solid ambient circles for cream/linen sections.
 * Parent must be `position: relative` and `overflow: hidden`.
 */
export default function FloatingCircles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* green, large, top-left */}
      <div style={{
        position: 'absolute',
        width: 420, height: 420,
        top: '-18%', left: '-10%',
        borderRadius: '50%',
        background: '#4f8a68',
        opacity: 0.18,
        animation: 'fc-drift-1 45s ease-in-out infinite',
      }} />

      {/* orange, medium, top-right */}
      <div style={{
        position: 'absolute',
        width: 300, height: 300,
        top: '8%', right: '-8%',
        borderRadius: '50%',
        background: '#c85a1a',
        opacity: 0.16,
        animation: 'fc-drift-2 38s ease-in-out infinite',
        animationDelay: '-12s',
      }} />

      {/* gold, large, bottom-left */}
      <div style={{
        position: 'absolute',
        width: 380, height: 380,
        bottom: '-20%', left: '12%',
        borderRadius: '50%',
        background: '#d4a843',
        opacity: 0.20,
        animation: 'fc-drift-3 52s ease-in-out infinite',
        animationDelay: '-25s',
      }} />

      {/* green, small, mid-right — hidden on mobile */}
      <div className="hidden sm:block" style={{
        position: 'absolute',
        width: 220, height: 220,
        top: '45%', right: '15%',
        borderRadius: '50%',
        background: '#4f8a68',
        opacity: 0.13,
        animation: 'fc-drift-4 34s ease-in-out infinite',
        animationDelay: '-8s',
      }} />

      {/* orange, very large, bottom-right — desktop only */}
      <div className="hidden md:block" style={{
        position: 'absolute',
        width: 500, height: 500,
        bottom: '-28%', right: '-14%',
        borderRadius: '50%',
        background: '#c85a1a',
        opacity: 0.12,
        animation: 'fc-drift-5 60s ease-in-out infinite',
        animationDelay: '-35s',
      }} />

      {/* gold, medium, lower-left — desktop only */}
      <div className="hidden lg:block" style={{
        position: 'absolute',
        width: 280, height: 280,
        top: '60%', left: '2%',
        borderRadius: '50%',
        background: '#d4a843',
        opacity: 0.15,
        animation: 'fc-drift-1 42s ease-in-out infinite',
        animationDelay: '-18s',
      }} />
    </div>
  )
}
