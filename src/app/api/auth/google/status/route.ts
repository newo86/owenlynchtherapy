import { NextRequest, NextResponse } from 'next/server';
import { getConnectedEmail, loadStoredTokens } from '@/lib/googleOAuth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
