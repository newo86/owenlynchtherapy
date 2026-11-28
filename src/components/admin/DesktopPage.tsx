'use client';

// The frame every desktop page shares (Sage Diary): header band, then the
// content column. Matches the prototype's `.band` + `.wrap`.

import type { ReactNode } from 'react';
import { SageHeaderBand } from './sage';

interface Props {
  title: string;
  subtitle?: string;
  /** Band buttons (at most one yellow primary). */
  action?: ReactNode;
  children: ReactNode;
}

export function DesktopPage({ title, subtitle, action, children }: Props) {
  return (
    <>
      <SageHeaderBand title={title} subtitle={subtitle} action={action} />
      <div className="dt-wrap dt-page">{children}</div>
    </>
  );
}
