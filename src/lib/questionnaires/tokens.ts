import { randomUUID, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { PRACTICE } from '@/practice.config';

// Server-only. Private single-use links for the client questionnaires
// (supabase/migrations/questionnaires.sql). Same token shape as intake links.

export type QuestionnaireKind = 'values' | 'cnip';
export const QUESTIONNAIRE_KINDS: QuestionnaireKind[] = ['values', 'cnip'];

export const KIND_LABELS: Record<QuestionnaireKind, string> = {
  values: 'Finding your values',
  cnip: 'Therapy preferences (C–NIP–2)',
};

/** Public page path for each questionnaire. */
export const KIND_PATHS: Record<QuestionnaireKind, string> = {
  values: '/values',
  cnip: '/preferences',
};

export const LINK_TTL_DAYS = 14;

export const TOKEN_FORMAT_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[0-9a-f]{32}$/;

export function newToken(): string {
  return `${randomUUID()}-${randomBytes(16).toString('hex')}`;
}

/** Value the send route accepts, and the list route returns as client_id,
 *  for the practitioner's own test links (no client record behind them). */
export const TEST_CLIENT_ID = 'test';

export type TokenState =
  | { ok: true; id: string; clientId: string | null; isTest: boolean; firstName: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

/** Look up a questionnaire link for the public page or submit endpoint. */
export async function checkQuestionnaireToken(token: string | undefined, kind: QuestionnaireKind): Promise<TokenState> {
  if (!token || !TOKEN_FORMAT_RE.test(token)) return { ok: false, reason: 'invalid' };
  const { data, error } = await supabaseAdmin
    .from('questionnaire_tokens')
    .select('id, client_id, kind, expires_at, used_at, is_test, clients(full_name)')
    .eq('token', token)
    .maybeSingle();
  if (error || !data || data.kind !== kind) return { ok: false, reason: 'invalid' };
  if (data.used_at) return { ok: false, reason: 'used' };
  if (new Date(data.expires_at as string) < new Date()) return { ok: false, reason: 'expired' };
  const isTest = data.is_test === true;
  const client = data.clients as unknown as { full_name?: string } | null;
  const firstName = isTest
    ? PRACTICE.practitionerFirstName
    : (client?.full_name ?? '').trim().split(/\s+/)[0] ?? '';
  return { ok: true, id: data.id as string, clientId: (data.client_id as string | null) ?? null, isTest, firstName };
}
