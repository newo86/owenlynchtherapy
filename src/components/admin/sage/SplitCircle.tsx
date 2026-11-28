/** The split circle: powder blue, af Klint yellow, cream, dark, with a sage
 *  dot. Decorative only (aria-hidden). Colours come from the --sd-art-* tokens. */
export function SplitCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 132 132" aria-hidden="true" focusable="false">
      <g transform="translate(66 66)">
        <circle r="62" fill="var(--sd-art-blue)" />
        <path d="M0-62A62 62 0 0 1 0 62Z" fill="var(--sd-art-yellow)" />
        <circle r="36" fill="var(--sd-art-cream)" />
        <path d="M0-36A36 36 0 0 1 0 36Z" fill="var(--sd-ink)" />
        <circle r="11" fill="var(--sd-art-dot)" />
      </g>
    </svg>
  );
}
