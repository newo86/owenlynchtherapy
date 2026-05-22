import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe';
import { rateLimit } from '@/lib/rateLimit';
import { generateTherapeuticAgreementPDF } from '@/lib/pdf/generateTherapeuticAgreementPDF';
import { generatePrivacyPolicyPDF } from '@/lib/pdf/generatePrivacyPolicyPDF';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const VALID_FORMATS = ['in_person', 'online'];

export async function POST(req: NextRequest) {
  console.log('[generate-token] request received');

  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    console.log('[generate-token] unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('generate-token', ip, 20, 60 * 60 * 1000)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  let body: {
    client_name?: string;
    client_email?: string;
    session_date?: string;
    session_format?: string;
    session_fee?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { client_name, client_email, session_date, session_format, session_fee } = body;
  console.log('[generate-token] body parsed:', { client_name, client_email, session_date, session_format, session_fee });

  if (!client_name?.trim()) return NextResponse.json({ error: 'client_name is required' }, { status: 400 });
  if (!client_email?.trim()) return NextResponse.json({ error: 'client_email is required' }, { status: 400 });
  if (!session_date) return NextResponse.json({ error: 'session_date is required' }, { status: 400 });
  if (!session_format || !VALID_FORMATS.includes(session_format)) return NextResponse.json({ error: 'session_format must be in_person or online' }, { status: 400 });
  if (!session_fee || Number(session_fee) <= 0) return NextResponse.json({ error: 'session_fee is required and must be positive' }, { status: 400 });

  const sessionDateObj = new Date(session_date);
  if (isNaN(sessionDateObj.getTime())) return NextResponse.json({ error: 'Invalid session_date' }, { status: 400 });
  if (sessionDateObj < new Date()) return NextResponse.json({ error: 'session_date must be in the future' }, { status: 400 });

  const feeInCents = Math.round(Number(session_fee) * 100);
  const token = `${randomUUID()}-${randomBytes(16).toString('hex')}`;
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://owenlynchtherapy.vercel.app').replace(/\/$/, '');
  const intakeUrl = `${siteUrl}/intake?token=${token}`;

  const formattedDate = sessionDateObj.toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin',
  });
  const formattedTime = sessionDateObj.toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });
  const location = session_format === 'in_person'
    ? 'Insight Matters, 106 Capel Street, Dublin, D01 WY40'
    : "I'll send you a link to join shortly before your session.";

  // 1. Insert intake token
  console.log('[generate-token] step 1: inserting intake token');
  const { error: tokenErr } = await supabaseAdmin.from('intake_tokens').insert({
    token,
    client_name: client_name.trim(),
    client_email: client_email.trim(),
    expires_at,
  });
  if (tokenErr) {
    console.error('[generate-token] token insert error:', JSON.stringify(tokenErr, null, 2));
    return NextResponse.json({ error: tokenErr.message ?? 'Failed to create token' }, { status: 500 });
  }
  console.log('[generate-token] step 1: done');

  // 2. Insert client record
  console.log('[generate-token] step 2: inserting client');
  const { data: clientRow, error: clientErr } = await supabaseAdmin.from('clients').insert({
    full_name: client_name.trim(),
    email: client_email.trim(),
    session_fee: feeInCents,
    status: 'active',
  }).select().single();

  if (clientErr || !clientRow) {
    console.error('[generate-token] client insert error:', JSON.stringify(clientErr, null, 2));
    return NextResponse.json({ error: clientErr?.message ?? 'Failed to create client record' }, { status: 500 });
  }
  console.log('[generate-token] step 2: done, client id:', clientRow.id);

  // 2b. Link the token to the client so we can later trace a submission back
  // to its specific client row (clients can share an email, especially during
  // testing).
  await supabaseAdmin
    .from('intake_tokens')
    .update({ client_id: clientRow.id })
    .eq('token', token);

  // 3. Insert session record
  console.log('[generate-token] step 3: inserting session');
  const { data: sessionRow, error: sessionErr } = await supabaseAdmin.from('sessions').insert({
    client_id: clientRow.id,
    session_date,
    session_format,
    location,
    fee: feeInCents,
    status: 'scheduled',
    payment_status: 'unpaid',
  }).select().single();

  if (sessionErr || !sessionRow) {
    console.error('[generate-token] session insert error:', JSON.stringify(sessionErr, null, 2));
    return NextResponse.json({ error: sessionErr?.message ?? 'Failed to create session record' }, { status: 500 });
  }
  console.log('[generate-token] step 3: done, session id:', sessionRow.id);

  // 4. Create Stripe price + payment link
  let paymentLinkUrl = '';
  let paymentLinkId = '';

  const stripeKeyRaw = process.env.STRIPE_SECRET_KEY ?? '';
  console.log('[generate-token] Stripe key present:', !!stripeKeyRaw, '| prefix:', stripeKeyRaw.slice(0, 12) || '(empty)');

  try {
    const stripeClient = getStripe();
    console.log('[generate-token] step 4a: creating Stripe price, fee cents:', feeInCents);
    const price = await stripeClient.prices.create({
      currency: 'eur',
      unit_amount: feeInCents,
      product_data: {
        name: `Psychotherapy Session — ${formattedDate} at ${formattedTime}`,
      },
    });
    console.log('[generate-token] step 4a: price created, id:', price.id);

    console.log('[generate-token] step 4b: creating Stripe payment link');
    const paymentLink = await stripeClient.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: `${siteUrl}/payment-confirmed` },
      },
      metadata: {
        session_id: sessionRow.id,
        client_name: client_name.trim(),
        client_email: client_email.trim(),
      },
    });
    console.log('[generate-token] step 4b: payment link created, url:', paymentLink.url, '| id:', paymentLink.id);

    paymentLinkUrl = paymentLink.url;
    paymentLinkId = paymentLink.id;

    // 5. Update session with payment link details
    console.log('[generate-token] step 5: updating session with payment link');
    await supabaseAdmin
      .from('sessions')
      .update({
        stripe_payment_link_id: paymentLinkId,
        stripe_payment_link_url: paymentLinkUrl,
      })
      .eq('id', sessionRow.id);
    console.log('[generate-token] step 5: done');
  } catch (stripeErr: unknown) {
    // Log full error so it's visible in Vercel function logs
    console.error('[generate-token] *** STRIPE FAILED ***');
    if (stripeErr instanceof Error) {
      console.error('[generate-token] Stripe error name:', stripeErr.name);
      console.error('[generate-token] Stripe error message:', stripeErr.message);
      console.error('[generate-token] Stripe error stack:', stripeErr.stack);
    }
    try {
      console.error('[generate-token] Stripe error JSON:', JSON.stringify(stripeErr, Object.getOwnPropertyNames(stripeErr)));
    } catch {
      console.error('[generate-token] Stripe error (non-serialisable):', String(stripeErr));
    }
    paymentLinkUrl = '';
  }

  // 6. Send welcome email with Therapeutic Agreement + Privacy Policy attached
  // NOTE: onboarding@resend.dev can only send to the account owner's verified email until
  // owenlynchtherapy.com domain is verified in Resend. Change to address and from once verified.
  const firstName = client_name.trim().split(' ')[0];
  const emailTo = 'owenlynch1310@gmail.com';
  console.log('[generate-token] step 6: sending welcome email to', emailTo, '(client:', client_email.trim(), ') | paymentLinkUrl:', paymentLinkUrl || '(empty)');

  let therapeuticAgreementBuffer: Buffer | null = null;
  let privacyPolicyBuffer: Buffer | null = null;
  try {
    [therapeuticAgreementBuffer, privacyPolicyBuffer] = await Promise.all([
      generateTherapeuticAgreementPDF(),
      generatePrivacyPolicyPDF(),
    ]);
    console.log('[generate-token] step 6a: PDFs generated',
      'agreement bytes:', therapeuticAgreementBuffer?.length,
      'privacy bytes:', privacyPolicyBuffer?.length);
  } catch (pdfErr) {
    console.error('[generate-token] PDF generation failed:', pdfErr);
  }

  const attachments: Array<{ filename: string; content: Buffer }> = [];
  if (therapeuticAgreementBuffer) {
    attachments.push({
      filename: 'Owen-Lynch-Psychotherapy-Therapeutic-Agreement.pdf',
      content: therapeuticAgreementBuffer,
    });
  }
  if (privacyPolicyBuffer) {
    attachments.push({
      filename: 'Owen-Lynch-Psychotherapy-Privacy-Policy.pdf',
      content: privacyPolicyBuffer,
    });
  }

  try {
    const emailResult = await resend.emails.send({
      from: 'Owen Lynch Psychotherapy <onboarding@resend.dev>',
      to: emailTo,
      subject: 'Your first session with Owen Lynch Psychotherapy',
      html: buildWelcomeHtml({
        firstName,
        formattedDate,
        formattedTime,
        sessionFormat: session_format,
        location,
        feeEuros: Number(session_fee),
        intakeUrl,
        paymentUrl: paymentLinkUrl,
        siteUrl,
      }),
      ...(attachments.length ? { attachments } : {}),
    });
    if (emailResult.error) {
      console.error('[generate-token] welcome email error:', JSON.stringify(emailResult.error, null, 2));
    } else {
      console.log('[generate-token] step 6: done, email id:', emailResult.data?.id);
    }
    console.log('[generate-token] step 6: full Resend response:', JSON.stringify(emailResult, null, 2));
  } catch (emailErr) {
    console.error('[generate-token] welcome email thrown error:', emailErr);
  }

  console.log('[generate-token] complete — returning success');
  return NextResponse.json(
    { url: intakeUrl, token, expires_at, payment_link_url: paymentLinkUrl },
    { headers: { 'Cache-Control': 'no-store, no-cache' } }
  );
}

interface WelcomeEmailData {
  firstName: string;
  formattedDate: string;
  formattedTime: string;
  sessionFormat: string;
  location: string;
  feeEuros: number;
  intakeUrl: string;
  paymentUrl: string;
  siteUrl: string;
}

function buildWelcomeHtml(d: WelcomeEmailData): string {
  const locationLine = d.sessionFormat === 'in_person'
    ? `<tr><td style="padding:8px 0;color:#777;border-bottom:1px solid #F0EAE0;vertical-align:top;">Location</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;">${d.location}</td></tr>`
    : '';

  const paymentBtn = d.paymentUrl
    ? `<a href="${d.paymentUrl}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">PAY €${d.feeEuros}</a>`
    : `<p style="color:#666;font-size:14px;">Owen will send you payment details separately.</p>`;

  const logoUrl = `${d.siteUrl}/images/logo-horizontal-dark-bg.svg`;

  return `
<div style="background-color:#F5F0E8;padding:40px 20px;font-family:Arial,sans-serif;max-width:580px;margin:0 auto;">
  <div style="background-color:#2A4D3C;padding:24px 30px;text-align:center;border-radius:8px 8px 0 0;">
    <img src="${logoUrl}" alt="Owen Lynch Psychotherapy" width="200" style="max-width:200px;height:auto;display:inline-block;" />
  </div>
  <div style="background-color:#FFFFFF;padding:40px;border-radius:0 0 8px 8px;">
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${d.firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Thank you for reaching out. I've received your details and I'm looking forward to meeting you. Please take your time with the intake form — there are no right or wrong answers, and anything you're unsure about we can explore together in our first session.
    </p>
    <p style="font-size:11px;color:#2A4D3C;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 12px;">Your first session</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;margin:0 0 32px;">
      <tr><td style="padding:8px 0;color:#777;border-bottom:1px solid #F0EAE0;">Date</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;">${d.formattedDate}</td></tr>
      <tr><td style="padding:8px 0;color:#777;border-bottom:1px solid #F0EAE0;">Time</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;">${d.formattedTime}</td></tr>
      <tr><td style="padding:8px 0;color:#777;border-bottom:1px solid #F0EAE0;">Format</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;">${d.sessionFormat === 'in_person' ? 'In Person' : 'Online'}</td></tr>
      ${locationLine}
      <tr>
        ${d.sessionFormat === 'online' ? `<td colspan="2" style="padding:8px 0;color:#555;font-size:13px;font-style:italic;">I'll send you a link to join shortly before your session.</td>` : '<td></td><td></td>'}
      </tr>
    </table>

    <div style="background-color:#F5F0E8;border:1px solid #E0D8CE;border-left:3px solid #D4A843;border-radius:6px;padding:18px 20px;margin:0 0 24px;">
      <p style="font-size:11px;color:#2A4D3C;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 10px;">Attached to this email</p>
      <p style="color:#555;font-size:13px;line-height:1.7;margin:0 0 10px;">
        I've attached two documents to this email for you to read before our first session:
      </p>
      <ul style="margin:0 0 10px;padding:0 0 0 18px;color:#555;font-size:13px;line-height:1.7;">
        <li><strong style="color:#2A4D3C;">Client Information &amp; Therapeutic Agreement</strong> — this outlines how we work together, confidentiality, cancellation policy, and other important information.</li>
        <li><strong style="color:#2A4D3C;">Privacy Policy</strong> — this explains how I store and protect your data.</li>
      </ul>
      <p style="color:#666;font-size:12px;line-height:1.6;margin:0;font-style:italic;">
        Your agreement to both documents is confirmed via the intake form.
      </p>
    </div>

    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 8px;">Before we meet, I'd ask you to do two things:</p>

    <div style="margin:24px 0;">
      <p style="color:#2A4D3C;font-size:13px;font-weight:600;margin:0 0 8px;">1. Complete your intake form</p>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 16px;">
        This gives me some background before we meet and takes about 10 minutes.
      </p>
      <a href="${d.intakeUrl}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">COMPLETE INTAKE FORM</a>
    </div>

    <div style="margin:32px 0 0;">
      <p style="color:#2A4D3C;font-size:13px;font-weight:600;margin:0 0 8px;">2. Pay for your session in advance to secure your slot</p>
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 16px;">
        Payment is handled securely via Stripe.
      </p>
      ${paymentBtn}
    </div>

    <hr style="border:none;border-top:1px solid #F0EAE0;margin:32px 0;">
    <p style="color:#666;font-size:13px;line-height:1.7;margin:0 0 20px;">
      If you have any questions or need to reschedule, please don't hesitate to email me at
      <a href="mailto:info@owenlynchtherapy.com" style="color:#C85A1A;text-decoration:none;">info@owenlynchtherapy.com</a>.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 4px;">Looking forward to working with you.</p>
    <p style="color:#2A4D3C;font-size:14px;margin:16px 0 0;font-weight:500;">Owen Lynch<br>
    <span style="font-weight:400;font-size:13px;color:#666;">Owen Lynch Psychotherapy<br>
    owenlynchtherapy.com<br>
    IAHIP &amp; ICP Accredited</span></p>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <p style="color:#2A4D3C;font-size:11px;opacity:0.6;letter-spacing:1px;margin:0;">
      owenlynchtherapy.com · IAHIP &amp; ICP Accredited · Dublin &amp; Online
    </p>
  </div>
</div>`;
}
