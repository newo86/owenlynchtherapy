import { Resend } from 'resend';

// Lazy Resend client — same reasoning as src/lib/supabase.ts. Constructing
// at module load would throw "Missing API key" during the Next build's
// "collect page data" step whenever RESEND_API_KEY happens to be unset
// locally, even though no email is actually about to be sent.

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL KILL SWITCH (added 2026-06 to stop runaway reminder emails).
//
// All outbound email in the app flows through getResend().emails.send(...).
// While this switch is active, every send is short-circuited to a no-op so
// NOTHING leaves the app, regardless of what triggers it. This is a deliberate
// blanket block — reminders, receipts, intake and report emails are ALL paused.
//
// Emails stay OFF unless the environment explicitly opts back in with
//   EMAILS_ENABLED=true
// so the default (and any deploy without that var) is "send nothing". Re-enable
// only after the recurring-send trigger has been found and stopped.
// ─────────────────────────────────────────────────────────────────────────────
const EMAILS_ENABLED = process.env.EMAILS_ENABLED === 'true';

type SendArgs = Parameters<Resend['emails']['send']>;

/** No-op stand-in for the Resend client while the kill switch is active. Mimics
 *  the `{ emails: { send } }` shape callers use and returns a benign success-ish
 *  result ({ data: null, error: null }) so nothing throws or reports a failure. */
function blockedResendStub(): Resend {
  const send = async (...args: SendArgs) => {
    const payload = args[0] as { to?: unknown; subject?: unknown } | undefined;
    const recipientCount = Array.isArray(payload?.to) ? payload?.to.length : payload?.to ? 1 : 0;
    console.warn(
      `[resend] EMAIL KILL SWITCH ACTIVE — blocked send of "${String(payload?.subject ?? '')}" to ${recipientCount} recipient(s). Set EMAILS_ENABLED=true to re-enable.`,
    );
    return { data: null, error: null };
  };
  // Only the emails.send path is used across the app (verified). The Proxy
  // guards anything else by throwing, so no email-adjacent call slips through.
  return new Proxy(
    { emails: { send } },
    {
      get(target, prop) {
        if (prop === 'emails') return target.emails;
        throw new Error(`[resend] blocked: '${String(prop)}' is disabled while EMAILS_ENABLED is not 'true'.`);
      },
    },
  ) as unknown as Resend;
}

let cached: Resend | null = null;

export function getResend(): Resend {
  // Kill switch first: never construct or call the real client while disabled.
  if (!EMAILS_ENABLED) return blockedResendStub();

  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY env var is missing.');
  cached = new Resend(key);
  return cached;
}
