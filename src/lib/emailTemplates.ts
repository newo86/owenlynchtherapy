// Shared client-facing email templates. Single source of truth for the
// reminder and receipt HTML so the manual admin routes, the Stripe webhook
// and the reminder cron all send identical, on-brand emails.
//
// The practice-specific bits (telehealth room, venue, Stripe links, from
// address) are re-exported from the master config so a cloned practice's
// emails and calendar events use ITS details, never Owen's.
import { PRACTICE } from '@/practice.config';
import { escapeHtml } from '@/lib/sanitise';

/** Video platform name (e.g. "Google Meet") and optional fixed room URL.
 *  TELEHEALTH_URL is '' when each session gets its own link (shared via the
 *  calendar invite) rather than a single fixed room. */
export const TELEHEALTH_PLATFORM: string = PRACTICE.telehealthPlatform;
export const TELEHEALTH_URL: string = PRACTICE.telehealthUrl;
/** What to put in an online session's calendar "location" field. */
export const ONLINE_LOCATION = PRACTICE.telehealthUrl || `Online (${PRACTICE.telehealthPlatform})`;
/** The online line for a calendar event's description: a fixed join link when
 *  there is one, otherwise just names the platform (the per-session link is
 *  shared by inviting the client to the event). */
export const ONLINE_JOIN_LINE = PRACTICE.telehealthUrl
  ? `Join: ${PRACTICE.telehealthUrl}`
  : `Online session (${PRACTICE.telehealthPlatform})`;
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
/** Revolut checkout link — main pay button in reminders and the welcome email when set. */
export const REVOLUT_LINK: string = PRACTICE.revolutLink;

/**
 * The "pay in advance" step of the new-client welcome email.
 *
 * Revolut is the pay link when one is configured, the same as in reminders.
 * The Stripe link is used only when no Revolut link is set (a fresh clone), and
 * "will send you payment details" when neither exists. The fee is stated in
 * words, not only on the button, because a Revolut link doesn't carry the
 * client's amount the way the per-session Stripe link does.
 * Note: Revolut payments are not auto-matched (no webhook), so the first
 * session is marked paid by hand or from the Revolut statement import.
 */
export function welcomePaymentStep(d: { stripeUrl: string; feeEuros: number; revolutUrl?: string }): string {
  const revolutUrl = d.revolutUrl ?? REVOLUT_LINK;
  const button = (url: string, label: string) =>
    `<a href="${url}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">${label}</a>`;
  let intro: string;
  let action: string;
  if (revolutUrl) {
    intro = `Your first session is &euro;${d.feeEuros}. Payment is handled securely via Revolut.`;
    action = button(revolutUrl, 'PAY FOR YOUR FIRST SESSION');
  } else if (d.stripeUrl) {
    intro = 'Payment is handled securely via Stripe.';
    action = button(d.stripeUrl, `PAY &euro;${d.feeEuros} FOR YOUR FIRST SESSION`);
  } else {
    intro = '';
    action = `<p style="color:#666;font-size:14px;">${PRACTICE.practitionerFirstName} will send you payment details separately.</p>`;
  }
  return `
    <div style="margin:32px 0 0;">
      <p style="color:#2A4D3C;font-size:13px;font-weight:600;margin:0 0 8px;">2. Pay for your session in advance to secure your slot</p>${intro ? `
      <p style="color:#666;font-size:13px;line-height:1.6;margin:0 0 16px;">
        ${intro}
      </p>` : ''}
      ${action}
    </div>`;
}

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
  const { time, dayPhrase, kind, sessionFormat, paymentUrl, alreadyPaid, optOutUrl } = input;
  const firstName = escapeHtml(input.firstName);

  const onlineJoin = TELEHEALTH_URL
    ? `<p style="margin:0 0 8px;font-size:14px;color:#555;line-height:1.7;">Here is the link to join your online session:</p>
      <a href="${TELEHEALTH_URL}" style="color:#4F8A68;font-weight:600;font-size:14px;text-decoration:none;">${TELEHEALTH_URL}</a>
      <p style="margin:10px 0 0;font-size:13px;color:#777;">Please join a few minutes early so we can start on time.</p>`
    : `<p style="margin:0;font-size:14px;color:#555;line-height:1.7;">This is an online session on ${TELEHEALTH_PLATFORM}. You&rsquo;ll find the video link in your Google Calendar invitation, sent to your email. Please join a few minutes early so we can start on time.</p>`;

  const joinBlock = sessionFormat === 'online' ? `
    <div style="background:#EEF6F0;border:1px solid #C3DDD0;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#2A4D3C;letter-spacing:1px;text-transform:uppercase;">Join your online session</p>
      ${onlineJoin}
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
    } else if (REVOLUT_LINK || paymentUrl) {
      // Revolut is the main button when configured; the Stripe link (which
      // auto-marks the session paid) stays as a card fallback.
      const primaryUrl = REVOLUT_LINK || paymentUrl;
      const cardFallback = REVOLUT_LINK && paymentUrl ? `
      <p style="margin:12px 0 0;font-size:12px;color:#777;line-height:1.6;">
        Prefer to pay by card? <a href="${paymentUrl}" style="color:#4F8A68;text-decoration:underline;">Pay by card here</a>.
      </p>` : '';
      paymentBlock = `
    <div style="border:1px solid #E0D8CE;border-radius:8px;padding:20px 24px;background:#FAF7F2;margin:0 0 24px;">
      <p style="margin:0 0 10px;font-size:13px;color:#555;line-height:1.7;">
        If you haven&rsquo;t already, you can pay for your session here:
      </p>
      <a href="${primaryUrl}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:12px 28px;border-radius:6px;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">Pay for your session</a>${cardFallback}
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
  /** Client's full name — printed on the receipt ("Issued to"). */
  fullName: string;
  /** e.g. "Thursday, 12 June 2026" */
  date: string;
  /** e.g. "5:00 pm" */
  time: string;
  feeEuros: number;
  sessionFormat: string;
}

export function buildReceiptHtml(input: ReceiptEmailInput): string {
  const { date, time, feeEuros, sessionFormat } = input;
  const firstName = escapeHtml(input.firstName);
  const fullName = escapeHtml(input.fullName);
  const isOnline = sessionFormat === 'online';
  const formatCell = isOnline
    ? (TELEHEALTH_URL
        ? `Online &mdash; <a href="${TELEHEALTH_URL}" style="color:#4F8A68;text-decoration:none;font-weight:500;">${TELEHEALTH_URL.replace("https://", "")}</a>`
        : `Online (${TELEHEALTH_PLATFORM})`)
    : `In Person &mdash; ${PRACTICE.address.streetAddress}, ${PRACTICE.address.addressLocality}`;

  return emailShell(`
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 28px;">Thank you for your payment. Please find your receipt below — keep it for your records.</p>
    <div style="border:1px solid #E0D8CE;border-radius:8px;padding:24px;background:#FAF7F2;margin:0 0 28px;">
      <p style="font-size:11px;color:#2A4D3C;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 16px;">Receipt</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333;">
        <tr>
          <td style="padding:7px 0;color:#777;border-bottom:1px solid #F0EAE0;">Issued to</td>
          <td style="padding:7px 0;text-align:right;border-bottom:1px solid #F0EAE0;font-weight:500;color:#2A4D3C;">${fullName}</td>
        </tr>
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
    ${isOnline && TELEHEALTH_URL ? `<div style="background:#EEF6F0;border:1px solid #C3DDD0;border-radius:8px;padding:18px 20px;margin:0 0 24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#2A4D3C;letter-spacing:1px;text-transform:uppercase;">Your online waiting room</p>
      <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">For future online sessions, join via your dedicated waiting room:<br>
      <a href="${TELEHEALTH_URL}" style="color:#4F8A68;font-weight:600;text-decoration:none;">${TELEHEALTH_URL}</a></p>
    </div>` : ''}
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 12px;">
      If you have any questions, please email
      <a href="mailto:${CONTACT_EMAIL}" style="color:#C85A1A;text-decoration:none;">${CONTACT_EMAIL}</a>.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">See you at your next session.</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">${PRACTICE.practitionerFirstName}</p>`);
}

// ── Questionnaire link ──────────────────────────────────────────────────────

export interface QuestionnaireEmailInput {
  firstName: string;
  kind: 'values' | 'cnip';
  url: string;
  ttlDays: number;
}

export function buildQuestionnaireHtml(input: QuestionnaireEmailInput): string {
  const firstName = escapeHtml(input.firstName);
  if (input.kind === 'values') return buildValuesQuestionnaireHtml(firstName, input.url, input.ttlDays);
  const intro = `I&rsquo;d like therapy to fit you as well as it can. This short questionnaire asks how you&rsquo;d like a therapist to work with you. It takes about five minutes, there are no right or wrong answers, and we can talk through it together in a session.`;
  const button = 'Open the questionnaire';
  return emailShell(`
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">${intro}</p>
    <a href="${input.url}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">${button}</a>
    <p style="color:#777;font-size:13px;line-height:1.7;margin:24px 0 0;">
      The link is private to you and works for ${input.ttlDays} days. If it has expired, just let me know and I&rsquo;ll send a new one.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:24px 0 4px;">Thanks,</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">${PRACTICE.practitionerName}<br>
      <span style="font-weight:400;font-size:13px;color:#666;">${PRACTICE.businessName}<br>
      ${SITE_HOST}</span>
    </p>`);
}

// ── Values worksheet: the client's own copy of their results ────────────────

export interface ValuesResultsEmailInput {
  firstName: string;
  top: Array<{ name: string; desc: string | null; neglected: boolean }>;
  areas: Array<{ name: string; importance: number | null; living: number | null }>;
  step: { action: string; value: string; obstacles: string; worth: string };
}

export function buildValuesResultsHtml(input: ValuesResultsEmailInput): string {
  const e = escapeHtml;
  const nl = (s: string) => e(s).replace(/\n/g, '<br>');
  const topRows = input.top.map((v, i) => `
      <tr>
        <td style="padding:10px 12px 10px 0;vertical-align:top;width:28px;">
          <span style="display:inline-block;width:26px;height:26px;line-height:26px;border-radius:13px;background:#2A4D3C;color:#fff;text-align:center;font-size:13px;">${i + 1}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #F0EAE0;">
          <span style="font-size:15px;color:#2A4D3C;font-weight:600;">${e(v.name)}</span>
          ${v.desc ? `<br><span style="font-size:13px;color:#777;">${e(v.desc)}</span>` : ''}
          ${v.neglected ? `<br><span style="font-size:13px;color:#A04714;">Wanting more room right now</span>` : ''}
        </td>
      </tr>`).join('');

  const scored = input.areas.filter(a => a.importance !== null || a.living !== null);
  const areaRows = scored.map(a => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-size:14px;color:#2A4D3C;">${e(a.name)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-size:14px;color:#555;text-align:center;">${a.importance ?? '–'}</td>
        <td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-size:14px;color:#555;text-align:center;">${a.living ?? '–'}</td>
      </tr>`).join('');

  const stepItems = ([
    ['Something I will do', input.step.action],
    ['The value it moves me towards', input.step.value],
    ['What might show up', input.step.obstacles],
    ['Why it’s worth making room for them', input.step.worth],
  ] as const).filter(([, v]) => v).map(([k, v]) => `
      <p style="margin:0 0 4px;font-size:12px;color:#777;">${e(k)}</p>
      <p style="margin:0 0 14px;font-size:14px;color:#2A4D3C;line-height:1.6;">${nl(v)}</p>`).join('');

  const h = (t: string) => `<p style="font-size:17px;color:#2A4D3C;margin:28px 0 10px;font-weight:400;">${t}</p>`;

  return emailShell(`
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${e(input.firstName)},</p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:0;">
      Thank you for completing the values worksheet. Here&rsquo;s a copy of what you chose, to keep. We can look at it together in a session.
    </p>
    ${h('My top six values')}
    <table style="width:100%;border-collapse:collapse;">${topRows}</table>
    ${scored.length ? `${h('Values in my life')}
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:0 0 6px;font-size:12px;color:#777;">Area</td>
        <td style="padding:0 0 6px;font-size:12px;color:#777;text-align:center;">How important</td>
        <td style="padding:0 0 6px;font-size:12px;color:#777;text-align:center;">Living by it now</td>
      </tr>${areaRows}
    </table>` : ''}
    ${stepItems ? `<div style="background:#EEF6F0;border-radius:8px;padding:18px 20px;margin:28px 0 0;">
      <p style="font-size:17px;color:#2A4D3C;margin:0 0 12px;font-weight:400;">One small step this week</p>${stepItems}
    </div>` : ''}
    <p style="color:#555;font-size:14px;line-height:1.7;margin:28px 0 4px;">Take care,</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">${PRACTICE.practitionerName}<br>
      <span style="font-weight:400;font-size:13px;color:#666;">${PRACTICE.businessName}<br>
      ${SITE_HOST}</span>
    </p>
    <p style="color:#999;font-size:12px;line-height:1.6;margin:24px 0 0;border-top:1px solid #EFE9DF;padding-top:14px;">
      Based on acceptance and commitment therapy (ACT), drawing on the work of Steven Hayes and Russ Harris.
    </p>`);
}

// ── Values questionnaire on its own (Owen's wording, 21 Nov 2026) ──────────
// Subject is set in lib/questionnaires/send.ts: "Values questionnaire for our
// sessions". Keep the wording as Owen wrote it.

const VALUES_PARAGRAPHS = [
  'I&rsquo;m sending you this values questionnaire. It&rsquo;s a way of finding out what matters most to you in life, and we can use it in our sessions together.',
  'There are no right or wrong answers. Values can also change over time, so think of this as a snapshot of what&rsquo;s important to you right now.',
  'Do take your time with it. Sometimes we feel we should value something when it isn&rsquo;t really that important to us. Friendship is a common example: for some people it matters a lot, for others it&rsquo;s only somewhat important, and for some it isn&rsquo;t a priority at all. All of those are completely okay.',
  'If you notice yourself thinking &ldquo;I should value this&rdquo;, pause and ask whether you really do. If you don&rsquo;t, that&rsquo;s fine. Mark it the way it honestly feels.',
];

function buildValuesQuestionnaireHtml(firstName: string, url: string, ttlDays: number): string {
  const p = (t: string) => `<p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">${t}</p>`;
  return emailShell(`
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    ${VALUES_PARAGRAPHS.map(p).join('\n    ')}
    <a href="${url}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin:8px 0 0;">Open the values questionnaire</a>
    <p style="color:#777;font-size:13px;line-height:1.7;margin:24px 0 0;">
      The link is private to you and works for ${ttlDays} days. If it has expired, just let me know and I&rsquo;ll send a new one.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:24px 0 4px;">Best wishes,</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">${PRACTICE.practitionerName}<br>
      <span style="font-weight:400;font-size:13px;color:#666;">${PRACTICE.businessName}<br>
      ${SITE_HOST}</span>
    </p>`);
}

// ── Both questionnaires in one email (Owen's wording, Nov 2026) ─────────────

export interface QuestionnaireBundleEmailInput {
  firstName: string;
  valuesUrl: string;
  cnipUrl: string;
  ttlDays: number;
}

export function buildQuestionnaireBundleHtml(input: QuestionnaireBundleEmailInput): string {
  const firstName = escapeHtml(input.firstName);
  const p = (t: string) => `<p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">${t}</p>`;
  const h = (t: string) => `<p style="color:#2A4D3C;font-size:15px;font-weight:600;margin:28px 0 8px;">${t}</p>`;
  const btn = (url: string, label: string) =>
    `<a href="${url}" style="display:inline-block;background-color:#C85A1A;color:#FFFFFF;padding:13px 28px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin:4px 0 8px;">${label}</a>`;
  return emailShell(`
    <p style="color:#2A4D3C;font-size:16px;margin:0 0 16px;font-weight:400;">Hi ${firstName},</p>
    ${p('Just a quick email with two short questionnaires. Both are completely optional, and there are no right or wrong answers.')}
    ${h('1. Finding your values <span style="font-weight:400;color:#777;">(about 10 minutes)</span>')}
    ${VALUES_PARAGRAPHS.map(p).join('\n    ')}
    ${btn(input.valuesUrl, 'Find your values')}
    ${h('2. Your therapy preferences <span style="font-weight:400;color:#777;">(about 5 minutes)</span>')}
    ${p('This one is about how you&rsquo;d like therapy to be for you: for example, how much you&rsquo;d like me to lead, whether you&rsquo;d like things to do between sessions, or how much you&rsquo;d like to focus on feelings. It helps me make our work fit you as well as it can, and we can talk through it together in a session.')}
    ${btn(input.cnipUrl, 'Your therapy preferences')}
    <div style="background:#F5F0E8;border-radius:8px;padding:16px 18px;margin:24px 0 0;">
      <p style="color:#555;font-size:13px;line-height:1.7;margin:0;">
        On the therapy preferences one, each row has two options with a scale from 3 to &minus;3 between them. The minus numbers on the right-hand side don&rsquo;t mean anything negative. They just show which side you lean towards: 3 is a strong preference for the left-hand option, &minus;3 a strong preference for the right-hand option, and 0 means no preference either way. Both sides are equally fine.
      </p>
    </div>
    <p style="color:#777;font-size:13px;line-height:1.7;margin:24px 0 0;">
      The links are private to you and stay open for ${input.ttlDays} days. If one runs out or anything doesn&rsquo;t work, just let me know.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.7;margin:24px 0 4px;">Best wishes,</p>
    <p style="color:#2A4D3C;font-size:14px;margin:0;font-weight:500;">${PRACTICE.practitionerFirstName}<br>
      <span style="font-weight:400;font-size:13px;color:#666;">${PRACTICE.businessName}<br>
      ${SITE_HOST}</span>
    </p>`);
}
