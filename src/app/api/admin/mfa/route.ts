import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { isMfaEnabled } from '@/lib/adminMfa';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

/** Current two-factor status for the admin UI. */
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  return NextResponse.json({ enabled: await isMfaEnabled() }, { headers: noCache });
}
