'use client';

// One swiped-open row at a time per list; a tap anywhere outside it closes it.
import { useEffect, useState } from 'react';

export function useOpenRow() {
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    if (!openId) return;
    const onDown = (e: PointerEvent) => {
      const row = (e.target as Element | null)?.closest?.('[data-session-row]');
      if (row?.getAttribute('data-session-row') !== openId) setOpenId(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [openId]);
  return { openId, setOpenId, props: (id: string) => ({ open: openId === id, onOpenChange: (o: boolean) => setOpenId(o ? id : (cur: string | null) => (cur === id ? null : cur)) }) };
}
