import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getResend } from '@/lib/resend';
import { buildReminderHtml, paymentLinkFor, type SessionKind } from '@/lib/emailTemplates';

// Sends sample reminder emails with dummy session data so the practitioner
// can preview exactly what clients receive — no client records are touched
// and nothing is logged to session_reminders. Admin session required.
//
// GET /api/admin/test-reminder?email=you@example.com[&kind=online|in_person|low_cost]
// Omitting kind sends all three variants.

export const dynamic = 'force-dynamic';

const KINDS: SessionKind[] = ['online', 'in_person', 'low_cost'];

export async function GET(req: NextRequest) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const email = req.nextUrl.searchParams.get('email')?.trim();
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'Add ?email=you@example.com (and optionally &kind=online|in_person|low_cost)' },
      { status: 400 },
    );
  }

  const kindParam = req.nextUrl.searchParams.get('kind');
  const kinds = kindParam && KINDS.includes(kindParam as SessionKind)
    ? [kindParam as SessionKind]
    : KINDS;

  const labels: Record<SessionKind, string> = {
    online: 'Online', in_person: 'In Person', low_cost: 'Low Cost',
  };

  const sent: string[] = [];
  for (const kind of kinds) {
    const result = await getResend().emails.send({
      from: 'Owen Lynch Psychotherapy <noreply@owenlynchtherapy.com>',
      to: email,
      subject: `[TEST · ${labels[kind]}] Reminder — your session today with Owen Lynch`,
      html: buildReminderHtml({
        firstName: 'Owen',
        time: '5:00 p.m.',
        dayPhrase: 'today',
        kind,
        sessionFormat: kind === 'online' ? 'online' : 'in_person',
        // Dummy reference id so the link is inspectable without pointing at a
        // real session. Do not pay through it.
        paymentUrl: paymentLinkFor(kind, 'test-preview-only', email),
        alreadyPaid: false,
      }),
    });
    if (result.error) {
      console.error('[test-reminder] Resend error:', JSON.stringify(result.error, null, 2));
      return NextResponse.json(
        { error: `Failed sending the ${labels[kind]} test`, sent },
        { status: 500 },
      );
    }
    sent.push(kind);
  }

  console.log(`[test-reminder] sent ${sent.join(', ')} to ${email}`);
  return NextResponse.json({ ok: true, sent, to: email });
}
