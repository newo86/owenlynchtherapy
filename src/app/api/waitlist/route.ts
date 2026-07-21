import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';
import { rateLimit } from '@/lib/rateLimit';
import { rateLimitDurable } from '@/lib/rateLimitDurable';
import { escapeHtml, sanitiseInput } from '@/lib/sanitise';
import { WAITLIST_CONSENT_TEXT } from '@/lib/waitlistConsent';
import { EMAIL_FROM, CONTACT_EMAIL } from '@/lib/emailTemplates';
import { SITE_URL } from '@/practice.config';

// Public waiting-list signup (in-person sessions currently full).
//
// GDPR: name, email, optional phone, and an OPTIONAL free-text note ("what
// brings you to therapy") which can include health / special-category data.
// Explicit consent is required (the form's checkbox — its exact wording, which
// now covers the note, is stored alongside the entry) and entries are erasable
// from the dashboard.

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit('waitlist', ip, 5, 15 * 60 * 1000)
      || !(await rateLimitDurable('waitlist', ip, 5, 15 * 60 * 1000))) {
    return NextResponse.json({ error: 'Too many requests — please try again later.' }, { status: 429 });
  }

  let body: { full_name?: string; email?: string; phone?: string; reason?: string; consent?: boolean; website?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot — bots fill the hidden "website" field; pretend success.
  if ((body.website ?? '').trim() !== '') {
    return NextResponse.json({ ok: true });
  }

  const fullName = (body.full_name ?? '').trim().slice(0, 120);
  const email = (body.email ?? '').trim().slice(0, 254);
  const phone = (body.phone ?? '').trim().slice(0, 40);
  // Optional free text — sanitise and cap. Empty stays null.
  const reason = sanitiseInput((body.reason ?? '').trim()).slice(0, 1000);

  if (!fullName || !email) {
    return NextResponse.json({ error: 'Please fill in your name and email.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address doesn't look right — please check it." }, { status: 400 });
  }
  // Consent must be explicit — the API refuses without it, so a UI bug can
  // never store details that weren't consented to.
  if (body.consent !== true) {
    return NextResponse.json({ error: 'Please tick the consent box so we may store your details.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('waitlist').insert({
    full_name: fullName,
    email,
    phone: phone || null,
    reason: reason || null,
    consent_text: WAITLIST_CONSENT_TEXT,
  });

  if (error) {
    if (error.code === '23505') {
      // Already on the list — that's fine, tell them so.
      return NextResponse.json({ ok: true, already: true });
    }
    console.error('[waitlist] insert failed:', error.message);
    return NextResponse.json({ error: 'Something went wrong — please try again.' }, { status: 500 });
  }

  // Heads-up to the practitioner (best-effort; respects the kill switch).
  try {
    await getResend().emails.send({
      from: EMAIL_FROM,
      to: CONTACT_EMAIL,
      subject: 'New waiting-list signup',
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.7;max-width:560px;">
        <p><strong>${escapeHtml(fullName)}</strong> joined the waiting list.</p>
        <p>Email: ${escapeHtml(email)}${phone ? `<br/>Phone: ${escapeHtml(phone)}` : ''}</p>
        ${reason ? `<p style="margin-top:12px"><strong>What brings them to therapy:</strong><br/>${escapeHtml(reason).replace(/\n/g, '<br/>')}</p>` : ''}
        <p>View the list in the <a href="${SITE_URL}/admin/intake">dashboard</a> → Waitlist.</p>
      </div>`,
    });
  } catch (err) {
    console.error('[waitlist] notification email failed:', err instanceof Error ? err.message : String(err));
  }

  return NextResponse.json({ ok: true });
}
