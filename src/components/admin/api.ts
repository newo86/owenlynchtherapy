import { startOfWeek, utcToDublinLocal } from '@/lib/dateUtils';

// Re-exported from the single source of truth in lib/dateUtils so admin
// components can keep importing these from './api'. (gcalIsoToDublinLocal is
// just the GCal-named alias of utcToDublinLocal — same implementation.)
export { startOfWeek };
export const gcalIsoToDublinLocal = utcToDublinLocal;

// Admin auth is a server-set httpOnly cookie (see /api/admin/session). The
// browser never holds the secret; the cookie is sent automatically on
// same-origin requests, so adminFetch no longer attaches an Authorization
// header and JavaScript can't read or leak the credential.

/** Log in by exchanging the admin secret (and TOTP code, if MFA is on) for a
 *  session cookie. Returns mfaRequired when the password was accepted but a
 *  6-digit code is needed. */
export async function login(secret: string, code?: string): Promise<{ ok: boolean; mfaRequired?: boolean; error?: string }> {
  const res = await fetch('/api/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, code }),
    cache: 'no-store',
  });
  if (res.ok) return { ok: true };
  const json = await res.json().catch(() => ({}));
  return { ok: false, mfaRequired: Boolean(json.mfaRequired), error: json.error };
}

/** Whether the current browser holds a valid admin session. */
export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/session', { cache: 'no-store' });
    if (!res.ok) return false;
    const json = await res.json();
    return Boolean(json.authed);
  } catch {
    return false;
  }
}

/** Clear the session cookie. */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/admin/session', { method: 'DELETE', cache: 'no-store' });
  } catch {
    /* best-effort */
  }
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(input, { ...init, headers, cache: 'no-store', credentials: 'same-origin' });
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

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}
