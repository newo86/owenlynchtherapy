import { google } from 'googleapis';
import { supabaseAdmin } from './supabase';

const OWNER = 'admin';
const SCOPES = [
  // Read + write events — needed so the admin can both display the week and
  // push newly-created sessions to the practice's Google Calendar.
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

interface StoredTokens {
  owner: string;
  access_token: string;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expiry_date: number | null;
}

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth env vars missing (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildAuthUrl(state: string): string {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // ensure refresh_token on every grant
    scope: SCOPES,
    state,
  });
}

export async function loadStoredTokens(): Promise<StoredTokens | null> {
  const { data, error } = await supabaseAdmin
    .from('google_oauth_tokens')
    .select('*')
    .eq('owner', OWNER)
    .maybeSingle();
  if (error) {
    console.error('[googleOAuth] loadStoredTokens error:', error);
    return null;
  }
  return data as StoredTokens | null;
}

export async function saveTokens(tokens: {
  access_token: string;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expiry_date?: number | null;
}) {
  // Preserve refresh_token when Google doesn't return one on a re-grant
  const existing = await loadStoredTokens();
  const refresh_token = tokens.refresh_token ?? existing?.refresh_token ?? null;

  const payload = {
    owner: OWNER,
    access_token: tokens.access_token,
    refresh_token,
    scope: tokens.scope ?? existing?.scope ?? null,
    token_type: tokens.token_type ?? existing?.token_type ?? 'Bearer',
    expiry_date: tokens.expiry_date ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('google_oauth_tokens')
    .upsert(payload, { onConflict: 'owner' });

  if (error) {
    console.error('[googleOAuth] saveTokens error:', error);
    throw error;
  }
}

export async function clearTokens() {
  const { error } = await supabaseAdmin
    .from('google_oauth_tokens')
    .delete()
    .eq('owner', OWNER);
  if (error) console.error('[googleOAuth] clearTokens error:', error);
}

/** Returns an OAuth2 client with tokens applied and auto-refresh enabled.
 *  Returns null if no tokens stored yet. */
export async function getAuthorizedClient() {
  const stored = await loadStoredTokens();
  if (!stored) return null;

  const client = getOAuthClient();
  client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token ?? undefined,
    scope: stored.scope ?? undefined,
    token_type: stored.token_type ?? undefined,
    expiry_date: stored.expiry_date ?? undefined,
  });

  // Persist refreshed tokens whenever the library auto-refreshes
  client.on('tokens', tokens => {
    void saveTokens({
      access_token: tokens.access_token ?? stored.access_token,
      refresh_token: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      token_type: tokens.token_type ?? null,
      expiry_date: tokens.expiry_date ?? null,
    });
  });

  return client;
}

export async function getConnectedEmail(): Promise<string | null> {
  const client = await getAuthorizedClient();
  if (!client) return null;
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const { data } = await oauth2.userinfo.get();
    return data.email ?? null;
  } catch (err) {
    console.error('[googleOAuth] getConnectedEmail error:', err);
    return null;
  }
}

interface CreateEventInput {
  summary: string;
  description?: string;
  location?: string;
  /** ISO local datetime (without zone) — combined with timeZone below. */
  startIso: string;
  /** Session length in minutes (defaults to 50). */
  durationMinutes?: number;
  /** RRULE strings, e.g. ['RRULE:FREQ=WEEKLY;COUNT=12']. Omit for a one-off. */
  recurrence?: string[];
  timeZone?: string;
}

/** Creates an event on the practice's primary Google Calendar. Returns the
 *  event ID on success, or null if the user hasn't connected Google or the
 *  request fails. We swallow errors so a failed calendar push never blocks
 *  client onboarding — the Supabase sessions are the source of truth. */
export async function createCalendarEvent(input: CreateEventInput): Promise<string | null> {
  const client = await getAuthorizedClient();
  if (!client) return null;

  const tz = input.timeZone ?? 'Europe/Dublin';
  const duration = input.durationMinutes ?? 50;

  const start = new Date(input.startIso);
  const end = new Date(start.getTime() + duration * 60_000);

  try {
    // The calendar.events.readonly scope we requested at connect time does
    // NOT permit insert. Try the write path; if Google returns 403/insufficient
    // scope, surface a clear log and bail.
    const calendar = google.calendar({ version: 'v3', auth: client });
    const { data } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: { dateTime: start.toISOString(), timeZone: tz },
        end:   { dateTime: end.toISOString(),   timeZone: tz },
        recurrence: input.recurrence?.length ? input.recurrence : undefined,
      },
    });
    return data.id ?? null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[googleOAuth] createCalendarEvent error:', msg);
    return null;
  }
}
