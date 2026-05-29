import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireAdmin } from '@/lib/adminAuth';
import { generateTotpSecret, otpauthUrl } from '@/lib/totp';
import { savePendingSecret } from '@/lib/adminMfa';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

/**
 * Begin two-factor setup: generate a secret, store it as pending (not yet
 * enabled), and return a scannable QR code (data URL) plus the secret for
 * manual entry. The admin scans the QR with their authenticator app, then
 * confirms a code via /api/admin/mfa/enable. Requires an existing admin session.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const secret = generateTotpSecret();
  const url = otpauthUrl(secret);

  if (!(await savePendingSecret(secret))) {
    return NextResponse.json(
      { error: 'Could not save the secret. Has the admin_mfa migration been run in Supabase?' },
      { status: 500, headers: noCache },
    );
  }

  const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 240 });
  return NextResponse.json({ qrDataUrl, secret, otpauthUrl: url }, { headers: noCache });
}
