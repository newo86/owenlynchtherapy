import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import {
  buildReceiptHtml,
  sessionKind,
  STRIPE_LINK_IN_PERSON,
  STRIPE_LINK_ONLINE,
} from '@/lib/emailTemplates';

// Must be force-dynamic so Next.js never pre-renders or caches this route.
// A cached response would consume request.body before Stripe's raw-body
// verification runs, causing every signature check to fail.
export const dynamic = 'force-dynamic';

type SessionRecord = {
  id: string;
  client_id: string;
  session_date: string;
  session_format: string;
  fee: number;
  status: string;
  payment_status: string;
  receipt_sent_at: string | null;
  clients: { id: string; full_name: string; email: string; is_low_cost?: boolean } | null;
};

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

  // checkout.session.completed fires for card payments; async_payment_succeeded
  // covers delayed methods (e.g. bank debits) that complete later. Both are
  // gated on payment_status === 'paid' so nothing happens for pending payments.
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    console.log(`[stripe-webhook] Unhandled event type: ${event.type} — ignoring`);
    return new Response('OK', { status: 200 });
  }

  const checkout = event.data.object as Stripe.Checkout.Session;

  if (checkout.payment_status !== 'paid') {
    console.log(`[stripe-webhook] payment_status=${checkout.payment_status} — skipping until payment is confirmed`);
    return new Response('OK', { status: 200 });
  }

  const session = await matchSession(checkout);
  if (!session) {
    console.warn(`[stripe-webhook] Could not match checkout ${checkout.id} to a session — review manually in the dashboard`);
    // 200 so Stripe doesn't retry forever; the warning is the audit trail.
    return new Response('OK', { status: 200 });
  }

  if (session.clients?.is_low_cost) {
    // Low-cost sessions are cash-only and recorded manually — a Stripe payment
    // landing here would be unexpected, so log loudly and do nothing.
    console.warn(`[stripe-webhook] Checkout ${checkout.id} matched low-cost client session ${session.id} — skipping (cash only)`);
    return new Response('OK', { status: 200 });
  }

  const paymentIntentId =
    typeof checkout.payment_intent === 'string'
      ? checkout.payment_intent
      : checkout.payment_intent?.id ?? null;

  const alreadyPaid = session.payment_status === 'paid';

  // 1. Mark the session paid in Supabase.
  if (!alreadyPaid) {
    const { error: updateErr } = await supabaseAdmin
      .from('sessions')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
        ...(paymentIntentId ? { stripe_payment_intent_id: paymentIntentId } : {}),
      })
      .eq('id', session.id);

    if (updateErr) {
      console.error('[stripe-webhook] Supabase update failed for session', session.id, JSON.stringify(updateErr, null, 2));
      // Return 200 so Stripe does not endlessly retry a data error.
      return new Response('OK', { status: 200 });
    }
    console.log(`[stripe-webhook] Session ${session.id} marked paid (payment_intent=${paymentIntentId ?? 'none'})`);
  } else {
    console.log(`[stripe-webhook] Session ${session.id} already marked paid — skipping update`);
  }

  // 2. Log the payment in the finance ledger. The unique constraint on
  //    stripe_checkout_session_id makes retried webhooks idempotent.
  const kind = sessionKind(session.session_format, false);
  const { error: ledgerErr } = await supabaseAdmin.from('payments').insert({
    session_id: session.id,
    client_id: session.client_id,
    amount_cents: checkout.amount_total ?? session.fee,
    currency: checkout.currency ?? 'eur',
    session_type: kind,
    method: 'stripe',
    stripe_checkout_session_id: checkout.id,
    stripe_payment_intent_id: paymentIntentId,
    paid_at: new Date().toISOString(),
  });
  if (ledgerErr) {
    if (ledgerErr.code === '23505') {
      console.log(`[stripe-webhook] Payment for checkout ${checkout.id} already logged — skipping (idempotency guard)`);
    } else {
      console.warn('[stripe-webhook] Could not log payment (run the payments migration):', ledgerErr.message);
    }
  }

  // 3. Send the receipt — only once.
  if (!session.clients?.email) {
    console.warn(`[stripe-webhook] No client email on session ${session.id} — skipping receipt`);
  } else if (session.receipt_sent_at) {
    console.log(`[stripe-webhook] Receipt already sent for session ${session.id} — skipping (idempotency guard)`);
  } else {
    await sendReceipt(session.clients, session, checkout.amount_total);
    await supabaseAdmin
      .from('sessions')
      .update({ receipt_sent_at: new Date().toISOString() })
      .eq('id', session.id);
  }

  return new Response('OK', { status: 200 });
}

/**
 * Match a Stripe checkout session to a Supabase session row.
 *  1. client_reference_id — set when the payment link was emailed in a
 *     reminder (?client_reference_id=<session_id>). Exact match.
 *  2. metadata.session_id — legacy per-session payment links.
 *  3. Fallback: payment link → session type (online vs in-person) plus the
 *     payer's email → that client's oldest unpaid, non-cancelled session of
 *     the matching type.
 */
async function matchSession(checkout: Stripe.Checkout.Session): Promise<SessionRecord | null> {
  const directId = checkout.client_reference_id ?? checkout.metadata?.session_id ?? null;
  if (directId) {
    const { data } = await supabaseAdmin
      .from('sessions')
      .select('*, clients(*)')
      .eq('id', directId)
      .single();
    if (data) return data as SessionRecord;
    console.warn(`[stripe-webhook] client_reference_id ${directId} did not match a session — falling back to email match`);
  }

  // Which session type does the payment link imply?
  const paymentLinkId =
    typeof checkout.payment_link === 'string' ? checkout.payment_link : checkout.payment_link?.id ?? null;
  let format: string | null = null;
  if (paymentLinkId) {
    try {
      const link = await getStripe().paymentLinks.retrieve(paymentLinkId);
      if (link.url === STRIPE_LINK_ONLINE) format = 'online';
      else if (link.url === STRIPE_LINK_IN_PERSON) format = 'in_person';
    } catch (err) {
      console.warn('[stripe-webhook] Could not retrieve payment link', paymentLinkId, err);
    }
  }

  const email = checkout.customer_details?.email ?? checkout.customer_email ?? null;
  if (!email) return null;

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id')
    .ilike('email', email)
    .maybeSingle();
  if (!client) return null;

  let query = supabaseAdmin
    .from('sessions')
    .select('*, clients(*)')
    .eq('client_id', client.id)
    .neq('payment_status', 'paid')
    .neq('status', 'cancelled')
    .order('session_date', { ascending: true })
    .limit(1);
  if (format) query = query.eq('session_format', format);

  const { data: candidates } = await query;
  return (candidates?.[0] as SessionRecord | undefined) ?? null;
}

async function sendReceipt(
  client: { full_name: string; email: string },
  session: { session_date: string; fee: number; session_format: string },
  amountTotal: number | null,
) {
  const firstName = client.full_name.split(' ')[0];
  const feeEuros = Math.round((amountTotal ?? session.fee) / 100);
  const sessionDate = new Date(session.session_date);
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
    html: buildReceiptHtml({
      firstName,
      date: formattedDate,
      time: formattedTime,
      feeEuros,
      sessionFormat: session.session_format,
    }),
  });

  if (emailResult.error) {
    console.error('[stripe-webhook] Receipt email failed:', JSON.stringify(emailResult.error, null, 2));
  } else {
    console.log(`[stripe-webhook] Receipt sent to ${client.email}`);
  }
}
