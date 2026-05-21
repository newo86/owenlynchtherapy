import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOAuthClient, saveTokens } from '@/lib/googleOAuth';

// GET /api/auth/google/callback?code=…&state=…
// Verifies CSRF state, exchanges code for tokens, stores them, and bounces
// the user back to /admin/intake with a success or error flag.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  const adminUrl = new URL('/admin/intake', req.url);

  if (error) {
    adminUrl.searchParams.set('gcal', 'error');
    adminUrl.searchParams.set('reason', error);
    return NextResponse.redirect(adminUrl);
  }

  if (!code || !state) {
    adminUrl.searchParams.set('gcal', 'error');
    adminUrl.searchParams.set('reason', 'missing_code_or_state');
    return NextResponse.redirect(adminUrl);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get('google_oauth_state')?.value;
  cookieStore.delete('google_oauth_state');

  if (!storedState || storedState !== state) {
    adminUrl.searchParams.set('gcal', 'error');
    adminUrl.searchParams.set('reason', 'state_mismatch');
    return NextResponse.redirect(adminUrl);
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);

    if (!tokens.access_token) {
      adminUrl.searchParams.set('gcal', 'error');
      adminUrl.searchParams.set('reason', 'no_access_token');
      return NextResponse.redirect(adminUrl);
    }

    await saveTokens({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      token_type: tokens.token_type ?? null,
      expiry_date: tokens.expiry_date ?? null,
    });

    adminUrl.searchParams.set('gcal', 'connected');
    return NextResponse.redirect(adminUrl);
  } catch (err) {
    console.error('[google callback] exchange error:', err);
    adminUrl.searchParams.set('gcal', 'error');
    adminUrl.searchParams.set('reason', 'exchange_failed');
    return NextResponse.redirect(adminUrl);
  }
}
