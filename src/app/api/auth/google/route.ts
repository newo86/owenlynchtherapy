import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { buildAuthUrl } from '@/lib/googleOAuth';

// POST /api/auth/google — initiates OAuth. Requires admin Bearer auth.
// Returns { url } for the client to redirect the user's browser to.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    return NextResponse.json(
      { error: 'Google OAuth not configured — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.' },
      { status: 500 }
    );
  }

  const state = randomBytes(24).toString('hex');
  const cookieStore = await cookies();
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  const url = buildAuthUrl(state);
  return NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } });
}
