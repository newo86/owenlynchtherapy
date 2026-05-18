/**
 * Ambient background decoration — slowly drifting translucent circles.
 * Renders as an absolute inset overlay; parent must be `position: relative`
 * and `overflow: hidden`.
 */
export default function FloatingCircles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* 1 — green, large, top-left */}
      <div
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          top: '-8%',
          left: '-6%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(79,138,104,0.07) 0%, transparent 68%)',
          animation: 'fc-drift-1 45s ease-in-out infinite',
        }}
      />

      {/* 2 — orange, medium, top-right */}
      <div
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          top: '15%',
          right: '-4%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(200,90,26,0.06) 0%, transparent 68%)',
          animation: 'fc-drift-2 38s ease-in-out infinite',
          animationDelay: '-12s',
        }}
      />

      {/* 3 — gold, medium, bottom-left */}
      <div
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          bottom: '-12%',
          left: '18%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(212,168,67,0.07) 0%, transparent 68%)',
          animation: 'fc-drift-3 52s ease-in-out infinite',
          animationDelay: '-25s',
        }}
      />

      {/* 4 — green, small, mid-right — hidden on mobile */}
      <div
        className="hidden sm:block"
        style={{
          position: 'absolute',
          width: 220,
          height: 220,
          top: '45%',
          right: '22%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(79,138,104,0.05) 0%, transparent 68%)',
          animation: 'fc-drift-4 34s ease-in-out infinite',
          animationDelay: '-8s',
        }}
      />

      {/* 5 — orange, very large, bottom-right — desktop only */}
      <div
        className="hidden md:block"
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          bottom: '-20%',
          right: '-8%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(200,90,26,0.04) 0%, transparent 68%)',
          animation: 'fc-drift-5 60s ease-in-out infinite',
          animationDelay: '-35s',
        }}
      />

      {/* 6 — gold, medium, lower-left — desktop only */}
      <div
        className="hidden lg:block"
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          top: '60%',
          left: '5%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(212,168,67,0.05) 0%, transparent 68%)',
          animation: 'fc-drift-1 42s ease-in-out infinite',
          animationDelay: '-18s',
        }}
      />
    </div>
  );
}
