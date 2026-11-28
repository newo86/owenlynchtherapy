'use client';

// Opening a layer (session page, sub-page, sheet) remembers what had focus;
// closing it hands focus back, so keyboard and screen-reader users land where
// they were. `fallback` finds the element again if it was re-rendered.
import { useCallback, useRef } from 'react';

export function useFocusReturn() {
  const opener = useRef<HTMLElement | null>(null);
  const remember = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);
  const restore = useCallback((fallback?: () => HTMLElement | null) => {
    window.setTimeout(() => {
      const el = opener.current?.isConnected ? opener.current : fallback?.() ?? null;
      el?.focus();
    }, 0);
  }, []);
  return { remember, restore };
}
