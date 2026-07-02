'use server';

import { redirect } from 'next/navigation';
import { getResend } from '@/lib/resend';
import { escapeHtml } from '@/lib/sanitise';

export async function submitContactForm(formData: FormData) {
  // Honeypot: if bot filled the hidden field, silently redirect as success
  const honeypot = ((formData.get('website') as string) ?? '').trim();
  if (honeypot) {
    redirect('/contact?sent=1');
  }

  // Turnstile verification — skip if secret key not configured (e.g. local dev)
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  if (turnstileSecret) {
    const token = ((formData.get('cf-turnstile-response') as string) ?? '').trim();
    if (!token) {
      redirect('/contact?error=1');
    }
    const verifyRes = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: turnstileSecret, response: token }),
      }
    );
    const verifyData = (await verifyRes.json()) as { success: boolean };
    if (!verifyData.success) {
      redirect('/contact?error=1');
    }
  }

  const firstName = ((formData.get('firstName') as string) ?? '').trim().slice(0, 100);
  const lastName  = ((formData.get('lastName')  as string) ?? '').trim().slice(0, 100);
  const email     = ((formData.get('email')     as string) ?? '').trim().slice(0, 254);
  const phone     = ((formData.get('phone')     as string) ?? '').trim().slice(0, 40);
  const message   = ((formData.get('message')   as string) ?? '').trim().slice(0, 5000);

  if (!firstName || !lastName || !email || !message) {
    redirect('/contact?error=1');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect('/contact?error=1');
  }

  // Escape everything user-supplied before it goes into the HTML email —
  // otherwise an anonymous visitor controls markup rendered in the
  // practitioner's inbox (phishing links, tracking pixels, layout breakout).
  const safe = {
    firstName: escapeHtml(firstName),
    lastName: escapeHtml(lastName),
    email: escapeHtml(email),
    phone: escapeHtml(phone),
    message: escapeHtml(message),
  };

  const { error } = await getResend().emails.send({
    from: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
    to: 'info@owenlynchtherapy.com',
    subject: `New enquiry from ${firstName} ${lastName}`.replace(/[\r\n]+/g, ' '),
    html: `
      <table style="font-family:sans-serif;font-size:14px;color:#333;max-width:560px;width:100%">
        <tr><td style="padding-bottom:24px">
          <h2 style="margin:0;font-size:20px;font-weight:400;color:#2a4d3c">
            New contact form submission
          </h2>
        </td></tr>
        <tr><td style="padding-bottom:8px"><strong>Name:</strong> ${safe.firstName} ${safe.lastName}</td></tr>
        <tr><td style="padding-bottom:8px"><strong>Email:</strong>
          <a href="mailto:${safe.email}" style="color:#c85a1a">${safe.email}</a>
        </td></tr>
        <tr><td style="padding-bottom:24px"><strong>Phone:</strong> ${safe.phone || 'not provided'}</td></tr>
        <tr><td style="padding-bottom:8px;border-top:1px solid #e5e5e5;padding-top:24px">
          <strong>Message:</strong>
        </td></tr>
        <tr><td style="white-space:pre-wrap;line-height:1.7">${safe.message}</td></tr>
      </table>
    `,
  });

  if (error) {
    console.error('[contact form] resend error', error);
    redirect('/contact?error=1');
  }

  redirect('/contact?sent=1');
}
