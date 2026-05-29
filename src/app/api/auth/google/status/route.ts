import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getConnectedEmail, loadStoredTokens } from '@/lib/googleOAuth';

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const tokens = await loadStoredTokens();
  if (!tokens) {
    return NextResponse.json({ connected: false }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const email = await getConnectedEmail();
  return NextResponse.json(
    { connected: true, email: email ?? undefined },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
