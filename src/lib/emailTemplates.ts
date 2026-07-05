// Shared client-facing email templates. Single source of truth for the
// reminder and receipt HTML so the manual admin routes, the Stripe webhook
// and the reminder cron all send identical, on-brand emails.
//
// The practice-specific bits (telehealth room, venue, Stripe links, from
// address) are re-exported from the master config so a cloned practice's
// emails and calendar events use ITS details, never Owen's.
import { PRACTICE } from '@/practice.config';

export const DOXY_URL = PRACTICE.telehealthUrl;
export const INSIGHT_MATTERS_ADDRESS =
  `${PRACTICE.address.venue}, ${PRACTICE.address.streetAddress}, ${PRACTICE.address.addressLocality}, ${PRACTICE.address.postalCode}`;
/** From-address for all outgoing mail (Resend-verified domain). */
export const EMAIL_FROM = PRACTICE.emailFrom;
/** Practice reply-to / contact address. */
export const CONTACT_EMAIL = PRACTICE.email;

// Stripe payment links. Static links — per-session matching is done by
// appending ?client_reference_id=<session_id> when the link is emailed.
export const STRIPE_LINK_ONLINE    = PRACTICE.stripeLinks.online;
export const STRIPE_LINK_IN_PERSON = PRACTICE.stripeLinks.inPerson;

/** The three billing categories a session can fall into. Low cost is a
 *  property of the client (clients.is_low_cost), not the session format. */
export type SessionKind = 'online' | 'in_person' | 'low_cost';

export function sessionKind(sessionFormat: string, isLowCost: boolean): SessionKind {
  if (isLowCost) return 'low_cost';
  return sessionFormat === 'online' ? 'online' : 'in_person';
}

export const KIND_LABELS: Record<SessionKind, string> = {
  online: 'Online',
  in_person: 'In Person',
  low_cost: 'Low Cost',
};

/** Stripe payment link for a session, with the session id attached as
 *  client_reference_id so the webhook can match the payment exactly.
 *  Low-cost sessions are cash-only — no link. */
export function paymentLinkFor(kind: SessionKind, sessionId: string, email?: string): string | null {
  if (kind === 'low_cost') return null;
  const base = kind === 'online' ? STRIPE_LINK_ONLINE : STRIPE_LINK_IN_PERSON;
  const params = new URLSearchParams({ client_reference_id: sessionId });
  if (email) params.set('prefilled_email', email);
  return `${base}?${params.toString()}`;
}

// ── Shared shell ────────────────────────────────────────────────────────────

const SITE_HOST = PRACTICE.siteUrl.replace('https://', '');
const BRAND_TOP = PRACTICE.practitionerName;
const BRAND_SUB = PRACTICE.businessName.replace(PRACTICE.practitionerName, '').trim() || PRACTICE.jobTitle;

function emailShell(body: string): string {
  return `
<div style="background-color:#F5F0E8;padding:40px 20px;font-family:Arial,sans-serif;max-width:580px;margin:0 auto;">
  <div style="background-color:#2A4D3C;padding:30px;text-align:center;border-radius:8px 8px 0 0;">
    <p style="color:#C85A1A;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px 0;">${BRAND_TOP}</p>
    <p style="color:#FFFFFF;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin:0;">${BRAND_SUB}</p>
  </div>
  <div style="background-color:#FFFFFF;padding:40px;border-radius:0 0 8px 8px;">
    ${body}
  </div>
  <div style="text-align:center;margin-top:24px;">
    <p style="color:#2A4D3C;font-size:11px;opacity:0.6;letter-spacing:1px;margin:0;">
      ${SITE_HOST} &middot; ${PRACTICE.accreditation.summary.replace(/&/g, "&amp;")} &middot; ${PRACTICE.serviceArea.replace(/&/g, "&amp;")}
    </p>
  </div>
</div>`;
}

// ── Reminder ────────────────────────────────────────────────────────────────

export interface ReminderEmailInput {
  firstName: string;
  /** e.g. "5:00 pm" */
  time: string;
  /** e.g. "today" or "on Thursday 12 June" */
  dayPhrase: string;
  kind: SessionKind;
  sessionFormat: string;
  /** Stripe link with client_reference_id attached, or null for cash. */
  paymentUrl: string | null;
  /** Hide the payment block entirely when the session is already paid. */
  alreadyPaid: boolean;
  /** Public opt-out link; when present an "unsubscribe from reminders" line
   *  is shown in the footer. */
  optOutUrl?: string | null;
}

export function buildReminderHtml(input: ReminderEmailInput): string {
  const { firstName, time, dayPhrase, kind, sessionFormat, paymentUrl, alreadyPaid, optOutUrl } = input;

  const joinBlock = sessionFormat === 'online' ? `
    <div style="background:#EEF6F0;border:1px solid #C3DDD0;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#2A4D3C;letter-spacing:1px;text-transform:uppercase;">Join your online session</p>
      <p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.7;">
        Here is the link to join your online session:
      </p>
      <a href="${DOXY_URL}" style="color:#4F8A68;font-weight:600;font-size:14px;text-decoration:none;">${DOXY_URL}</a>
      <p style="margin:10px 0 0;font-size:13px;color:#777;">Please join a few minutes early so we can start on time.</p>
    </div>` : `
    <div style="background:#EEF6F0;border:1px solid #C3DDD0;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#2A4D3C;letter-spacing:1px;text-transform:uppercase;">Where to find me</p>
      <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">
        Your session takes place at:<br>
        <strong style="color:#2A4D3C;">${INSIGHT_MATTERS_ADDRESS}</strong>
      </p>
    </div>`;

  let paymentBlock = '';
  if (!alreadyPaid) {
    if (kind === 'low_cost') {
      paymentBlock = `
    <div style="border:1px solid #E0D8CE;border-radius:8px;padding:20px 24px;background:#FAF7F2;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#555;line-height:1.7;">
        Payment for this session is <strong style="color:#2A4D3C;">cash on the day</strong> — no need to pay anything in advance.
      </p>
    </div>`;
    } else if (paymentUrl) {
      paymentBlock = `
    <div style="border:1px solid #E0D8CE;border-radius:8px;padding:20px 24px;background:#FAF7F2;margin:0 0 24px;">
      <p style="margin:0 0 10px;font-size:13px;color:#555;line-height:1.7;">
        If you haven&rsquo;t already, you can pay for your session here:
      </p>
      <a href="${paymentUrl}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">Pay for your session</a>
    </div>`;
    }
  }

  return emailShell(`
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
      This is a quick reminder about your session ${dayPhrase} at ${time}.
    </p>
    ${joinBlock}
    ${paymentBlock}
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">
      If you have any questions or need to reschedule, please get in touch.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 4px;">See you soon,</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">${PRACTICE.practitionerName}<br>
      <span style="font-weight:400;font-size:13px;color:#666;">${PRACTICE.businessName}<br>
      ${SITE_HOST}</span>
    </p>${optOutUrl ? `
    <p style="color:#999;font-size:12px;line-height:1.6;margin:26px 0 0;border-top:1px solid #EFE9DF;padding-top:16px;">
      You receive these because you have sessions booked with ${PRACTICE.businessName}. If you&rsquo;d prefer not to get session reminders, you can <a href="${optOutUrl}" style="color:#999;text-decoration:underline;">unsubscribe from reminders</a>.
    </p>` : ''}`);
}

// ── Receipt ─────────────────────────────────────────────────────────────────

export interface ReceiptEmailInput {
  firstName: string;
  /** e.g. "Thursday, 12 June 2026" */
  date: string;
  /** e.g. "5:00 pm" */
  time: string;
  feeEuros: number;
  sessionFormat: string;
}

export function buildReceiptHtml(input: ReceiptEmailInput): string {
  const { firstName, date, time, feeEuros, sessionFormat } = input;
  const isOnline = sessionFormat === 'online';
  const formatCell = isOnline
    ? `Online &mdash; <a href="${DOXY_URL}" style="color:#4F8A68;text-decoration:none;font-weight:500;">${DOXY_URL.replace("https://", "")}</a>`
    : `In Person &mdash; ${PRACTICE.address.streetAddress}, ${PRACTICE.address.addressLocality}`;

  return emailShell(`
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 28px;">Thank you for your payment. Please find your receipt below — keep it for your records.</p>
    <div style="border:1px solid #E0D8CE;border-radius:8px;padding:24px;background:#FAF7F2;margin:0 0 28px;">
      <p style="font-size:11px;color:#2A4D3C;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 16px;">Receipt</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
        <tr>
          <td style="padding:7px 0;color:#777;border-bottom:1px solid #F0EAE0;">Date</td>
          <td style="padding:7px 0;text-align:right;border-bottom:1px solid #F0EAE0;">${date} at ${time}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#777;border-bottom:1px solid #F0EAE0;">Service</td>
          <td style="padding:7px 0;text-align:right;border-bottom:1px solid #F0EAE0;">Psychotherapy Session (${PRACTICE.sessionMinutes} minutes)</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#777;border-bottom:1px solid #F0EAE0;">Format</td>
          <td style="padding:7px 0;text-align:right;border-bottom:1px solid #F0EAE0;">${formatCell}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-weight:600;color:#2A4D3C;font-size:15px;">Amount</td>
          <td style="padding:10px 0;text-align:right;font-weight:600;color:#2A4D3C;font-size:15px;">&euro;${feeEuros}</td>
        </tr>
        <tr>
          <td style="padding:7px 0;color:#777;">Status</td>
          <td style="padding:7px 0;text-align:right;color:#4F8A68;font-weight:500;">Paid</td>
        </tr>
      </table>
    </div>
    ${isOnline ? `<div style="background:#EEF6F0;border:1px solid #C3DDD0;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#2A4D3C;letter-spacing:1px;text-transform:uppercase;">Your online waiting room</p>
      <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">For future online sessions, join via your dedicated waiting room:<br>
      <a href="${DOXY_URL}" style="color:#4F8A68;font-weight:600;text-decoration:none;">${DOXY_URL}</a></p>
    </div>` : ''}
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 12px;">
      If you have any questions, please email
      <a href="mailto:${CONTACT_EMAIL}" style="color:#C85A1A;text-decoration:none;">${CONTACT_EMAIL}</a>.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">See you at your next session.</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">${PRACTICE.practitionerFirstName}</p>`);
}
