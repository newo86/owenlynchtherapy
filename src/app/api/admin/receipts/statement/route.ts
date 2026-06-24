import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateStatementPDF } from '@/lib/generateReceiptPDF';

// GET /api/admin/receipts/statement?client_id=...  → full statement PDF for a
// client (all non-cancelled sessions).
export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const clientId = req.nextUrl.searchParams.get('client_id');
  if (!clientId) {
    return new Response(JSON.stringify({ error: 'client_id required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: client, error: cErr } = await supabaseAdmin
    .from('clients')
    .select('full_name')
    .eq('id', clientId)
    .single();
  if (cErr || !client) {
    return new Response(JSON.stringify({ error: 'Client not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: sessions, error: sErr } = await supabaseAdmin
    .from('sessions')
    .select('session_date, session_format, fee, payment_status, paid_at')
    .eq('client_id', clientId)
    .neq('status', 'cancelled')
    .order('session_date', { ascending: false });
  if (sErr) {
    return new Response(JSON.stringify({ error: 'Failed to load sessions' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const pdf = await generateStatementPDF({
      clientName: client.full_name as string,
      generatedAt: new Date().toISOString(),
      sessions: (sessions ?? []).map(s => ({
        session_date: s.session_date as string,
        session_format: s.session_format as string,
        fee: s.fee as number,
        payment_status: s.payment_status as string,
        paid_at: (s.paid_at as string | null) ?? null,
      })),
    });
    const namePart = (client.full_name as string).replace(/\s+/g, '-').toLowerCase();
    const datePart = new Date().toISOString().split('T')[0];
    return new Response(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="statement-${namePart}-${datePart}.pdf"`,
        'Cache-Control': 'no-store, no-cache',
      },
    });
  } catch (err) {
    console.error('[receipts/statement] PDF error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate statement' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
