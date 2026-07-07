import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getResend } from '@/lib/resend';
import { buildReceiptHtml, EMAIL_FROM } from '@/lib/emailTemplates';
import { PRACTICE } from '@/practice.config';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Send a sample receipt to a chosen address so the practitioner can check what
 * clients receive and confirm the email pipeline is working (e.g. after the
 * Resend key is rotated). It uses the real receipt template with obviously-fake
 * "sample" data, and is admin-only. Nothing about a real client is touched.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body.email ?? '').trim();
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: 'Please enter a valid email address to send the test to.' }, { status: 400, headers: noCache });
  }

  // Tell the truth: while the kill switch is off, getResend() silently swallows
  // the send, so a "sent!" message would be a lie. Surface it instead.
  if (process.env.EMAILS_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'Emails are currently switched off (the EMAILS_ENABLED safety switch). Turn emails back on before testing.' },
      { status: 409, headers: noCache },
    );
  }

  const now = new Date();
  const date = now.toLocaleDateString('en-IE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin',
  });
  const time = now.toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });

  let emailResult;
  try {
    emailResult = await getResend().emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `[Test] Receipt — Psychotherapy Session with ${PRACTICE.practitionerName}`,
      html: buildReceiptHtml({
        firstName: 'there',
        fullName: 'Sample Client',
        date,
        time,
        feeEuros: Math.round(PRACTICE.fees.inPersonCents / 100),
        sessionFormat: 'in_person',
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[receipts/test] send threw:', msg);
    return NextResponse.json({ error: 'Could not send the test — the email service is not configured correctly.' }, { status: 500, headers: noCache });
  }

  if (emailResult.error) {
    console.error('[receipts/test] Resend error:', JSON.stringify(emailResult.error, null, 2));
    return NextResponse.json({ error: 'The email service rejected the test send. Check the email settings and try again.' }, { status: 502, headers: noCache });
  }

  console.log('[receipts/test] sample receipt sent');
  return NextResponse.json({ success: true }, { headers: noCache });
}
