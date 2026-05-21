import { NextRequest, NextResponse } from 'next/server';
import { clearTokens } from '@/lib/googleOAuth';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await clearTokens();
  return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
}
