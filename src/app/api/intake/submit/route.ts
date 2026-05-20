import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateIntakePDF } from '@/lib/generateIntakePDF';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { token, ...formData } = body as { token: string } & Record<string, unknown>;

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  // Re-validate token server-side
  const { data: tokenRow, error: tokenErr } = await supabaseAdmin
    .from('intake_tokens')
    .select('id, client_name, expires_at, is_used')
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

  // Server-side validation of required fields
  const required: string[] = [
    'full_name', 'email', 'phone', 'date_of_birth',
    'session_format', 'referral_source', 'reason_for_therapy',
    'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
  ];
  for (const field of required) {
    if (!formData[field]) {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  const validFormats = ['in_person', 'online', 'no_preference'];
  if (!validFormats.includes(formData.session_format as string)) {
    return NextResponse.json({ error: 'Invalid session_format' }, { status: 400 });
  }

  if (formData.uses_ai_tools && !['yes', 'sometimes', 'no'].includes(formData.uses_ai_tools as string)) {
    return NextResponse.json({ error: 'Invalid uses_ai_tools value' }, { status: 400 });
  }

  if (!formData.consent_data_storage || !formData.consent_age_confirmation) {
    return NextResponse.json({ error: 'Consent fields required' }, { status: 400 });
  }

  // Insert submission
  const { error: insertErr } = await supabaseAdmin.from('intake_submissions').insert({
    token_id: tokenRow.id,
    full_name: formData.full_name,
    preferred_name: (formData.preferred_name as string)?.trim() || null,
    email: formData.email,
    phone: formData.phone,
    date_of_birth: formData.date_of_birth,
    pronouns: (formData.pronouns as string)?.trim() || null,
    session_format: formData.session_format,
    referral_source: formData.referral_source,
    referral_source_other: (formData.referral_source_other as string)?.trim() || null,
    reason_for_therapy: formData.reason_for_therapy,
    diagnosed_conditions: (formData.diagnosed_conditions as string)?.trim() || null,
    previous_therapy: formData.previous_therapy === 'yes',
    previous_therapy_details: (formData.previous_therapy_details as string)?.trim() || null,
    current_medication: (formData.current_medication as string)?.trim() || null,
    seeing_psychiatrist: formData.seeing_psychiatrist === 'yes',
    psychiatrist_details: (formData.psychiatrist_details as string)?.trim() || null,
    uses_ai_tools: (formData.uses_ai_tools as string) || null,
    emergency_contact_name: formData.emergency_contact_name,
    emergency_contact_phone: formData.emergency_contact_phone,
    emergency_contact_relationship: formData.emergency_contact_relationship,
    gp_name: (formData.gp_name as string)?.trim() || null,
    gp_practice: (formData.gp_practice as string)?.trim() || null,
    consent_data_storage: Boolean(formData.consent_data_storage),
    consent_age_confirmation: Boolean(formData.consent_age_confirmation),
    additional_info: (formData.additional_info as string)?.trim() || null,
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

    const pdfBuffer = savedRow
      ? await generateIntakePDF(savedRow)
      : null;

    const fullName = formData.full_name as string;
    const filename = `intake-${fullName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

    const emailResult = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'owenlynch1310@gmail.com', // TODO: change to info@owenlynchtherapy.com once Resend domain verified
      subject: `New intake form: ${fullName}`,
      html: buildEmailHtml(formData as Record<string, unknown>),
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

function buildEmailHtml(d: Record<string, unknown>): string {
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
      row('Format', fmt(String(d.session_format || ''))),
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
  </table>`;
}
