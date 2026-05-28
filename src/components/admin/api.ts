const STORAGE_KEY = 'intake_admin_auth';

export function getSecret(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(STORAGE_KEY) ?? '';
}

export function setSecret(value: string) {
  sessionStorage.setItem(STORAGE_KEY, value);
}

export function clearSecret() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${getSecret()}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers, cache: 'no-store' });
}

export function displayFee(cents: number): string {
  return `€${Math.round(cents / 100)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/Dublin',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IE', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Europe/Dublin',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Dublin',
  });
}

export function todayInDublin(): string {
  return new Date().toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Dublin',
  });
}

export function startOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun … 6 Sat
  const diff = (day + 6) % 7; // distance back to Monday
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/** Convert a GCal ISO start string to "YYYY-MM-DDTHH:MM" in Dublin wall-clock
 *  so it can be passed as initialIsoDate to ScheduleSessionModal. */
export function gcalIsoToDublinLocal(isoStart: string): string {
  const d = new Date(isoStart);
  const parts = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const v = (t: string) => parts.find(p => p.type === t)?.value ?? '00';
  const h = v('hour') === '24' ? '00' : v('hour');
  return `${v('year')}-${v('month')}-${v('day')}T${h}:${v('minute')}`;
}
