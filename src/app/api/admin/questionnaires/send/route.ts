import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL, buildQuestionnaireHtml } from '@/lib/emailTemplates';
import { SITE_URL, PRACTICE } from '@/practice.config';
import {
  QUESTIONNAIRE_KINDS, KIND_PATHS, LINK_TTL_DAYS, TEST_CLIENT_ID, newToken, type QuestionnaireKind,
} from '@/lib/questionnaires/tokens';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/questionnaires/send
 * body: { client_id, kind: 'values' | 'cnip', email?: boolean }
 *
 * client_id 'test' makes a test link for the practitioner: no client record,
 * emails (the link and, for values, the results copy) go to CONTACT_EMAIL.
 *
 * Creates a private single-use link. Email goes out ONLY when `email` is true
 * (the explicit "Email it" button); otherwise the link is just returned to copy.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('questionnaire-send', ip, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: { client_id?: unknown; kind?: unknown; email?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const clientId = typeof body.client_id === 'string' ? body.client_id : '';
  const kind = body.kind as QuestionnaireKind;
  const isTest = clientId === TEST_CLIENT_ID;
  if (!isTest && !UUID_RE.test(clientId)) return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  if (!QUESTIONNAIRE_KINDS.includes(kind)) return NextResponse.json({ error: 'Unknown questionnaire' }, { status: 400 });

  let client: { full_name: string; email: string };
  if (isTest) {
    client = { full_name: PRACTICE.practitionerName, email: CONTACT_EMAIL };
  } else {
    const { data, error: clientErr } = await supabaseAdmin
      .from('clients').select('id, full_name, email').eq('id', clientId).maybeSingle();
    if (clientErr || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    client = { full_name: (data.full_name as string) ?? '', email: (data.email as string) ?? '' };
  }

  const token = newToken();
  const expires_at = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: row, error: insErr } = await supabaseAdmin
    .from('questionnaire_tokens')
    .insert({ token, client_id: isTest ? null : clientId, is_test: isTest, kind, expires_at })
    .select('id')
    .single();
  if (insErr || !row) {
    console.error('[questionnaires/send] insert error:', dbError(insErr));
    return NextResponse.json({ error: 'Could not create the link. Has the questionnaires migration been run?' }, { status: 500 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, '');
  const url = `${siteUrl}${KIND_PATHS[kind]}?token=${token}`;

  let emailed = false;
  let emailError: string | null = null;
  if (body.email === true) {
    if (!client.email) {
      emailError = 'This client has no email address on their record.';
    } else {
      try {
        const firstName = client.full_name.trim().split(/\s+/)[0] ?? '';
        const result = await getResend().emails.send({
          from: EMAIL_FROM,
          to: client.email,
          subject: `${isTest ? '[Test] ' : ''}${kind === 'values' ? 'Your values worksheet' : 'A short questionnaire before we continue'}`,
          html: buildQuestionnaireHtml({ firstName, kind, url, ttlDays: LINK_TTL_DAYS }),
        });
        if (result.error) {
          console.error('[questionnaires/send] email error:', result.error.message);
          emailError = 'The link was created but the email could not be sent.';
        } else {
          emailed = true;
          await supabaseAdmin.from('questionnaire_tokens')
            .update({ emailed_at: new Date().toISOString() }).eq('id', row.id);
        }
      } catch (e) {
        console.error('[questionnaires/send] email thrown:', e instanceof Error ? e.message : String(e));
        emailError = 'The link was created but the email could not be sent.';
      }
    }
  }

  return NextResponse.json({ url, expires_at, emailed, email_error: emailError }, { headers: noCache });
}
