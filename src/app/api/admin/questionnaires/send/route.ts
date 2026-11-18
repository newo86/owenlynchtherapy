import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';
import { CONTACT_EMAIL } from '@/lib/emailTemplates';
import { PRACTICE } from '@/practice.config';
import { TEST_CLIENT_ID } from '@/lib/questionnaires/tokens';
import { issueQuestionnaires, SEND_CHOICES, type SendChoice } from '@/lib/questionnaires/send';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/admin/questionnaires/send
 * body: { client_id, kind: 'values' | 'cnip' | 'both', email?: boolean }
 *
 * client_id 'test' makes test links for the practitioner: no client record,
 * emails (the links and, for values, the results copy) go to CONTACT_EMAIL.
 *
 * Creates private single-use links. Email goes out ONLY when `email` is true
 * (the explicit "Email it" button); otherwise the links are just returned to
 * copy. `emailed` is true only when the email provider confirmed the send.
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
  const choice = body.kind as SendChoice;
  const isTest = clientId === TEST_CLIENT_ID;
  if (!isTest && !UUID_RE.test(clientId)) return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  if (!SEND_CHOICES.includes(choice)) return NextResponse.json({ error: 'Unknown questionnaire' }, { status: 400 });

  let client: { full_name: string; email: string };
  if (isTest) {
    client = { full_name: PRACTICE.practitionerName, email: CONTACT_EMAIL };
  } else {
    const { data, error: clientErr } = await supabaseAdmin
      .from('clients').select('id, full_name, email').eq('id', clientId).maybeSingle();
    if (clientErr || !data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    client = { full_name: (data.full_name as string) ?? '', email: ((data.email as string) ?? '').trim() };
  }

  const r = await issueQuestionnaires({
    clientId: isTest ? null : clientId,
    isTest,
    choice,
    email: body.email === true,
    firstName: client.full_name.trim().split(/\s+/)[0] ?? '',
    recipientEmail: client.email,
  });
  if (!r.ok) {
    return NextResponse.json({ error: 'Could not create the link. Has the questionnaires migration been run?' }, { status: 500 });
  }

  return NextResponse.json(
    { urls: r.urls, url: r.urls.values ?? r.urls.cnip, expires_at: r.expiresAt, emailed: r.emailed, email_error: r.emailError },
    { headers: noCache },
  );
}
