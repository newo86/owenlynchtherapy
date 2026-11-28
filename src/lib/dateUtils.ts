/**
 * Convert a UTC ISO string (e.g. from Supabase timestamptz) to
 * "YYYY-MM-DDTHH:MM" in Europe/Dublin wall-clock time for UI display.
 * Always use this — never rely on the host's local timezone.
 */
export function utcToDublinLocal(utcIso: string): string {
  const d = new Date(utcIso);
  const parts = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const v = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  const h = v('hour') === '24' ? '00' : v('hour');
  return `${v('year')}-${v('month')}-${v('day')}T${h}:${v('minute')}`;
}

export function startOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun … 6 Sat
  const diff = (day + 6) % 7; // distance back to Monday
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Convert a "YYYY-MM-DDTHH:MM" Dublin wall-clock string to a UTC ISO string
 * for storing in Supabase (timestamptz). Ireland is UTC+0 (winter/GMT) or
 * UTC+1 (summer/IST). We try each offset and keep whichever round-trips back
 * to the same Dublin wall-clock time via Intl.DateTimeFormat.
 * Input must be a naive local string — never pass a UTC "Z"-suffixed string.
 */
export function localDublinToUtcIso(wallClock: string): string {
  const stripped = wallClock
    .replace(/\.\d+/, '')
    .replace(/Z$/, '')
    .replace(/[+-]\d{2}:?\d{2}$/, '');
  const [datePart, timePart = '00:00'] = stripped.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);

  const fmt = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  for (const offsetH of [1, 0]) {
    const utcMs = Date.UTC(y, mo - 1, d, h - offsetH, mi, 0);
    const parts = fmt.formatToParts(new Date(utcMs));
    const dh = parseInt(parts.find(p => p.type === 'hour')!.value) % 24;
    const dm = parseInt(parts.find(p => p.type === 'minute')!.value);
    if (dh === h && dm === mi) return new Date(utcMs).toISOString();
  }
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0)).toISOString();
}

/**
 * "Tue 24 Nov, 16:00" in Europe/Dublin, on the 24-hour clock Owen's dashboard
 * and the emails he receives use (client-facing emails keep their own 12-hour
 * format and do not use this). Built from parts so the server and every
 * browser print exactly the same text (Intl's own punctuation differs between
 * engines, which caused a hydration mismatch).
 */
export function formatShortWhen(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const v = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  const hour = v('hour') === '24' ? '00' : v('hour');
  return `${v('weekday')} ${v('day')} ${v('month')}, ${hour}:${v('minute')}`;
}

/** "16:00" in Europe/Dublin: the 24-hour clock for the dashboard and for emails
 *  Owen receives (never for emails to clients). */
export function formatClock24(iso: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(typeof iso === 'string' ? new Date(iso) : iso);
  const v = (t: string) => parts.find(p => p.type === t)?.value ?? '';
  return `${v('hour') === '24' ? '00' : v('hour')}:${v('minute')}`;
}

/** "Tue 24 Nov": the day part of formatShortWhen. */
export function formatShortDay(iso: string): string {
  return formatShortWhen(iso).split(',')[0];
}
