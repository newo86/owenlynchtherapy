import { NextRequest, NextResponse } from 'next/server';
import { bearerMatches } from '@/lib/adminAuth';
import { supabaseAdmin } from '@/lib/supabase';
import { getResend } from '@/lib/resend';

// Called by Vercel Cron every Saturday at 08:00 UTC (≈ 09:00 IST / 08:00 GMT).
// Also callable manually with the INTAKE_ADMIN_SECRET for testing.

function getWeekBounds(now: Date): { monday: Date; sunday: Date } {
  const day = now.getDay(); // 0 Sun … 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return { monday, sunday };
}

export async function GET(req: NextRequest) {
  // Accept either CRON_SECRET (Vercel cron) or INTAKE_ADMIN_SECRET (manual trigger)
  const valid = bearerMatches(req, process.env.CRON_SECRET) || bearerMatches(req, process.env.INTAKE_ADMIN_SECRET);
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const { monday, sunday } = getWeekBounds(now);

  // Fetch all clients + sessions for the week
  const { data: clients, error } = await supabaseAdmin
    .from('clients')
    .select('*, sessions(*)')
    .order('full_name', { ascending: true });

  if (error || !clients) {
    console.error('[weekly-report] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }

  // Collect all sessions in the week window, sorted by date
  type SessionEntry = {
    clientName: string;
    sessionDate: Date;
    format: string;
    feeCents: number;
    paid: boolean;
    attended: boolean;
  };

  const entries: SessionEntry[] = [];

  for (const client of clients) {
    for (const s of (client.sessions as Array<{
      session_date: string;
      session_format: string;
      fee: number;
      status: string;
      payment_status: string;
    }>)) {
      const d = new Date(s.session_date);
      if (d < monday || d >= sunday) continue;
      if (s.status === 'cancelled') continue;
      entries.push({
        clientName: client.full_name as string,
        sessionDate: d,
        format: s.session_format,
        feeCents: s.fee ?? 0,
        paid: s.payment_status === 'paid',
        attended: s.status === 'attended',
      });
    }
  }

  entries.sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime());

  const totalSessions = entries.length;
  const totalPaidCents = entries.filter(e => e.paid).reduce((s, e) => s + e.feeCents, 0);
  const totalOutstandingCents = entries.filter(e => !e.paid).reduce((s, e) => s + e.feeCents, 0);
  const outstandingCount = entries.filter(e => !e.paid).length;

  const weekLabel = monday.toLocaleDateString('en-IE', {
    day: 'numeric', month: 'long', timeZone: 'Europe/Dublin',
  }) + ' – ' + new Date(sunday.getTime() - 1).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin',
  });

  const html = buildReportHtml(entries, weekLabel, totalSessions, totalPaidCents, totalOutstandingCents, outstandingCount);

  const emailResult = await getResend().emails.send({
    from: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
    to: 'info@owenlynchtherapy.com',
    subject: `Weekly Payment Report — ${weekLabel}`,
    html,
  });

  if (emailResult.error) {
    console.error('[weekly-report] Resend error:', emailResult.error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  console.log('[weekly-report] sent for week', weekLabel, '| sessions:', totalSessions, '| outstanding:', outstandingCount);
  return NextResponse.json({ ok: true, weekLabel, totalSessions, outstandingCount });
}

type Entry = {
  clientName: string;
  sessionDate: Date;
  format: string;
  feeCents: number;
  paid: boolean;
  attended: boolean;
};

function fmt(d: Date) {
  return d.toLocaleDateString('en-IE', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Dublin',
  }) + ' · ' + d.toLocaleTimeString('en-IE', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Europe/Dublin',
  });
}

function euro(cents: number) {
  return '€' + Math.round(cents / 100);
}

function buildReportHtml(
  entries: Entry[],
  weekLabel: string,
  totalSessions: number,
  totalPaidCents: number,
  totalOutstandingCents: number,
  outstandingCount: number,
): string {
  const rows = entries.map(e => {
    const bg    = e.paid ? '#FFFFFF' : '#FFF7F3';
    const badge = e.paid
      ? `<span style="background:#E6F4EC;color:#2A6B47;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">Paid</span>`
      : `<span style="background:#FDEEE7;color:#C85A1A;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">Unpaid</span>`;
    const attendedLabel = e.attended ? 'Attended' : 'Scheduled';
    const leftBorder = e.paid ? '' : 'border-left:3px solid #C85A1A;';
    return `
      <tr style="background:${bg};${leftBorder}">
        <td style="padding:10px 14px;font-size:13px;color:#2A4D3C;font-weight:500;">${e.clientName}</td>
        <td style="padding:10px 14px;font-size:12px;color:#555;">${fmt(e.sessionDate)}</td>
        <td style="padding:10px 14px;font-size:12px;color:#555;">${e.format === 'online' ? 'Online' : 'In Person'}</td>
        <td style="padding:10px 14px;font-size:12px;color:#555;">${attendedLabel}</td>
        <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#2A4D3C;">${euro(e.feeCents)}</td>
        <td style="padding:10px 14px;">${badge}</td>
      </tr>`;
  }).join('');

  const emptyRow = entries.length === 0
    ? `<tr><td colspan="6" style="padding:32px;text-align:center;color:#999;font-size:13px;">No sessions this week.</td></tr>`
    : '';

  const outstandingNote = outstandingCount > 0
    ? `<div style="background:#FFF0EB;border:1px solid #F5C9B5;border-left:4px solid #C85A1A;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#C85A1A;letter-spacing:1px;text-transform:uppercase;">Outstanding payments</p>
        <p style="margin:0;font-size:14px;color:#333;">${outstandingCount} session${outstandingCount === 1 ? '' : 's'} totalling <strong>${euro(totalOutstandingCents)}</strong> still unpaid this week.</p>
      </div>`
    : `<div style="background:#EEF6F0;border:1px solid #C3DDD0;border-left:4px solid #4F8A68;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#2A6B47;font-weight:500;">All sessions paid — great week!</p>
      </div>`;

  return `
<div style="background-color:#F5F0E8;padding:40px 20px;font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
  <div style="background-color:#2A4D3C;padding:24px 30px;text-align:center;border-radius:8px 8px 0 0;">
    <p style="color:#C85A1A;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 6px;">Weekly Report</p>
    <p style="color:#FFFFFF;font-size:18px;font-weight:300;letter-spacing:0.5px;margin:0;">Owen Lynch Psychotherapy</p>
  </div>

  <div style="background-color:#FFFFFF;padding:32px;border-radius:0 0 8px 8px;">
    <h2 style="margin:0 0 6px;font-size:20px;color:#2A4D3C;font-weight:400;">${weekLabel}</h2>
    <p style="margin:0 0 28px;font-size:13px;color:#888;">Generated every Saturday · ${new Date().toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin' })}</p>

    <!-- Summary tiles -->
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <div style="flex:1;background:#F5F0E8;border-radius:8px;padding:14px 16px;text-align:center;">
        <div style="font-size:22px;font-weight:600;color:#2A4D3C;">${totalSessions}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Sessions</div>
      </div>
      <div style="flex:1;background:#EEF6F0;border-radius:8px;padding:14px 16px;text-align:center;">
        <div style="font-size:22px;font-weight:600;color:#2A6B47;">${euro(totalPaidCents)}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Received</div>
      </div>
      <div style="flex:1;background:${outstandingCount > 0 ? '#FFF0EB' : '#F5F0E8'};border-radius:8px;padding:14px 16px;text-align:center;">
        <div style="font-size:22px;font-weight:600;color:${outstandingCount > 0 ? '#C85A1A' : '#2A4D3C'};">${euro(totalOutstandingCents)}</div>
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Outstanding</div>
      </div>
    </div>

    ${outstandingNote}

    <!-- Sessions table -->
    <table style="width:100%;border-collapse:separate;border-spacing:0 4px;font-size:13px;">
      <thead>
        <tr>
          <th style="padding:6px 14px;text-align:left;font-size:10px;color:#999;letter-spacing:1.5px;text-transform:uppercase;">Client</th>
          <th style="padding:6px 14px;text-align:left;font-size:10px;color:#999;letter-spacing:1.5px;text-transform:uppercase;">Date & Time</th>
          <th style="padding:6px 14px;text-align:left;font-size:10px;color:#999;letter-spacing:1.5px;text-transform:uppercase;">Format</th>
          <th style="padding:6px 14px;text-align:left;font-size:10px;color:#999;letter-spacing:1.5px;text-transform:uppercase;">Status</th>
          <th style="padding:6px 14px;text-align:left;font-size:10px;color:#999;letter-spacing:1.5px;text-transform:uppercase;">Fee</th>
          <th style="padding:6px 14px;text-align:left;font-size:10px;color:#999;letter-spacing:1.5px;text-transform:uppercase;">Payment</th>
        </tr>
      </thead>
      <tbody>
        ${rows}${emptyRow}
      </tbody>
    </table>

    <hr style="border:none;border-top:1px solid #F0EAE0;margin:28px 0 20px;">
    <p style="color:#999;font-size:12px;margin:0;">This report is sent automatically every Saturday morning. View the full dashboard at <a href="https://owenlynchtherapy.com/admin/intake" style="color:#4F8A68;">owenlynchtherapy.com/admin/intake</a></p>
  </div>
</div>`;
}
