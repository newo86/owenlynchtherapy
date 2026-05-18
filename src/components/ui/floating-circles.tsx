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
          width: 480,
          height: 480,
          top: '-10%',
          left: '-8%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(79,138,104,0.14) 0%, rgba(79,138,104,0.06) 45%, transparent 75%)',
          animation: 'fc-drift-1 45s ease-in-out infinite',
        }}
      />

      {/* 2 — orange, medium, top-right */}
      <div
        style={{
          position: 'absolute',
          width: 340,
          height: 340,
          top: '12%',
          right: '-5%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(200,90,26,0.12) 0%, rgba(200,90,26,0.05) 45%, transparent 75%)',
          animation: 'fc-drift-2 38s ease-in-out infinite',
          animationDelay: '-12s',
        }}
      />

      {/* 3 — gold, medium, bottom-left */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 400,
          bottom: '-14%',
          left: '16%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(212,168,67,0.14) 0%, rgba(212,168,67,0.06) 45%, transparent 75%)',
          animation: 'fc-drift-3 52s ease-in-out infinite',
          animationDelay: '-25s',
        }}
      />

      {/* 4 — green, small, mid-right — hidden on mobile */}
      <div
        className="hidden sm:block"
        style={{
          position: 'absolute',
          width: 260,
          height: 260,
          top: '42%',
          right: '20%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(79,138,104,0.10) 0%, rgba(79,138,104,0.04) 45%, transparent 75%)',
          animation: 'fc-drift-4 34s ease-in-out infinite',
          animationDelay: '-8s',
        }}
      />

      {/* 5 — orange, very large, bottom-right — desktop only */}
      <div
        className="hidden md:block"
        style={{
          position: 'absolute',
          width: 540,
          height: 540,
          bottom: '-22%',
          right: '-10%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(200,90,26,0.09) 0%, rgba(200,90,26,0.03) 45%, transparent 75%)',
          animation: 'fc-drift-5 60s ease-in-out infinite',
          animationDelay: '-35s',
        }}
      />

      {/* 6 — gold, medium, lower-left — desktop only */}
      <div
        className="hidden lg:block"
        style={{
          position: 'absolute',
          width: 300,
          height: 300,
          top: '58%',
          left: '4%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(212,168,67,0.10) 0%, rgba(212,168,67,0.04) 45%, transparent 75%)',
          animation: 'fc-drift-1 42s ease-in-out infinite',
          animationDelay: '-18s',
        }}
      />
    </div>
  );
}
