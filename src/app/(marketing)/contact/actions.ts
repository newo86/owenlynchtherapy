'use server';

import { redirect } from 'next/navigation';

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

  // TODO: wire up an email provider (e.g. Resend, Nodemailer) here.
  // Example with Resend:
  //   import { Resend } from 'resend';
  //   const resend = new Resend(process.env.RESEND_API_KEY);
  //   await resend.emails.send({
  //     from: 'website@owenlynchtherapy.com',
  //     to: 'info@owenlynchtherapy.com',
  //     subject: `New enquiry from ${firstName} ${lastName}`,
  //     text: `Name: ${firstName} ${lastName}\nEmail: ${email}\nPhone: ${phone || 'not provided'}\n\n${message}`,
  //   });

  console.log('[contact form]', { firstName, lastName, email, phone, message });

  redirect('/contact?sent=1');
}
