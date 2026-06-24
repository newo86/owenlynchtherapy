import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateReceiptPDF } from '@/lib/generateReceiptPDF';

// GET /api/admin/receipts?session_id=...  → single-session receipt PDF.
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sessionId = req.nextUrl.searchParams.get('session_id');
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'session_id required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .select('session_date, session_format, fee, payment_status, paid_at, clients(full_name)')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  const c = (session as { clients: { full_name: string } | { full_name: string }[] | null }).clients;
  const clientName = (Array.isArray(c) ? c[0]?.full_name : c?.full_name) ?? 'Client';

  try {
    const pdf = await generateReceiptPDF({
      clientName,
      session: {
        session_date: session.session_date as string,
        session_format: session.session_format as string,
        fee: session.fee as number,
        payment_status: session.payment_status as string,
        paid_at: (session.paid_at as string | null) ?? null,
      },
    });
    const datePart = new Date(session.session_date as string).toISOString().split('T')[0];
    const namePart = clientName.replace(/\s+/g, '-').toLowerCase();
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${namePart}-${datePart}.pdf"`,
        'Cache-Control': 'no-store, no-cache',
      },
    });
  } catch (err) {
    console.error('[receipts] PDF error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate receipt' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
