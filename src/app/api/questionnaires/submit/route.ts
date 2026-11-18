import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { rateLimit, trackTokenFailure, isTokenBlocked } from '@/lib/rateLimit';
import { rateLimitDurable } from '@/lib/rateLimitDurable';
import { escapeHtml } from '@/lib/sanitise';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL, buildValuesResultsHtml } from '@/lib/emailTemplates';
import { SITE_URL } from '@/practice.config';
import { checkQuestionnaireToken, QUESTIONNAIRE_KINDS, KIND_LABELS, type QuestionnaireKind } from '@/lib/questionnaires/tokens';
import { parseCnipAnswers, scoreCnip } from '@/lib/questionnaires/cnip';
import { parseValuesAnswers, areaGaps, valueName, valueDesc, LIFE_AREAS, type ValuesAnswers } from '@/lib/questionnaires/values';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const MAX_BODY_BYTES = 32_000;

// Free text is stored as the client wrote it (line breaks and "<5/10" kept):
// it is only ever rendered through React, which escapes it. Null bytes and
// other control characters (bar newline and tab) are removed.
const keepText = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n');

/**
 * POST /api/questionnaires/submit   (public, token-gated)
 * body: { token, kind, answers }
 *
 * Validates the answers strictly, scores them on the server, claims the link
 * atomically (one completion per link) and stores the result. For the C–NIP–2
 * the response carries no scores: the client doesn't see them by design.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('questionnaire-submit', ip, 8, 15 * 60 * 1000)
      || !(await rateLimitDurable('questionnaire-submit', ip, 8, 15 * 60 * 1000))) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: noCache });
  }
  if (isTokenBlocked(ip)) {
    return NextResponse.json({ error: 'Too many failed attempts' }, { status: 429, headers: noCache });
  }

  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Too large' }, { status: 413, headers: noCache });
  }
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Too large' }, { status: 413, headers: noCache });
  let body: { token?: unknown; kind?: unknown; answers?: unknown };
  try { body = JSON.parse(text); } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: noCache });
  }

  const kind = body.kind as QuestionnaireKind;
  if (!QUESTIONNAIRE_KINDS.includes(kind)) return NextResponse.json({ error: 'Unknown questionnaire' }, { status: 400, headers: noCache });

  const tok = await checkQuestionnaireToken(typeof body.token === 'string' ? body.token : undefined, kind);
  if (!tok.ok) {
    if (tok.reason === 'invalid') trackTokenFailure(ip);
    const msg = tok.reason === 'used' ? 'This link has already been used.'
      : tok.reason === 'expired' ? 'This link has expired.' : 'Link not recognised.';
    return NextResponse.json({ error: msg, reason: tok.reason }, { status: 400, headers: noCache });
  }

  let answers: unknown;
  let scores: unknown = null;
  let valuesAnswers: ValuesAnswers | null = null;
  if (kind === 'cnip') {
    const parsed = parseCnipAnswers(body.answers);
    if (!parsed) return NextResponse.json({ error: 'Please answer every row.' }, { status: 400, headers: noCache });
    answers = parsed;
    scores = scoreCnip(parsed);
  } else {
    const parsed = parseValuesAnswers(body.answers, keepText);
    if (typeof parsed === 'string') return NextResponse.json({ error: parsed }, { status: 400, headers: noCache });
    answers = parsed;
    valuesAnswers = parsed;
    scores = { gaps: areaGaps(parsed.areas) };
  }

  // Claim the link atomically: only the request that flips used_at wins.
  const { data: claimed } = await supabaseAdmin
    .from('questionnaire_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tok.id)
    .is('used_at', null)
    .select('id');
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'This link has already been used.', reason: 'used' }, { status: 400, headers: noCache });
  }

  const { error: insErr } = await supabaseAdmin.from('questionnaire_responses').insert({
    token_id: tok.id, client_id: tok.clientId, kind, answers, scores,
  });
  if (insErr) {
    console.error('[questionnaires/submit] insert error:', dbError(insErr));
    await supabaseAdmin.from('questionnaire_tokens').update({ used_at: null }).eq('id', tok.id);
    return NextResponse.json({ error: 'Could not save your answers. Please try again.' }, { status: 500, headers: noCache });
  }

  const { data: client } = await supabaseAdmin
    .from('clients').select('full_name, email').eq('id', tok.clientId).maybeSingle();

  // Let the practitioner know (name only: the answers stay behind the login).
  try {
    const name = escapeHtml((client?.full_name as string | undefined) ?? 'A client');
    await getResend().emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: `${KIND_LABELS[kind]} completed`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:560px;">
        <p><strong>${name}</strong> has completed <em>${escapeHtml(KIND_LABELS[kind])}</em>.</p>
        <p>See the results in the <a href="${SITE_URL}/admin/intake" style="color:#c85a1a">dashboard</a> → Analytics.</p>
        <p style="font-size:12px;color:#888">For privacy, the answers are not included in this email.</p>
      </div>`,
    });
  } catch (e) {
    console.error('[questionnaires/submit] notify error:', e instanceof Error ? e.message : String(e));
  }

  // Values worksheet only: email the client their own copy of the results,
  // to the address on their record (never one taken from the request). The
  // C–NIP–2 is never sent back: clients don't see those scores by design.
  let emailedCopy = false;
  const clientEmail = (client?.email as string | undefined)?.trim();
  if (valuesAnswers && clientEmail) {
    const v = valuesAnswers;
    try {
      const result = await getResend().emails.send({
        from: EMAIL_FROM,
        to: clientEmail,
        replyTo: CONTACT_EMAIL,
        subject: 'Your values: a copy to keep',
        html: buildValuesResultsHtml({
          firstName: tok.firstName,
          top: v.top.map(id => ({ name: valueName(id, v.ownValues), desc: valueDesc(id), neglected: v.neglected.includes(id) })),
          areas: LIFE_AREAS.map(a => ({ name: a.name, importance: v.areas[a.id]?.importance ?? null, living: v.areas[a.id]?.living ?? null })),
          step: v.step,
        }),
      });
      if (result.error) console.error('[questionnaires/submit] client copy error:', result.error.name);
      else emailedCopy = Boolean(result.data?.id);
    } catch (e) {
      console.error('[questionnaires/submit] client copy thrown:', e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({ success: true, emailed_copy: emailedCopy }, { headers: noCache });
}
