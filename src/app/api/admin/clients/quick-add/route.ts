import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { createCalendarEvent } from '@/lib/googleOAuth';
import { localDublinToUtcIso } from '@/lib/dateUtils';
import { DOXY_URL, INSIGHT_MATTERS_ADDRESS } from '@/lib/emailTemplates';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const VALID_FORMATS = ['in_person', 'online'];

// Creates a client (and optionally a first session) without sending an
// intake link, welcome email, or generating a Stripe payment link. The
// counterpart to /api/intake/generate-token for clients who already exist
// in Owen's practice from before this admin existed.
export async function POST(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  let body: {
    client_name?: string;
    client_email?: string;
    session_fee?: number;           // euros, will be stored as cents
    is_low_cost?: boolean;
    first_session_date?: string;    // optional
    first_session_format?: string;  // 'in_person' | 'online' — only used if first_session_date present
    // Contact / personal detail fields (all optional)
    phone?: string;
    date_of_birth?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    gp_name?: string;
    gp_phone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    client_name, client_email, session_fee, is_low_cost,
    first_session_date, first_session_format,
    phone, date_of_birth, emergency_contact_name,
    emergency_contact_phone, gp_name, gp_phone,
  } = body;

  if (!client_name?.trim()) return NextResponse.json({ error: 'client_name is required' }, { status: 400 });
  if (!session_fee || Number(session_fee) <= 0) return NextResponse.json({ error: 'session_fee is required and must be positive' }, { status: 400 });

  const feeInCents = Math.round(Number(session_fee) * 100);

  const { data: clientRow, error: clientErr } = await supabaseAdmin
    .from('clients')
    .insert({
      full_name: client_name.trim(),
      email: client_email?.trim() ?? '',
      session_fee: feeInCents,
      status: 'active',
      is_low_cost: Boolean(is_low_cost),
      phone: phone?.trim() || null,
      date_of_birth: date_of_birth?.trim() || null,
      emergency_contact_name: emergency_contact_name?.trim() || null,
      emergency_contact_phone: emergency_contact_phone?.trim() || null,
      gp_name: gp_name?.trim() || null,
      gp_phone: gp_phone?.trim() || null,
    })
    .select()
    .single();

  if (clientErr || !clientRow) {
    console.error('[clients/quick-add] client insert error:', clientErr);
    return NextResponse.json({ error: clientErr?.message ?? 'Failed to create client' }, { status: 500 });
  }

  // Optional first session.
  if (first_session_date) {
    const format = VALID_FORMATS.includes(first_session_format ?? '') ? first_session_format! : 'in_person';
    const location = format === 'in_person'
      ? INSIGHT_MATTERS_ADDRESS
      : DOXY_URL;

    // Convert wall-clock Dublin time to UTC for Supabase timestamptz storage.
    // Keep the original wall-clock string for Google Calendar (which expects
    // wall-clock + timeZone, not a UTC string).
    const sessionDateUtc = localDublinToUtcIso(first_session_date);

    const { data: sessionRow, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .insert({
        client_id: clientRow.id,
        session_date: sessionDateUtc,
        session_format: format,
        location,
        fee: feeInCents,
        status: 'scheduled',
        payment_status: 'unpaid',
      })
      .select()
      .single();

    if (sessionErr) {
      console.error('[clients/quick-add] session insert error:', sessionErr);
      // Continue — the client row exists, that's the main thing.
    } else if (sessionRow) {
      // Push to Google Calendar (silent failure ok).
      try {
        const eventId = await createCalendarEvent({
          summary: `Session — ${client_name.trim()}`,
          description: [
            // Name only — per docs/DATA-RETENTION.md, client emails must not
            // be written into Google Calendar event descriptions.
            `Client: ${client_name.trim()}`,
            `Format: ${format === 'in_person' ? 'In Person' : 'Online'}`,
            format === 'online' ? `Join: ${DOXY_URL}` : '',
            `Fee: €${Math.round(Number(session_fee))}`,
            'One-off session',
          ].filter(Boolean).join('\n'),
          location,
          startIso: first_session_date,
          durationMinutes: 50,
        });
        if (eventId) {
          await supabaseAdmin
            .from('sessions')
            .update({ gcal_event_id: eventId })
            .eq('id', sessionRow.id);
        }
      } catch (calErr) {
        console.error('[clients/quick-add] google calendar error:', calErr);
      }
    }
  }

  return NextResponse.json({ client: clientRow }, { headers: noCache });
}
