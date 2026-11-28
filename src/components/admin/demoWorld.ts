// Fixture "world" for the dev-only dashboard demo (/admin-demo): made-up
// clients, Tue/Fri sessions around a fixed "today", and a router that answers
// the admin API calls the real screens make. Pure and React-free so it is unit
// tested. Never real data. Writes are accepted and ignored: nothing is saved
// or sent, and nothing here touches the network.
import { localDublinToUtcIso } from '@/lib/dateUtils';
import { PRACTICE } from '@/practice.config';
import type { PracticeSettings } from '@/lib/practiceSettings';
import type { DriftItem } from '@/lib/calendarDrift';
import type { CalendarEvent, ClientRow, SessionRow, SubmissionRow, TokenRow, WaitlistRow } from './types';
import { demoFollowed } from './demoData';

interface Spec {
  id: string; name: string; email: string; day: 'tue' | 'fri'; time: string;
  every: 1 | 2; fee: number; format: 'in_person' | 'online';
  status: 'active' | 'new' | 'completed'; lowCost?: boolean;
  /** Week offsets (from this week) that are not paid yet. */
  unpaidWeeks?: number[];
  /** First and last week offset with a session. */
  from: number; to: number;
}

// Tuesday 4–8pm and Friday 3–7pm, as Owen's real week runs. Names are invented.
const SPECS: Spec[] = [
  { id: 'demo-c1', name: 'Aoife Example', email: 'aoife@example.com', day: 'tue', time: '16:00', every: 1, fee: 8000, format: 'in_person', status: 'active', from: -6, to: 5 },
  { id: 'demo-c2', name: 'Ciara Sample', email: 'ciara@example.com', day: 'tue', time: '17:00', every: 1, fee: 5000, format: 'online', status: 'active', lowCost: true, unpaidWeeks: [-1], from: -6, to: 5 },
  { id: 'demo-c3', name: 'Tom Placeholder', email: 'tom@example.com', day: 'tue', time: '18:00', every: 2, fee: 8000, format: 'in_person', status: 'active', from: -6, to: 4 },
  { id: 'demo-c4', name: 'Sam Tester', email: 'sam@example.com', day: 'fri', time: '15:00', every: 1, fee: 8000, format: 'in_person', status: 'active', unpaidWeeks: [-1], from: -6, to: 5 },
  { id: 'demo-c5', name: 'Nora Invented', email: 'nora@example.com', day: 'fri', time: '16:00', every: 2, fee: 8000, format: 'online', status: 'active', from: -6, to: 4 },
  { id: 'demo-c6', name: 'Orla Fictional', email: 'orla@example.com', day: 'fri', time: '17:00', every: 1, fee: 8000, format: 'online', status: 'active', from: -6, to: 5 },
  { id: 'demo-c7', name: 'Jamie Demo', email: 'jamie@example.com', day: 'fri', time: '18:00', every: 1, fee: 8000, format: 'in_person', status: 'active', from: -5, to: 5 },
  { id: 'demo-c8', name: 'Niamh Pretend', email: 'niamh@example.com', day: 'tue', time: '19:00', every: 1, fee: 8000, format: 'in_person', status: 'new', from: 1, to: 1 },
  { id: 'demo-c9', name: 'Declan Sample', email: 'declan@example.com', day: 'fri', time: '19:00', every: 1, fee: 8000, format: 'online', status: 'completed', from: -6, to: -3 },
];

export interface DemoWorld {
  nowMs: number;
  clients: ClientRow[];
  sessions: SessionRow[];
  events: CalendarEvent[];
  drift: DriftItem[];
  tokens: TokenRow[];
  submissions: SubmissionRow[];
  waitlist: WaitlistRow[];
  prompts: Array<Record<string, unknown>>;
  settings: PracticeSettings;
}

function dublinDate(nowMs: number): { y: number; m: number; d: number } {
  // `nowMs` is a Tuesday 15:20 Dublin (see demoClock): UTC date is the same day.
  const dt = new Date(nowMs);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

function isoAt(nowMs: number, weekOffset: number, day: 'tue' | 'fri', time: string): string {
  const { y, m, d } = dublinDate(nowMs);
  const date = new Date(Date.UTC(y, m, d + weekOffset * 7 + (day === 'fri' ? 3 : 0))).toISOString().slice(0, 10);
  return localDublinToUtcIso(`${date}T${time}`);
}

function demoSettings(): PracticeSettings {
  return {
    businessName: PRACTICE.businessName,
    practitionerName: PRACTICE.practitionerName,
    practitionerFirstName: PRACTICE.practitionerFirstName,
    jobTitle: PRACTICE.jobTitle,
    accreditation: { ...PRACTICE.accreditation },
    email: PRACTICE.email,
    telephone: PRACTICE.telephone,
    telephoneDisplay: PRACTICE.telephoneDisplay,
    hasInPerson: PRACTICE.hasInPerson,
    address: { ...PRACTICE.address },
    geo: { ...PRACTICE.geo },
    serviceArea: PRACTICE.serviceArea,
    mapsEmbedUrl: PRACTICE.mapsEmbedUrl,
    fees: { ...PRACTICE.fees },
    sessionMinutes: PRACTICE.sessionMinutes,
    priceRange: PRACTICE.priceRange,
    openingHours: PRACTICE.openingHours.map(h => ({ ...h })),
    availability: PRACTICE.availability.map(s => ({ ...s })),
    acceptingNewClients: PRACTICE.acceptingNewClients,
    waitlistNotice: PRACTICE.waitlistNotice,
    telehealthUrl: PRACTICE.telehealthUrl,
    stripeLinks: { ...PRACTICE.stripeLinks },
    gtmId: PRACTICE.gtmId,
    googleSiteVerification: PRACTICE.googleSiteVerification,
    socials: {
      instagram: PRACTICE.socials.instagram,
      psychologyToday: PRACTICE.socials.psychologyToday,
      directoryProfiles: [...PRACTICE.socials.directoryProfiles],
    },
  };
}

/** Build the whole fake practice around `nowMs` (a Tuesday 15:20, Dublin). */
export function buildDemoWorld(nowMs: number): DemoWorld {
  const sessions: SessionRow[] = [];
  const clients: ClientRow[] = [];
  const events: CalendarEvent[] = [];
  const prompts: DemoWorld['prompts'] = [];
  const venue = PRACTICE.address.venue;

  for (const spec of SPECS) {
    const own: SessionRow[] = [];
    for (let w = spec.from; w <= spec.to; w++) {
      if (spec.every === 2 && w % 2 !== 0) continue;
      const when = isoAt(nowMs, w, spec.day, spec.time);
      const past = new Date(when).getTime() < nowMs;
      const unpaid = past && (spec.unpaidWeeks ?? []).includes(w);
      const s: SessionRow = {
        id: `${spec.id}-s${w + 10}`,
        client_id: spec.id,
        session_date: when,
        session_format: spec.format,
        format_confirmed: true,
        location: spec.format === 'in_person' ? venue : null,
        fee: spec.fee,
        status: past ? 'attended' : 'scheduled',
        payment_status: past && !unpaid ? 'paid' : 'unpaid',
        stripe_payment_link_url: null,
        paid_at: past && !unpaid ? when : null,
        // Most past sessions had a receipt; one paid Friday did not (shows "needs receipt").
        receipt_sent_at: past && !unpaid && !(spec.id === 'demo-c6' && w === -1) ? when : null,
        notes: null,
        gcal_event_id: spec.status === 'completed' ? null : `demo-evt-${spec.id}-${w + 10}`,
        session_reminders: [],
      };
      own.push(s);
      if (unpaid) {
        prompts.push({
          session_id: s.id, session_date: when, fee: spec.fee,
          label: `${spec.name.split(' ')[0]} ${spec.name.split(' ')[1][0]}.`,
          client_name: spec.name, client_email: spec.email, receipt_sent_at: null, snoozed: false,
        });
      }
      if (s.gcal_event_id && when) {
        const end = new Date(new Date(when).getTime() + PRACTICE.sessionMinutes * 60_000).toISOString();
        events.push({ id: s.gcal_event_id, title: `Session — ${spec.name}`, start: when, end, location: s.location ?? undefined });
      }
    }
    sessions.push(...own);
    clients.push({
      id: spec.id, full_name: spec.name, email: spec.email, phone: null,
      date_of_birth: null, emergency_contact_name: null, emergency_contact_phone: null,
      gp_name: null, gp_phone: null, session_fee: spec.fee, status: spec.status,
      created_at: isoAt(nowMs, spec.from - 1, spec.day, '09:00'),
      notes: null, is_low_cost: Boolean(spec.lowCost), reminders_opted_out: false,
      sessions: own,
    });
  }

  const jamie = sessions.find(s => s.client_id === 'demo-c7' && s.status === 'scheduled');
  const drift: DriftItem[] = jamie ? [{
    key: `moved_in_google:${jamie.id}:${jamie.gcal_event_id}`,
    kind: 'moved_in_google', clientId: 'demo-c7', clientName: 'Jamie Demo',
    sessionId: jamie.id, eventId: jamie.gcal_event_id ?? undefined, eventTitle: 'Session — Jamie Demo',
    appStart: jamie.session_date,
    googleStart: new Date(new Date(jamie.session_date).getTime() + 60 * 60_000).toISOString(),
  }] : [];

  const created = isoAt(nowMs, -1, 'tue', '10:00');
  return {
    nowMs, clients, sessions, events, drift, prompts,
    tokens: [{
      id: 'demo-t1', token: 'demo-token', client_name: 'Niamh Pretend', client_email: 'niamh@example.com',
      created_at: created, expires_at: isoAt(nowMs, 2, 'tue', '10:00'), is_used: false,
    }],
    submissions: [{
      id: 'demo-f1', client_id: 'demo-c1', full_name: 'Aoife Example', email: 'aoife@example.com',
      session_format: 'in_person', submitted_at: isoAt(nowMs, -6, 'tue', '09:30'),
    }],
    waitlist: [
      { id: 'demo-w1', full_name: 'Ruairi Imagined', email: 'ruairi@example.com', phone: null, reason: null, status: 'waiting', created_at: created, contacted_at: null, format_preference: 'online' },
      { id: 'demo-w2', full_name: 'Maeve Notreal', email: 'maeve@example.com', phone: null, reason: null, status: 'waiting', created_at: created, contacted_at: null, format_preference: 'either' },
    ],
    settings: demoSettings(),
  };
}

export interface DemoReply { status: number; body: unknown }

const ok = (body: unknown = { ok: true, demo: true }): DemoReply => ({ status: 200, body });

/** Answer one admin API call. Reads come from the world; writes are accepted
 *  and ignored (the screen shows its normal success message). */
export function demoRoute(world: DemoWorld, method: string, rawUrl: string): DemoReply {
  const url = new URL(rawUrl, 'http://demo.invalid');
  const path = url.pathname;
  const m = method.toUpperCase();

  if (m !== 'GET') {
    if (path === '/api/admin/mark-attended') return ok({ ok: true, demo: true, paid: false, receipt_sent: false });
    if (path === '/api/admin/payment-prompts') return ok({ ok: true, demo: true, outcome: 'paid', receipt_requested: false });
    if (path.startsWith('/api/admin/calendar/followed')) return ok();
    return ok();
  }

  switch (path) {
    case '/api/admin/clients': return ok({ clients: world.clients });
    case '/api/intake/tokens': return ok({ tokens: world.tokens });
    case '/api/intake/submissions': return ok({ submissions: world.submissions });
    case '/api/auth/google/status': return ok({ connected: true, email: 'diary@example.com' });
    case '/api/admin/reminders/status':
      return ok({
        lastRun: { ran_at: new Date(world.nowMs - 9 * 3600_000).toISOString(), outcome: 'completed', candidates: 3, sent: 3, skipped: 0, failed: 0, detail: null },
        emailsEnabled: true,
      });
    case '/api/admin/waitlist': return ok({ waitlist: world.waitlist });
    case '/api/admin/calendar': {
      const weekOffset = Number(url.searchParams.get('weekOffset') ?? 0);
      const weeks = Number(url.searchParams.get('weeks') ?? 1);
      const { y, m: mo, d } = dublinDate(world.nowMs);
      const from = Date.UTC(y, mo, d - 1 + weekOffset * 7);
      const to = from + weeks * 7 * 86_400_000;
      const events = world.events.filter(e => { const t = new Date(e.start).getTime(); return t >= from && t < to; });
      return ok({ connected: true, events, changed: 0, drift: weekOffset === 0 ? world.drift : [] });
    }
    case '/api/admin/calendar/followed': return ok({ items: demoFollowed });
    case '/api/admin/payment-prompts': return ok({ prompts: world.prompts });
    case '/api/admin/settings': return ok({ settings: world.settings, saved: true, updated_at: null });
    case '/api/admin/questionnaires': return ok({ responses: [], pending: [] });
    case '/api/admin/sessions/series': return ok({ series: { id: 'demo-series', interval_weeks: 1 } });
    case '/api/admin/sessions': {
      const id = url.searchParams.get('client_id');
      return ok({ sessions: world.sessions.filter(s => s.client_id === id) });
    }
    default:
      return { status: 404, body: { error: `Demo has no fixture for ${path}` } };
  }
}
