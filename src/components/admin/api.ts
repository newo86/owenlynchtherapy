import { startOfWeek, utcToDublinLocal } from '@/lib/dateUtils';
import type { SessionRow } from './types';

// Re-exported from the single source of truth in lib/dateUtils so admin
// components can keep importing these from './api'. (gcalIsoToDublinLocal is
// just the GCal-named alias of utcToDublinLocal — same implementation.)
export { startOfWeek };
export const gcalIsoToDublinLocal = utcToDublinLocal;

/**
 * Collapse duplicate session rows to one per (client, time) slot. The
 * recurring-event sync bug created extra rows for the same session — typically
 * an auto-imported `unpaid` copy alongside the real, possibly-paid one — which
 * inflates revenue and can make a paid session look unpaid. We never delete
 * here; we just pick the single "best" row to count/display, preferring:
 *   1. paid over unpaid (never lose a payment),
 *   2. attended over scheduled,
 *   3. a row with a Stripe payment/paid_at record,
 *   4. otherwise the first seen.
 * Cancelled rows are left untouched (callers filter those separately).
 */
export function dedupeSessions(sessions: SessionRow[]): SessionRow[] {
  const score = (s: SessionRow): number => {
    let n = 0;
    if (s.payment_status === 'paid') n += 8;
    if (s.status === 'attended') n += 4;
    if (s.paid_at || s.stripe_payment_intent_id) n += 2;
    if (s.gcal_event_id) n += 1;
    return n;
  };
  const best = new Map<string, SessionRow>();
  const passthrough: SessionRow[] = [];
  for (const s of sessions) {
    // Only de-duplicate active rows; keep cancelled ones as-is.
    if (s.status === 'cancelled') { passthrough.push(s); continue; }
    const slot = new Date(s.session_date).getTime();
    const key = `${s.client_id}@${slot}`;
    const existing = best.get(key);
    if (!existing || score(s) > score(existing)) best.set(key, s);
  }
  return [...best.values(), ...passthrough];
}


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

/** Fetch an admin PDF (via the auth cookie) and trigger a browser download. */
export async function downloadAdminPdf(url: string, filename: string): Promise<void> {
  try {
    const res = await adminFetch(url);
    if (!res.ok) {
      window.alert('Could not generate the PDF — please try again.');
      return;
    }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  } catch {
    window.alert('Could not download the PDF — please try again.');
  }
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
