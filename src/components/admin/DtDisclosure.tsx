'use client';

// A quiet "there is more" disclosure in the Sage Diary desktop style: used
// where an existing full-featured section stays reachable under a page that
// now follows the prototype. Native <details>, so keyboard and screen readers
// get it for free.

import type { ReactNode } from 'react';

interface Props {
  title: string;
  sub: string;
  children: ReactNode;
  defaultOpen?: boolean;
  id?: string;
}

export function DtDisclosure({ title, sub, children, defaultOpen = false, id }: Props) {
  return (
    <details className="dt-more" id={id} open={defaultOpen}>
      <summary className="dt-more-head">
        <span className="dt-more-txt"><b>{title}</b><span>{sub}</span></span>
        <span className="dt-more-chev" aria-hidden>▾</span>
      </summary>
      <div className="dt-more-body">{children}</div>
    </details>
  );
}
