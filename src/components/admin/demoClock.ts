// Dev-only: the demo dashboard needs "now" to be a Tuesday afternoon so that
// today's clients, the next session and the Tue/Fri week all show. This shifts
// `new Date()` / `Date.now()` by a fixed offset (the clock still ticks) for the
// demo page only. Never imported outside the demo (see demoGate.ts).
import { localDublinToUtcIso, utcToDublinLocal } from '@/lib/dateUtils';

/** Tuesday 15:20 (Dublin) of the week containing `realNowMs`. */
export function demoNowMs(realNowMs: number): number {
  const local = utcToDublinLocal(new Date(realNowMs).toISOString()); // YYYY-MM-DDTHH:MM
  const [y, m, d] = local.slice(0, 10).split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sun
  const monday = d - ((dow + 6) % 7);
  const tue = new Date(Date.UTC(y, m - 1, monday + 1)).toISOString().slice(0, 10);
  return new Date(localDublinToUtcIso(`${tue}T15:20`)).getTime();
}

/** Shift the clock so "now" is `targetMs`. Returns a function that restores it. */
export function installDemoClock(targetMs: number): () => void {
  const RealDate = Date;
  const offset = targetMs - RealDate.now();
  class DemoDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(RealDate.now() + offset);
      else super(...(args as [number]));
    }
    static now() { return RealDate.now() + offset; }
  }
  globalThis.Date = DemoDate as unknown as DateConstructor;
  return () => { globalThis.Date = RealDate; };
}
