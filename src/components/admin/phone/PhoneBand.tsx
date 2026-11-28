// The header art band of every phone screen (prototype `.head`): sage with a
// soft wave edge, one fine line, the split circle, then a bold title and sub.
// The sub is large and bold because small white text on the sage fails contrast.

export function PhoneBand({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="ph-head">
      <svg viewBox="0 0 330 198" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 0H330V160C270 190 210 152 150 168C95 182 45 180 0 166Z" fill="var(--sd-header)" />
        <path d="M-10 66C60 36 110 92 180 60S290 24 340 48" fill="none" stroke="var(--sd-art-cream)" strokeWidth="1.4" strokeOpacity=".7" />
      </svg>
      <svg className="ph-art-circle" viewBox="0 0 132 132" aria-hidden="true" focusable="false">
        <g transform="translate(66 66)">
          <circle r="62" fill="var(--sd-art-blue)" />
          <path d="M0-62A62 62 0 0 1 0 62Z" fill="var(--sd-art-yellow)" />
          <circle r="36" fill="var(--sd-art-cream)" />
          <path d="M0-36A36 36 0 0 1 0 36Z" fill="var(--sd-ink)" />
          <circle r="11" fill="var(--sd-art-dot)" />
        </g>
      </svg>
      <h1>{title}</h1>
      <p className="ph-sub">{sub}</p>
    </header>
  );
}
