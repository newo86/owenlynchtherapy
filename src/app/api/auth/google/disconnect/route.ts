import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { clearTokens } from '@/lib/googleOAuth';

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  await clearTokens();
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
