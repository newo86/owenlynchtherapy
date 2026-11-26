import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches, requireAdmin } from '@/lib/adminAuth';
import { extendAllSeries } from '@/lib/sessionSeries';

// Daily: keep ongoing clients' sessions booked about 16 weeks ahead (see
// src/lib/sessionSeries.ts). Called by Vercel Cron (vercel.json) and callable
// by hand with the admin session cookie. Reads and writes only this app's
// database; the new sessions belong to the client's existing repeating Google
// event, so nothing is written to Google here.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const valid = bearerMatches(req, process.env.CRON_SECRET) || (await requireAdmin(req)) === null;
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const outcome = await extendAllSeries();
  if (outcome.errors.length) console.error('[sessions/extend] errors:', outcome.errors);
  console.log(`[sessions/extend] series=${outcome.series} added=${outcome.added}`);
  return NextResponse.json({ ok: outcome.errors.length === 0, ...outcome }, { headers: { 'Cache-Control': 'no-store' } });
}
