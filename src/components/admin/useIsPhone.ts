import { useSyncExternalStore } from 'react';

/** True at 768px and narrower: the phone layout. False on the server. */
export function useIsPhone(): boolean {
  return useSyncExternalStore(
    cb => { const m = window.matchMedia('(max-width: 768px)'); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => window.matchMedia('(max-width: 768px)').matches,
    () => false,
  );
}
