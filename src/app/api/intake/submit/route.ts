import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateIntakePDF } from '@/lib/generateIntakePDF';
import { sanitiseInput } from '@/lib/sanitise';
import { rateLimit } from '@/lib/rateLimit';
import { rateLimitDurable } from '@/lib/rateLimitDurable';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL } from '@/lib/emailTemplates';
const noCache = { 'Cache-Control': 'no-store, no-cache' };

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const NAME_RE = /^[a-zA-ZÀ-ÿ\s'\-]{2,100}$/;
const VALID_FORMATS = ['in_person', 'online', 'no_preference'];
const VALID_REFERRAL = ['Google search', 'Psychology Today', 'Word of mouth', 'Social media', 'GP referral', 'Counselling directory', 'Other'];
const VALID_AI = ['yes', 'sometimes', 'no'];

function isValidPhone(raw: string): boolean {
  const stripped = raw.replace(/[\s\-\(\)]/g, '');
  return /^(\+353|0)(8[3-9]|1|2[1-9]|4[0-9]|5[0-9]|6[0-9]|7[0-9]|9[0-9])\d{6,7}$/.test(stripped);
}

function validateDOB(raw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return 'Date of birth must be in YYYY-MM-DD format';
  const dob = new Date(raw);
  if (isNaN(dob.getTime())) return 'Invalid date of birth';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  if (age < 18) return 'You must be 18 or over to use this service';
  if (age > 120) return 'Invalid date of birth';
  return null;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

  if (!rateLimit('submit', ip, 5, 15 * 60 * 1000)
      || !(await rateLimitDurable('submit', ip, 5, 15 * 60 * 1000))) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429, headers: noCache });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { token, ...rawForm } = body as { token: string } & Record<string, unknown>;

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  // Re-validate token server-side
  const { data: tokenRow, error: tokenErr } = await supabaseAdmin
    .from('intake_tokens')
    .select('id, client_id, client_name, expires_at, is_used')
    .eq('token', token)
    .single();

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: 'Token not found' }, { status: 400, headers: noCache });
  }
  if (tokenRow.is_used) {
    return NextResponse.json({ error: 'Token already used' }, { status: 400, headers: noCache });
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400, headers: noCache });
  }

  // Sanitise all string fields
  const s = (v: unknown) => typeof v === 'string' ? sanitiseInput(v) : '';

  const full_name                   = s(rawForm.full_name);
  const preferred_name              = s(rawForm.preferred_name);
  const email                       = s(rawForm.email);
  const phone                       = s(rawForm.phone);
  const date_of_birth               = s(rawForm.date_of_birth);
  const pronouns                    = s(rawForm.pronouns);
  const session_format              = s(rawForm.session_format);
  const referral_source             = s(rawForm.referral_source);
  const referral_source_other       = s(rawForm.referral_source_other);
  const reason_for_therapy          = s(rawForm.reason_for_therapy);
  const diagnosed_conditions        = s(rawForm.diagnosed_conditions);
  const previous_therapy            = s(rawForm.previous_therapy);
  const previous_therapy_details    = s(rawForm.previous_therapy_details);
  const current_medication          = s(rawForm.current_medication);
  const seeing_psychiatrist         = s(rawForm.seeing_psychiatrist);
  const psychiatrist_details        = s(rawForm.psychiatrist_details);
  const uses_ai_tools               = s(rawForm.uses_ai_tools);
  const emergency_contact_name      = s(rawForm.emergency_contact_name);
  const emergency_contact_phone     = s(rawForm.emergency_contact_phone);
  const emergency_contact_relationship = s(rawForm.emergency_contact_relationship);
  const gp_name                     = s(rawForm.gp_name);
  const gp_practice                 = s(rawForm.gp_practice);
  const additional_info             = s(rawForm.additional_info);

  // Validate required fields
  if (!full_name) return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
  if (!NAME_RE.test(full_name)) return NextResponse.json({ error: 'Full name contains invalid characters' }, { status: 400 });

  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 254) return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });

  if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: 'Please enter a valid Irish phone number' }, { status: 400 });

  if (!date_of_birth) return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 });
  const dobError = validateDOB(date_of_birth);
  if (dobError) return NextResponse.json({ error: dobError }, { status: 400 });

  if (!VALID_FORMATS.includes(session_format)) return NextResponse.json({ error: 'Invalid session format' }, { status: 400 });
  if (!VALID_REFERRAL.includes(referral_source)) return NextResponse.json({ error: 'Invalid referral source' }, { status: 400 });
  if (referral_source === 'Other' && !referral_source_other) return NextResponse.json({ error: 'Please specify referral source' }, { status: 400 });

  if (!reason_for_therapy || reason_for_therapy.length < 10) return NextResponse.json({ error: 'Please provide a reason for seeking therapy (at least 10 characters)' }, { status: 400 });
  if (reason_for_therapy.length > 2000) return NextResponse.json({ error: 'Reason for therapy is too long (max 2000 characters)' }, { status: 400 });

  if (!['yes', 'no'].includes(previous_therapy)) return NextResponse.json({ error: 'Please answer the previous therapy question' }, { status: 400 });
  if (!['yes', 'no'].includes(seeing_psychiatrist)) return NextResponse.json({ error: 'Please answer the psychiatrist question' }, { status: 400 });
  if (uses_ai_tools && !VALID_AI.includes(uses_ai_tools)) return NextResponse.json({ error: 'Invalid uses_ai_tools value' }, { status: 400 });

  if (!emergency_contact_name) return NextResponse.json({ error: 'Emergency contact name is required' }, { status: 400 });
  if (!NAME_RE.test(emergency_contact_name)) return NextResponse.json({ error: 'Emergency contact name contains invalid characters' }, { status: 400 });
  if (!emergency_contact_phone) return NextResponse.json({ error: 'Emergency contact phone is required' }, { status: 400 });
  if (!isValidPhone(emergency_contact_phone)) return NextResponse.json({ error: 'Please enter a valid phone number for the emergency contact' }, { status: 400 });
  if (!emergency_contact_relationship) return NextResponse.json({ error: 'Emergency contact relationship is required' }, { status: 400 });
  if (emergency_contact_relationship.length > 100) return NextResponse.json({ error: 'Relationship is too long' }, { status: 400 });

  if (
    !rawForm.consent_therapeutic_agreement
    || !rawForm.consent_privacy_policy
    || !rawForm.consent_data_storage
    || !rawForm.consent_age_confirmation
  ) {
    return NextResponse.json({ error: 'Consent fields required' }, { status: 400 });
  }

  // Optional field length limits
  if (diagnosed_conditions.length > 1000) return NextResponse.json({ error: 'Diagnosed conditions text is too long (max 1000 characters)' }, { status: 400 });
  if (previous_therapy_details.length > 1000) return NextResponse.json({ error: 'Previous therapy details text is too long (max 1000 characters)' }, { status: 400 });
  if (current_medication.length > 500) return NextResponse.json({ error: 'Current medication text is too long (max 500 characters)' }, { status: 400 });
  if (psychiatrist_details.length > 200) return NextResponse.json({ error: 'Psychiatrist details text is too long (max 200 characters)' }, { status: 400 });
  if (additional_info.length > 2000) return NextResponse.json({ error: 'Additional info text is too long (max 2000 characters)' }, { status: 400 });

  // Insert submission
  const { error: insertErr } = await supabaseAdmin.from('intake_submissions').insert({
    token_id: tokenRow.id,
    client_id: tokenRow.client_id ?? null,
    full_name,
    preferred_name: preferred_name || null,
    email,
    phone,
    date_of_birth,
    pronouns: pronouns || null,
    session_format,
    referral_source,
    referral_source_other: referral_source_other || null,
    reason_for_therapy,
    diagnosed_conditions: diagnosed_conditions || null,
    previous_therapy: previous_therapy === 'yes',
    previous_therapy_details: previous_therapy_details || null,
    current_medication: current_medication || null,
    seeing_psychiatrist: seeing_psychiatrist === 'yes',
    psychiatrist_details: psychiatrist_details || null,
    uses_ai_tools: uses_ai_tools || null,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    gp_name: gp_name || null,
    gp_practice: gp_practice || null,
    consent_therapeutic_agreement: Boolean(rawForm.consent_therapeutic_agreement),
    consent_privacy_policy: Boolean(rawForm.consent_privacy_policy),
    consent_data_storage: Boolean(rawForm.consent_data_storage),
    consent_age_confirmation: Boolean(rawForm.consent_age_confirmation),
    additional_info: additional_info || null,
  });

  if (insertErr) {
    console.error('[intake submit] insert error:', JSON.stringify(insertErr, null, 2));
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  // Mark token as used
  await supabaseAdmin
    .from('intake_tokens')
    .update({ is_used: true })
    .eq('token', token);

  // Send email notification with PDF attachment (non-blocking)
  try {
    const { data: savedRow } = await supabaseAdmin
      .from('intake_submissions')
      .select('*')
      .eq('token_id', tokenRow.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single();

    const pdfBuffer = savedRow ? await generateIntakePDF(savedRow) : null;
    const filename = `intake-${full_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

    const yn = (v: unknown) => v ? 'Yes' : 'No';
    const sanitisedData = {
      full_name, preferred_name, email, phone, date_of_birth, pronouns,
      session_format, referral_source, referral_source_other, reason_for_therapy,
      diagnosed_conditions, previous_therapy, previous_therapy_details,
      current_medication, seeing_psychiatrist, psychiatrist_details, uses_ai_tools,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
      gp_name, gp_practice, additional_info,
      consent_therapeutic_agreement: yn(rawForm.consent_therapeutic_agreement),
      consent_privacy_policy: yn(rawForm.consent_privacy_policy),
      consent_data_storage: yn(rawForm.consent_data_storage),
      consent_age_confirmation: yn(rawForm.consent_age_confirmation),
    };

    const emailResult = await getResend().emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: `New intake form: ${full_name}`,
      html: buildEmailHtml(sanitisedData),
      ...(pdfBuffer ? { attachments: [{ filename, content: pdfBuffer }] } : {}),
    });
    if (emailResult.error) {
      console.error('[intake email] Resend error:', JSON.stringify(emailResult.error, null, 2));
    } else {
      console.log('[intake email] sent, id:', emailResult.data?.id);
    }
  } catch (emailErr) {
    console.error('[intake email] thrown error:', emailErr);
  }

  return NextResponse.json({ success: true }, { headers: noCache });
}

function row(label: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return `<tr>
    <td style="padding:5px 16px 5px 0;font-size:13px;color:#777;white-space:nowrap;vertical-align:top">${label}</td>
    <td style="padding:5px 0;font-size:13px;color:#333;line-height:1.7">${display}</td>
  </tr>`;
}

function section(title: string, rows: string): string {
  return `<tr><td colspan="2" style="padding:24px 0 6px">
    <div style="font-size:11px;font-weight:600;color:#2a4d3c;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1px solid #e5e5e5;padding-bottom:8px;margin-bottom:4px">${title}</div>
  </td></tr>${rows}`;
}

function buildEmailHtml(d: Record<string, string>): string {
  const fmt = (s: string) => s.replace(/_/g, ' ');
  return `<table style="font-family:system-ui,sans-serif;max-width:620px;width:100%;color:#333;border-collapse:collapse">
    <tr><td colspan="2" style="padding-bottom:24px">
      <h2 style="margin:0 0 4px;font-size:20px;font-weight:400;color:#2a4d3c">New Intake Form</h2>
      <p style="margin:0;font-size:12px;color:#aaa">Submitted ${new Date().toLocaleDateString('en-IE', { dateStyle: 'full' })}</p>
    </td></tr>
    ${section('Basic Details', [
      row('Full name', d.full_name),
      row('Preferred name', d.preferred_name),
      row('Email', d.email),
      row('Phone', d.phone),
      row('Date of birth', d.date_of_birth),
      row('Pronouns', d.pronouns),
    ].join(''))}
    ${section('Session Preferences', [
      row('Format', fmt(d.session_format || '')),
      row('Referral source', d.referral_source),
      row('Referral detail', d.referral_source_other),
    ].join(''))}
    ${section('About You', [
      row('Reason for therapy', d.reason_for_therapy),
      row('Diagnosed conditions', d.diagnosed_conditions),
      row('Previous therapy', d.previous_therapy === 'yes' ? 'Yes' : 'No'),
      row('Previous therapy details', d.previous_therapy_details),
      row('Current medication', d.current_medication),
    ].join(''))}
    ${section('Other Support', [
      row('Seeing psychiatrist', d.seeing_psychiatrist === 'yes' ? 'Yes' : 'No'),
      row('Psychiatrist details', d.psychiatrist_details),
      row('Uses AI tools', d.uses_ai_tools),
    ].join(''))}
    ${section('Emergency Contact', [
      row('Name', d.emergency_contact_name),
      row('Phone', d.emergency_contact_phone),
      row('Relationship', d.emergency_contact_relationship),
    ].join(''))}
    ${section('GP Details', [
      row('GP name', d.gp_name),
      row('GP practice', d.gp_practice),
    ].join(''))}
    ${section('Additional Info', [
      row('Notes', d.additional_info),
    ].join(''))}
    ${section('Consent', [
      row('Therapeutic Agreement', d.consent_therapeutic_agreement),
      row('Privacy Policy', d.consent_privacy_policy),
      row('Data Storage', d.consent_data_storage),
      row('Age Confirmation (18+)', d.consent_age_confirmation),
    ].join(''))}
  </table>`;
}
