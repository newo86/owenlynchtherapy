import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, dbError } from '@/lib/supabase';
import { sanitiseInput, escapeHtml } from '@/lib/sanitise';
import { rateLimit } from '@/lib/rateLimit';
import { rateLimitDurable } from '@/lib/rateLimitDurable';
import { getResend } from '@/lib/resend';
import { EMAIL_FROM, CONTACT_EMAIL } from '@/lib/emailTemplates';
import { NAME_RE, isValidPhone } from '@/lib/intakeValidation';
import { SITE_URL } from '@/practice.config';
const noCache = { 'Cache-Control': 'no-store, no-cache' };

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const VALID_FORMATS = ['in_person', 'online', 'no_preference'];
const VALID_REFERRAL = ['Google search', 'Psychology Today', 'Word of mouth', 'Social media', 'GP referral', 'Counselling directory', 'Other'];
const VALID_AI = ['yes', 'sometimes', 'no'];

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
  if (!isValidPhone(phone)) return NextResponse.json({ error: 'Please enter a valid phone number, including the country code if it is not Irish' }, { status: 400 });

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
  // Claim the token ATOMICALLY now that every field has validated (claiming
  // earlier would burn the link on a simple typo). The is_used check above and
  // a later update weren't atomic, so two simultaneous submits could both get
  // through. Only the request that flips false→true proceeds.
  const { data: claimed } = await supabaseAdmin
    .from('intake_tokens')
    .update({ is_used: true })
    .eq('id', tokenRow.id)
    .eq('is_used', false)
    .select('id');
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'Token already used' }, { status: 400, headers: noCache });
  }

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
    console.error('[intake submit] insert error:', dbError(insertErr));
    // Release the claim so the client can retry with the same link.
    await supabaseAdmin.from('intake_tokens').update({ is_used: false }).eq('id', tokenRow.id);
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  // Link the intake up with the client record: copy the contact details the
  // client just provided onto their record, but only where the record is still
  // blank so we never clobber anything the practitioner has edited. Runs only
  // when the token was issued for a known client. Intake has no GP phone.
  if (tokenRow.client_id) {
    try {
      const { data: existing } = await supabaseAdmin
        .from('clients')
        .select('phone, date_of_birth, emergency_contact_name, emergency_contact_phone, gp_name')
        .eq('id', tokenRow.client_id)
        .single();
      if (existing) {
        const fill: Record<string, string> = {};
        if (!existing.date_of_birth && date_of_birth) fill.date_of_birth = date_of_birth;
        if (!existing.phone && phone) fill.phone = phone;
        if (!existing.emergency_contact_name && emergency_contact_name) fill.emergency_contact_name = emergency_contact_name;
        if (!existing.emergency_contact_phone && emergency_contact_phone) fill.emergency_contact_phone = emergency_contact_phone;
        if (!existing.gp_name && gp_name) fill.gp_name = gp_name;
        if (Object.keys(fill).length > 0) {
          await supabaseAdmin.from('clients').update(fill).eq('id', tokenRow.client_id);
        }
      }
    } catch (linkErr) {
      // Non-fatal: the submission is saved regardless; the record can still be
      // filled from the dashboard's "Fill from intake" button.
      console.error('[intake submit] client backfill error:', dbError(linkErr));
    }
  }

  // Tell the practitioner a form has arrived (best-effort). The email carries
  // the client's name and a link only: the answers are special-category health
  // data, and a copy in a mailbox and in the email provider's logs would sit
  // outside the retention rules (docs/DATA-RETENTION.md). The answers and the
  // PDF are read in the dashboard, behind the login.
  try {
    const emailResult = await getResend().emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: `New intake form: ${full_name}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:560px;">
        <p><strong>${escapeHtml(full_name)}</strong> has completed their intake form.</p>
        <p>Read it and download the PDF in the <a href="${SITE_URL}/admin/intake" style="color:#c85a1a">dashboard</a> → Forms.</p>
        <p style="font-size:12px;color:#888">For privacy, the answers are not included in this email.</p>
      </div>`,
    });
    if (emailResult.error) {
      console.error('[intake email] Resend error:', JSON.stringify(emailResult.error, null, 2));
    } else {
      console.log('[intake email] sent, id:', emailResult.data?.id);
    }
  } catch (emailErr) {
    console.error('[intake email] thrown error:', emailErr instanceof Error ? emailErr.message : String(emailErr));
  }

  return NextResponse.json({ success: true }, { headers: noCache });
}
