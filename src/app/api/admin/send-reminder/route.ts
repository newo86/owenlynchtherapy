import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { sendSessionReminder } from '@/lib/sendSessionReminder';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: { session_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id } = body;
  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  const result = await sendSessionReminder(session_id);

  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Failed to send reminder' }, { status: result.error === 'Session not found' ? 404 : 500 });
  }

  return NextResponse.json({ success: true, email: result.email }, { headers: noCache });
}
