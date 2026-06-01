import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';

// Must be force-dynamic so Next.js never pre-renders or caches this route.
// A cached response would consume request.body before Stripe's raw-body
// verification runs, causing every signature check to fail.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Guard env vars up-front so missing config produces a clear 500 log rather
  // than a confusing 400 "signature failed" from inside the try/catch.
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set — add it to Vercel environment variables');
    return new Response('Webhook secret not configured', { status: 500 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe-webhook] STRIPE_SECRET_KEY is not set — add it to Vercel environment variables');
    return new Response('Stripe not configured', { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('[stripe-webhook] Missing stripe-signature header');
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Signature verification failed:', msg);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  console.log(`[stripe-webhook] Received: ${event.type} (${event.id})`);

  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;

    if (checkoutSession.payment_status !== 'paid') {
      console.log(`[stripe-webhook] payment_status=${checkoutSession.payment_status} — skipping`);
      return new Response('OK', { status: 200 });
    }

    const supabaseSessionId = checkoutSession.metadata?.session_id;
    const paymentIntentId =
      typeof checkoutSession.payment_intent === 'string'
        ? checkoutSession.payment_intent
        : checkoutSession.payment_intent?.id ?? null;

    if (!supabaseSessionId) {
      console.warn('[stripe-webhook] checkout.session.completed has no metadata.session_id — cannot update session record');
      return new Response('OK', { status: 200 });
    }

    console.log(`[stripe-webhook] Marking session ${supabaseSessionId} paid (payment_intent=${paymentIntentId ?? 'none'})`);

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
      console.error(
        '[stripe-webhook] Supabase update failed for session',
        supabaseSessionId,
        JSON.stringify(updateErr ?? { reason: 'no row returned' }, null, 2),
      );
      // Return 200 so Stripe does not endlessly retry a data error.
      return new Response('OK', { status: 200 });
    }

    console.log(`[stripe-webhook] Session ${supabaseSessionId} marked paid`);

    type SessionWithClient = typeof session & {
      clients: { full_name: string; email: string } | null;
      receipt_sent_at?: string | null;
    };
    const s = session as SessionWithClient;

    if (!s.clients?.email) {
      console.warn(`[stripe-webhook] No client email on session ${supabaseSessionId} — skipping receipt`);
    } else if (s.receipt_sent_at) {
      console.log(`[stripe-webhook] Receipt already sent for session ${supabaseSessionId} — skipping (idempotency guard)`);
    } else {
      await sendReceipt(s.clients, s);
      await supabaseAdmin
        .from('sessions')
        .update({ receipt_sent_at: new Date().toISOString() })
        .eq('id', supabaseSessionId);
    }
  } else {
    console.log(`[stripe-webhook] Unhandled event type: ${event.type} — ignoring`);
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
    console.error('[stripe-webhook] Receipt email failed:', JSON.stringify(emailResult.error, null, 2));
  } else {
    console.log(`[stripe-webhook] Receipt sent to ${client.email}`);
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
