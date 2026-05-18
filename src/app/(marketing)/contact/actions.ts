'use server';

import { redirect } from 'next/navigation';
import { Resend } from 'resend';

export async function submitContactForm(formData: FormData) {
  // Honeypot: if bot filled the hidden field, silently redirect as success
  const honeypot = ((formData.get('website') as string) ?? '').trim();
  if (honeypot) {
    redirect('/contact?sent=1');
  }

  const firstName = ((formData.get('firstName') as string) ?? '').trim();
  const lastName  = ((formData.get('lastName')  as string) ?? '').trim();
  const email     = ((formData.get('email')     as string) ?? '').trim();
  const phone     = ((formData.get('phone')     as string) ?? '').trim();
  const message   = ((formData.get('message')   as string) ?? '').trim();

  if (!firstName || !lastName || !email || !message) {
    redirect('/contact?error=1');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: 'info@owenlynchtherapy.com',
    subject: `New enquiry from ${firstName} ${lastName}`,
    html: `
      <table style="font-family:sans-serif;font-size:14px;color:#333;max-width:560px;width:100%">
        <tr><td style="padding-bottom:24px">
          <h2 style="margin:0;font-size:20px;font-weight:400;color:#2a4d3c">
            New contact form submission
          </h2>
        </td></tr>
        <tr><td style="padding-bottom:8px"><strong>Name:</strong> ${firstName} ${lastName}</td></tr>
        <tr><td style="padding-bottom:8px"><strong>Email:</strong>
          <a href="mailto:${email}" style="color:#c85a1a">${email}</a>
        </td></tr>
        <tr><td style="padding-bottom:24px"><strong>Phone:</strong> ${phone || 'not provided'}</td></tr>
        <tr><td style="padding-bottom:8px;border-top:1px solid #e5e5e5;padding-top:24px">
          <strong>Message:</strong>
        </td></tr>
        <tr><td style="white-space:pre-wrap;line-height:1.7">${message}</td></tr>
      </table>
    `,
  });

  if (error) {
    console.error('[contact form] resend error', error);
    redirect('/contact?error=1');
  }

  redirect('/contact?sent=1');
}
