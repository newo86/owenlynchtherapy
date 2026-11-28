'use client';

// "N changes followed from Google" as a quiet line with Review, not a decision.
// Undo lives in the expanded list (FollowedFromGooglePanel). Shared by the
// desktop Today and the phone Today.

import { useState } from 'react';
import { FollowedFromGooglePanel } from './FollowedFromGooglePanel';

export function FollowedQuiet({ onChanged }: { onChanged: () => void }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  return (
    <>
      {(count > 0 || open) && (
        <p className="dt-fg-line">
          {count} {count === 1 ? 'change' : 'changes'} followed from Google ·{' '}
          <button type="button" className="dt-link" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            {open ? 'Hide' : 'Review'}
          </button>
        </p>
      )}
      <div className="dt-card dt-pad" hidden={!open}>
        <FollowedFromGooglePanel bare onChanged={onChanged} onCount={setCount} />
      </div>
    </>
  );
}
