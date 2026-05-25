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
 * for inserting into a Supabase timestamptz column. Ireland is always UTC+0
 * (winter/GMT) or UTC+1 (summer/IST) — we try each offset and pick the one
 * whose Dublin display matches the original input.
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
