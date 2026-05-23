import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCalendarEvent } from '@/lib/googleOAuth';

const noCache = { 'Cache-Control': 'no-store, no-cache' };
const VALID_FORMATS = ['in_person', 'online'];
const VALID_RECURRENCE = ['once', 'weekly', 'biweekly'] as const;
type Recurrence = typeof VALID_RECURRENCE[number];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = req.nextUrl.searchParams.get('client_id');
  if (!clientId) {
    return NextResponse.json({ error: 'client_id is required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('session_date', { ascending: false });

  if (error) {
    console.error('[sessions GET] Supabase error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error.message ?? 'Failed to fetch sessions' }, { status: 500 });
  }

  return NextResponse.json({ sessions: data }, { headers: noCache });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.INTAKE_ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    client_id: string;
    session_date: string;          // "YYYY-MM-DDTHH:MM" (local Dublin time)
    session_format: string;
    fee: number;
    notes?: string;
    recurrence?: string;            // 'once' | 'weekly' | 'biweekly'
    occurrence_count?: number;      // applies when recurrence != 'once'
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { client_id, session_date, session_format, fee, notes } = body;
  if (!client_id || !session_date || !session_format || !fee) {
    return NextResponse.json({ error: 'client_id, session_date, session_format, and fee are required' }, { status: 400 });
  }
  if (!VALID_FORMATS.includes(session_format)) {
    return NextResponse.json({ error: 'Invalid session_format' }, { status: 400 });
  }

  const recurrence: Recurrence = body.recurrence && (VALID_RECURRENCE as readonly string[]).includes(body.recurrence)
    ? body.recurrence as Recurrence
    : 'once';
  const occurrenceCount = recurrence === 'once'
    ? 1
    : Math.max(1, Math.min(52, Math.floor(Number(body.occurrence_count) || 6)));

  // Pull the client's name so the Google Calendar event has a useful summary.
  const { data: clientRow } = await supabaseAdmin
    .from('clients')
    .select('full_name, email')
    .eq('id', client_id)
    .single();

  const location = session_format === 'in_person'
    ? 'Insight Matters, 106 Capel Street, Dublin, D01 WY40'
    : "I'll send you a link to join shortly before your session.";

  const isoDates = buildOccurrences(session_date, recurrence, occurrenceCount);
  const rrule = recurrence === 'once'
    ? null
    : recurrence === 'weekly'
      ? `RRULE:FREQ=WEEKLY;COUNT=${occurrenceCount}`
      : `RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=${occurrenceCount}`;

  const payload = isoDates.map(d => ({
    client_id,
    session_date: d,
    session_format,
    location,
    fee: Math.round(fee),
    status: 'scheduled',
    payment_status: 'unpaid',
    notes: notes ?? null,
  }));

  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .insert(payload)
    .select();

  if (error || !sessions) {
    console.error('[sessions POST] Supabase error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: error?.message ?? 'Failed to create session(s)' }, { status: 500 });
  }

  // Push to Google Calendar — one recurring event spans the whole series.
  // Failures are logged and ignored: Supabase is the source of truth.
  try {
    const cadenceLabel = recurrence === 'once'
      ? 'One-off session'
      : recurrence === 'weekly'
        ? `Weekly · ${occurrenceCount} sessions`
        : `Fortnightly · ${occurrenceCount} sessions`;
    const eventId = await createCalendarEvent({
      summary: `Session — ${clientRow?.full_name ?? 'Client'}`,
      description: [
        clientRow?.full_name && clientRow.email ? `Client: ${clientRow.full_name} <${clientRow.email}>` : '',
        `Format: ${session_format === 'in_person' ? 'In Person' : 'Online'}`,
        `Fee: €${Math.round(Number(fee) / 100)}`,
        cadenceLabel,
      ].filter(Boolean).join('\n'),
      location: session_format === 'in_person' ? location : undefined,
      startIso: isoDates[0],
      durationMinutes: 50,
      recurrence: rrule ? [rrule] : undefined,
    });
    console.log('[sessions POST] google event:', eventId ?? 'skipped');
  } catch (calErr) {
    console.error('[sessions POST] google calendar error:', calErr);
  }

  // Sort so the anchor session is the earliest one.
  sessions.sort((a, b) => new Date(a.session_date as string).getTime() - new Date(b.session_date as string).getTime());
  return NextResponse.json({ session: sessions[0], sessions }, { headers: noCache });
}

function buildOccurrences(firstIsoLocal: string, recurrence: Recurrence, count: number): string[] {
  // The form sends "YYYY-MM-DDTHH:MM" (datetime-local format, no zone). We
  // treat that as wall-clock time and step day-by-day, formatting each
  // occurrence back as "YYYY-MM-DDTHH:MM:00" — exactly what generate-token
  // does so the two paths stay consistent.
  const pad = (n: number) => String(n).padStart(2, '0');
  const stripped = firstIsoLocal.replace(/\.\d+/, '').replace(/Z$/, '');
  const [datePart, timePart = '00:00'] = stripped.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, mi] = timePart.split(':').map(Number);

  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const step = recurrence === 'weekly' ? 7 * i
      : recurrence === 'biweekly' ? 14 * i
      : 0;
    // Use UTC math for calendar safety (no DST surprises since we're only
    // adding whole days).
    const ms = Date.UTC(y, mo - 1, d + step, h, mi, 0);
    const dt = new Date(ms);
    out.push(
      `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T` +
      `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:00`
    );
    if (recurrence === 'once') break;
  }
  return out;
}
