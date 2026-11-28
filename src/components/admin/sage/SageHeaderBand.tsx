import type { ReactNode } from 'react';
import { SplitCircle } from './SplitCircle';

interface Props {
  title: string;
  /** One short line. Keep it large and bold (CSS does): small text fails contrast on the sage. */
  subtitle?: string;
  /** Buttons/pills on the right (desktop) or under the title (phone). At most one primary button. */
  action?: ReactNode;
}

/** The sage header band: soft wave, split circle, page title. Place it as the
 *  first child of `.admin-main` (it cancels the page gutters to run edge to
 *  edge). Responsive: the circle shrinks on a phone and the action wraps. */
export function SageHeaderBand({ title, subtitle, action }: Props) {
  return (
    <header className="sd-band">
      <svg className="sd-band-wave" viewBox="0 0 1200 210" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M0 0H1200V170C1000 205 800 160 600 178C400 196 200 196 0 174Z" fill="var(--sd-header)" />
        <path d="M-20 80C200 40 380 120 620 76S1000 30 1220 60" fill="none" stroke="var(--sd-art-cream)" strokeWidth="1.6" strokeOpacity=".6" />
      </svg>
      <SplitCircle className="sd-band-circle" />
      <div className="sd-band-inner">
        <div>
          <h1 className="sd-band-title">{title}</h1>
          {subtitle && <p className="sd-band-sub">{subtitle}</p>}
        </div>
        {action && <div className="sd-band-action">{action}</div>}
      </div>
    </header>
  );
}
