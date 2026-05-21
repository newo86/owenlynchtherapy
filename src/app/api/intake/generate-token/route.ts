import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { stripe } from '@/lib/stripe';
import { rateLimit } from '@/lib/rateLimit';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const VALID_FORMATS = ['in_person', 'online'];

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
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
  const intakeUrl = `https://owenlynchtherapy.com/intake?token=${token}`;

  // Date formatting for email and Stripe description
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

  // 2. Insert client record
  const { data: clientRow, error: clientErr } = await supabaseAdmin.from('clients').insert({
    full_name: client_name.trim(),
    email: client_email.trim(),
    session_fee: feeInCents,
    status: 'active',
  }).select().single();

  if (clientErr || !clientRow) {
    console.error('[generate-token] client insert error:', JSON.stringify(clientErr, null, 2));
    return NextResponse.json({ error: 'Failed to create client record' }, { status: 500 });
  }

  // 3. Insert session record (without payment link yet)
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
    return NextResponse.json({ error: 'Failed to create session record' }, { status: 500 });
  }

  // 4. Create Stripe price + payment link
  let paymentLinkUrl = '';
  let paymentLinkId = '';
  try {
    const price = await stripe.prices.create({
      currency: 'eur',
      unit_amount: feeInCents,
      product_data: {
        name: `Psychotherapy Session — ${formattedDate} at ${formattedTime}`,
      },
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: {
        type: 'redirect',
        redirect: { url: 'https://owenlynchtherapy.com/payment-confirmed' },
      },
      metadata: {
        session_id: sessionRow.id,
        client_name: client_name.trim(),
        client_email: client_email.trim(),
      },
    });

    paymentLinkUrl = paymentLink.url;
    paymentLinkId = paymentLink.id;

    // 5. Update session with payment link details
    await supabaseAdmin
      .from('sessions')
      .update({
        stripe_payment_link_id: paymentLinkId,
        stripe_payment_link_url: paymentLinkUrl,
      })
      .eq('id', sessionRow.id);
  } catch (stripeErr) {
    console.error('[generate-token] Stripe error:', stripeErr);
    // Don't fail the whole request — intake link is still usable, Owen can create payment link manually
    paymentLinkUrl = '';
  }

  // 6. Send welcome email to client
  // TODO: change from to info@owenlynchtherapy.com once Resend domain is verified.
  // Note: until domain is verified, Resend restricts sending to verified addresses only (owenlynch1310@gmail.com).
  const firstName = client_name.trim().split(' ')[0];
  try {
    const emailResult = await resend.emails.send({
      from: 'Owen Lynch Psychotherapy <onboarding@resend.dev>',
      to: client_email.trim(),
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
      }),
    });
    if (emailResult.error) {
      console.error('[generate-token] welcome email error:', JSON.stringify(emailResult.error, null, 2));
    } else {
      console.log('[generate-token] welcome email sent, id:', emailResult.data?.id);
    }
  } catch (emailErr) {
    console.error('[generate-token] welcome email thrown error:', emailErr);
  }

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
}

function buildWelcomeHtml(d: WelcomeEmailData): string {
  const locationLine = d.sessionFormat === 'in_person'
    ? `<tr><td style="padding:8px 0;color:#777;border-bottom:1px solid #F0EAE0;vertical-align:top;">Location</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;">${d.location}</td></tr>`
    : '';

  const paymentBtn = d.paymentUrl
    ? `<a href="${d.paymentUrl}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">PAY €${d.feeEuros}</a>`
    : `<p style="color:#666;font-size:14px;">Owen will send you payment details separately.</p>`;

  return `
<div style="background-color:#F5F0E8;padding:40px 20px;font-family:Arial,sans-serif;max-width:580px;margin:0 auto;">
  <div style="background-color:#2A4D3C;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
    <p style="color:#C85A1A;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px 0;">Owen Lynch</p>
    <p style="color:#FFFFFF;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0;">Psychotherapy</p>
  </div>
  <div style="background-color:#FFFFFF;padding:40px;border-radius:0 0 8px 8px;">
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${d.firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Thank you for reaching out. I'm looking forward to meeting you.
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
