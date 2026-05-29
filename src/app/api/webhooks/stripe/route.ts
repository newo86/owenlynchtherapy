import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';

// App Router route handlers receive a raw Request — no body-parser config needed.
// We read the raw body with request.text() which Stripe webhook verification requires.


export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not set');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object;

    // payment_status is set to 'paid' when the checkout completes with successful payment
    if (checkoutSession.payment_status !== 'paid') {
      return new Response('OK', { status: 200 });
    }

    const supabaseSessionId = checkoutSession.metadata?.session_id;
    const paymentIntentId = typeof checkoutSession.payment_intent === 'string'
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id ?? null;

    if (!supabaseSessionId) {
      console.warn('[stripe-webhook] checkout.session.completed missing metadata.session_id');
      return new Response('OK', { status: 200 });
    }

    // Update session: mark paid, store payment_intent_id and paid_at timestamp
    const { data: session, error: updateErr } = await supabaseAdmin
      .from('sessions')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      })
      .eq('id', supabaseSessionId)
      .select('*, clients(*)')
      .single();

    if (updateErr || !session) {
      console.error('[stripe-webhook] session update error:', JSON.stringify(updateErr, null, 2));
      return new Response('OK', { status: 200 }); // Return 200 to prevent Stripe retries
    }

    console.log('[stripe-webhook] payment confirmed for session:', supabaseSessionId);

    // Send receipt immediately on payment (Resend custom receipt)
    // Idempotency: only send a receipt once. Stripe may deliver the same
    // checkout.session.completed event more than once; without this guard a
    // replay would email the client a duplicate receipt.
    const client = (session as { clients: { full_name: string; email: string } }).clients;
    if (client?.email && !(session as { receipt_sent_at?: string | null }).receipt_sent_at) {
      await sendReceipt(client, session);
      await supabaseAdmin
        .from('sessions')
        .update({ receipt_sent_at: new Date().toISOString() })
        .eq('id', supabaseSessionId);
    }
  }

  return new Response('OK', { status: 200 });
}

async function sendReceipt(
  client: { full_name: string; email: string },
  session: { session_date: unknown; fee: unknown },
) {
  const firstName = client.full_name.split(' ')[0];
  const feeEuros = Math.round((session.fee as number) / 100);
  const sessionDate = new Date(session.session_date as string);
  const formattedDate = sessionDate.toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin',
  });
  const formattedTime = sessionDate.toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });

  const emailResult = await getResend().emails.send({
    from: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
    to: client.email,
    subject: 'Receipt — Psychotherapy Session with Owen Lynch',
    html: buildReceiptHtml(firstName, formattedDate, formattedTime, feeEuros),
  });

  if (emailResult.error) {
    console.error('[stripe-webhook] receipt email error:', JSON.stringify(emailResult.error, null, 2));
  } else {
    console.log('[stripe-webhook] receipt sent');
  }
}

function buildReceiptHtml(firstName: string, date: string, time: string, feeEuros: number): string {
  return `
<div style="background-color:#F5F0E8;padding:40px 20px;font-family:Arial,sans-serif;max-width:580px;margin:0 auto;">
  <div style="background-color:#2A4D3C;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
    <p style="color:#C85A1A;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px 0;">Owen Lynch</p>
    <p style="color:#FFFFFF;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0;">Psychotherapy</p>
  </div>
  <div style="background-color:#FFFFFF;padding:40px;border-radius:0 0 8px 8px;">
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 28px;">Please find your receipt below for your recent session.</p>
    <div style="border:1px solid #E0D8CE;border-radius:8px;padding:24px;background:#FAF7F2;margin:0 0 28px;">
      <p style="font-size:11px;color:#2A4D3C;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 16px;">Receipt</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
        <tr>
          <td style="padding:7px 0;color:#777;border-bottom:1px solid #F0EAE0;">Date</td>
          <td style="padding:7px 0;text-align:right;border-bottom:1px solid #F0EAE0;">${date} at ${time}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#777;border-bottom:1px solid #F0EAE0;">Service</td>
          <td style="padding:7px 0;text-align:right;border-bottom:1px solid #F0EAE0;">Psychotherapy Session (50 minutes)</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-weight:600;color:#2A4D3C;font-size:15px;">Amount</td>
          <td style="padding:10px 0;text-align:right;font-weight:600;color:#2A4D3C;font-size:15px;">€${feeEuros}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#777;">Status</td>
          <td style="padding:7px 0;text-align:right;color:#4F8A68;font-weight:500;">Paid</td>
        </tr>
      </table>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 12px;">
      Thank you for your payment. If you have any questions, please email
      <a href="mailto:info@owenlynchtherapy.com" style="color:#C85A1A;text-decoration:none;">info@owenlynchtherapy.com</a>.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">See you at your next session.</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">Owen</p>
  </div>
  <div style="text-align:center;margin-top:24px;">
    <p style="color:#2A4D3C;font-size:11px;opacity:0.6;letter-spacing:1px;margin:0;">
      owenlynchtherapy.com · IAHIP &amp; ICP Accredited · Dublin &amp; Online
    </p>
  </div>
</div>`;
}
