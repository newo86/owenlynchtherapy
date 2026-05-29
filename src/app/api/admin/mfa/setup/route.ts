import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { generateTotpSecret, otpauthUrl, mfaEnabled } from '@/lib/totp';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

/**
 * Generates a fresh TOTP secret for enrolling an authenticator app. Requires an
 * existing admin session (so only the logged-in admin can enrol). The secret is
 * NOT stored server-side here — to activate MFA, copy it into the
 * ADMIN_TOTP_SECRET environment variable in Vercel and redeploy. MFA then
 * applies on the next login. Until ADMIN_TOTP_SECRET is set, login stays
 * password-only (no lockout risk).
 */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const secret = generateTotpSecret();
  return NextResponse.json(
    {
      secret,
      otpauthUrl: otpauthUrl(secret),
      alreadyEnabled: mfaEnabled(),
      next: 'Add this secret to your authenticator app, then set ADMIN_TOTP_SECRET to this value in Vercel and redeploy. MFA activates on your next login.',
    },
    { headers: noCache },
  );
}
