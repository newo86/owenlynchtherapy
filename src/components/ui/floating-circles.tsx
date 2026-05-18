/**
 * Ambient background decoration — slowly drifting translucent circles.
 * Parent must be `position: relative` and `overflow: hidden`.
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
          width: 500,
          height: 500,
          top: '-12%',
          left: '-8%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #4f8a68 0%, transparent 70%)',
          opacity: 0.18,
          animation: 'fc-drift-1 45s ease-in-out infinite',
        }}
      />

      {/* 2 — orange, medium, top-right */}
      <div
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          top: '10%',
          right: '-6%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #c85a1a 0%, transparent 70%)',
          opacity: 0.15,
          animation: 'fc-drift-2 38s ease-in-out infinite',
          animationDelay: '-12s',
        }}
      />

      {/* 3 — gold, medium, bottom-left */}
      <div
        style={{
          position: 'absolute',
          width: 420,
          height: 420,
          bottom: '-15%',
          left: '14%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)',
          opacity: 0.20,
          animation: 'fc-drift-3 52s ease-in-out infinite',
          animationDelay: '-25s',
        }}
      />

      {/* 4 — green, small, mid-right — hidden on mobile */}
      <div
        className="hidden sm:block"
        style={{
          position: 'absolute',
          width: 280,
          height: 280,
          top: '40%',
          right: '18%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #4f8a68 0%, transparent 70%)',
          opacity: 0.14,
          animation: 'fc-drift-4 34s ease-in-out infinite',
          animationDelay: '-8s',
        }}
      />

      {/* 5 — orange, very large, bottom-right — desktop only */}
      <div
        className="hidden md:block"
        style={{
          position: 'absolute',
          width: 560,
          height: 560,
          bottom: '-24%',
          right: '-12%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #c85a1a 0%, transparent 70%)',
          opacity: 0.12,
          animation: 'fc-drift-5 60s ease-in-out infinite',
          animationDelay: '-35s',
        }}
      />

      {/* 6 — gold, medium, lower-left — desktop only */}
      <div
        className="hidden lg:block"
        style={{
          position: 'absolute',
          width: 320,
          height: 320,
          top: '55%',
          left: '3%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #d4a843 0%, transparent 70%)',
          opacity: 0.16,
          animation: 'fc-drift-1 42s ease-in-out infinite',
          animationDelay: '-18s',
        }}
      />
    </div>
  );
}
