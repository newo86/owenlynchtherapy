import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { closeOutSession } from '@/lib/closeOutSession';

const noCache = { 'Cache-Control': 'no-store, no-cache' };

// "Session done" — closes out a session in one explicit call (the logic lives
// in src/lib/closeOutSession.ts, shared with the "Did they pay?" prompt):
//   - always: status → attended
//   - record_payment: also mark paid + log to the payments ledger
//     ('cash' for low-cost clients, 'manual' otherwise), exactly like the
//     mark-paid route
//   - send_receipt: also email the receipt (only if the session ends up paid
//     and none was sent before)
//
// Everything is opt-in and the response states exactly what happened. The
// old behaviour — silently auto-emailing a receipt whenever a paid session
// was marked attended — is gone: receipts now only go out when the UI asked
// for them, which the button labels state up front (docs/OPERATIONS.md).

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: { session_id: string; record_payment?: boolean; send_receipt?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { session_id } = body;
  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  const result = await closeOutSession(session_id, {
    record_payment: body.record_payment,
    send_receipt: body.send_receipt,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(
    {
      success: true,
      paid: result.paid,
      receipt_sent: result.receipt_sent,
      payment_status: result.payment_status,
    },
    { headers: noCache },
  );
}
