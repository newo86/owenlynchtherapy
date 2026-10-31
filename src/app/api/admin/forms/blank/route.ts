import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { generateTherapeuticAgreementPDF } from '@/lib/pdf/generateTherapeuticAgreementPDF';
import { generatePrivacyPolicyPDF } from '@/lib/pdf/generatePrivacyPolicyPDF';
import { generateIntakePDF, type SubmissionData } from '@/lib/generateIntakePDF';

// Form library: blank copies of the documents clients receive, for the
// practitioner to read, print or share. Nothing here touches client data.
const LINE = '________________________________';

function blankIntake(): SubmissionData {
  return {
    id: 'blank',
    full_name: LINE,
    preferred_name: LINE,
    email: LINE,
    phone: LINE,
    date_of_birth: LINE,
    pronouns: LINE,
    session_format: 'In person / Online',
    referral_source: LINE,
    referral_source_other: null,
    reason_for_therapy: `${LINE}\n${LINE}\n${LINE}`,
    diagnosed_conditions: LINE,
    previous_therapy: null,
    previous_therapy_details: 'Yes / No. Details: ' + LINE,
    current_medication: LINE,
    seeing_psychiatrist: null,
    psychiatrist_details: 'Yes / No. Details: ' + LINE,
    uses_ai_tools: LINE,
    emergency_contact_name: LINE,
    emergency_contact_phone: LINE,
    emergency_contact_relationship: LINE,
    gp_name: LINE,
    gp_practice: LINE,
    additional_info: `${LINE}\n${LINE}`,
    consent_therapeutic_agreement: null,
    consent_privacy_policy: null,
    consent_data_storage: null,
    consent_age_confirmation: null,
    submitted_at: new Date().toISOString(),
  };
}

const FORMS = {
  agreement: { file: 'therapeutic-agreement.pdf', make: generateTherapeuticAgreementPDF },
  privacy: { file: 'privacy-policy.pdf', make: generatePrivacyPolicyPDF },
  intake: { file: 'intake-form-blank.pdf', make: () => generateIntakePDF(blankIntake()) },
} as const;

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const key = req.nextUrl.searchParams.get('form') as keyof typeof FORMS | null;
  const form = key && key in FORMS ? FORMS[key] : null;
  if (!form) {
    return new Response(JSON.stringify({ error: 'Unknown form' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const pdf = await form.make();
    const inline = req.nextUrl.searchParams.get('inline') === '1';
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${form.file}"`,
        'Cache-Control': 'no-store, no-cache',
      },
    });
  } catch (err) {
    console.error('[forms/blank] PDF generation failed:', err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: 'Could not generate the PDF' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
