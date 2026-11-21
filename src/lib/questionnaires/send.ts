import { supabaseAdmin, dbError } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, buildQuestionnaireHtml, buildQuestionnaireBundleHtml } from '@/lib/emailTemplates';
import { SITE_URL } from '@/practice.config';
import { KIND_PATHS, LINK_TTL_DAYS, newToken, type QuestionnaireKind } from './tokens';

// Server-only. Creates private questionnaire links for one recipient and,
// when asked, emails them. Shared by the single send and the bulk send.

export type SendChoice = QuestionnaireKind | 'both';
export const SEND_CHOICES: SendChoice[] = ['values', 'cnip', 'both'];

export function kindsFor(choice: SendChoice): QuestionnaireKind[] {
  return choice === 'both' ? ['values', 'cnip'] : [choice];
}

export interface IssueInput {
  clientId: string | null;      // null for the practitioner's own test
  isTest: boolean;
  choice: SendChoice;
  email: boolean;
  firstName: string;
  recipientEmail: string;       // from the client record (or CONTACT_EMAIL for tests); never from a request
  /** Passed to the email provider: a repeat send with the same key (an
   *  overlapping run, a retry) is dropped there instead of emailing twice. */
  idempotencyKey?: string;
}

export interface IssueResult {
  ok: boolean;                  // links created
  urls: Partial<Record<QuestionnaireKind, string>>;
  expiresAt: string;
  emailed: boolean;             // true ONLY when the email provider confirmed a message id
  emailError: string | null;
  killSwitch: boolean;          // emails are switched off on the site (nothing went out)
  alreadySent: boolean;         // the provider refused a repeat of the idempotency key: this person was already emailed
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, '');

export async function issueQuestionnaires(input: IssueInput): Promise<IssueResult> {
  const kinds = kindsFor(input.choice);
  const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const rows = kinds.map(kind => ({
    token: newToken(),
    client_id: input.isTest ? null : input.clientId,
    is_test: input.isTest,
    kind,
    expires_at: expiresAt,
  }));
  const { data: inserted, error: insErr } = await supabaseAdmin
    .from('questionnaire_tokens').insert(rows).select('id, kind, token');
  if (insErr || !inserted || inserted.length !== rows.length) {
    console.error('[questionnaires/issue] insert error:', dbError(insErr));
    return { ok: false, urls: {}, expiresAt, emailed: false, emailError: 'Could not create the links.', killSwitch: false, alreadySent: false };
  }

  const urls: Partial<Record<QuestionnaireKind, string>> = {};
  for (const r of inserted) urls[r.kind as QuestionnaireKind] = `${siteUrl()}${KIND_PATHS[r.kind as QuestionnaireKind]}?token=${r.token}`;

  if (!input.email) return { ok: true, urls, expiresAt, emailed: false, emailError: null, killSwitch: false, alreadySent: false };
  if (!input.recipientEmail) {
    return { ok: true, urls, expiresAt, emailed: false, emailError: 'No email address on their record.', killSwitch: false, alreadySent: false };
  }

  const prefix = input.isTest ? '[Test] ' : '';
  const subject = input.choice === 'both'
    ? `${prefix}Two short questionnaires`
    : `${prefix}${input.choice === 'values' ? 'Values questionnaire for our sessions' : 'A short questionnaire before we continue'}`;
  const html = input.choice === 'both'
    ? buildQuestionnaireBundleHtml({ firstName: input.firstName, valuesUrl: urls.values!, cnipUrl: urls.cnip!, ttlDays: LINK_TTL_DAYS })
    : buildQuestionnaireHtml({ firstName: input.firstName, kind: input.choice, url: urls[input.choice]!, ttlDays: LINK_TTL_DAYS });

  try {
    const result = await getResend().emails.send(
      { from: EMAIL_FROM, to: input.recipientEmail, subject, html },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );
    if (result.error) {
      const name = String(result.error.name);
      if (name === 'invalid_idempotent_request' || name === 'concurrent_idempotent_requests') {
        // An earlier run already emailed this person today (or is doing so
        // right now). Nothing new went out: remove the links nobody received.
        await supabaseAdmin.from('questionnaire_tokens').delete().in('id', inserted.map(r => r.id));
        return { ok: true, urls: {}, expiresAt, emailed: false, emailError: 'Already emailed today.', killSwitch: false, alreadySent: true };
      }
      console.error('[questionnaires/issue] email error:', name);
      return { ok: true, urls, expiresAt, emailed: false, emailError: 'The links were created but the email could not be sent.', killSwitch: false, alreadySent: false };
    }
    if (!result.data?.id) {
      // The kill switch returns success with no id: nothing actually went out.
      return { ok: true, urls, expiresAt, emailed: false, emailError: 'Emails are switched off on the site (EMAILS_ENABLED), so nothing was sent.', killSwitch: true, alreadySent: false };
    }
    const { error: markErr } = await supabaseAdmin.from('questionnaire_tokens')
      .update({ emailed_at: new Date().toISOString() })
      .in('id', inserted.map(r => r.id));
    // The email went; failing to record it weakens the 12-hour duplicate
    // guard (the provider's idempotency key still covers bulk repeats).
    if (markErr) console.error('[questionnaires/issue] emailed_at update error:', dbError(markErr));
    return { ok: true, urls, expiresAt, emailed: true, emailError: null, killSwitch: false, alreadySent: false };
  } catch (e) {
    console.error('[questionnaires/issue] email thrown:', e instanceof Error ? e.message : String(e));
    return { ok: true, urls, expiresAt, emailed: false, emailError: 'The links were created but the email could not be sent.', killSwitch: false, alreadySent: false };
  }
}
