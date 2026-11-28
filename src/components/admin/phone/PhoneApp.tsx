'use client';

// The phone app (Sage Diary stage 3, <= 768px), built to docs/design/prototypes/
// sage-diary-phone.html: a deep sage tab bar (Today, Calendar, Clients, More),
// one yellow main action above it per tab, a header art band per screen, rows
// you can swipe or tap that open a full-screen session page, sub-pages with a
// back button (Money, Forms, Waitlist, Settings, a client), and the Book sheet.
// It reuses the dashboard's data and routes; AdminShell owns the data and the
// existing pop-ups (client record, session editor, Add a client).
//
// Layers sit below the dashboard's own pop-ups (z-index 90+) so those open on
// top. While a layer is open the screens behind it are inert (no Tab, no
// screen-reader reading) and the page doesn't scroll.

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFreeTimes } from '../useFreeTimes';
import { Waitlist } from '../Waitlist';
import { FormsBody } from '../DesktopForms';
import { SettingsOverview } from '../SettingsOverview';
import { SettingsPanel } from '../SettingsPanel';
import { HoursPage } from '../HoursPage';
import { AccountTab } from '../SettingsHub';
import { IconCalendar, IconChevronLeft, IconChevronRight, IconClose, IconMore, IconPeople, IconToday } from '../sage';
import { cadenceLabel, dublinYmd, firstName } from '../desktopToday';
import { dedupeSessions, displayFee } from '../api';
import type { Navigate } from '../NeedsDecision';
import type { DriftItem } from '@/lib/calendarDrift';
import type {
  CalendarEvent, CalendarStatus, ClientRow, FormsTab, ReminderHealth, SessionFilter, SessionRow, SubmissionRow, TokenRow, WaitlistRow,
} from '../types';
import { PhoneToday } from './PhoneToday';
import { PhoneCalendar } from './PhoneCalendar';
import { PhoneClients, PhoneClientPage } from './PhoneClients';
import { PhoneMore, PhoneMoney, type MorePage } from './PhoneMore';
import { PhoneSessionPage } from './PhoneSessionPage';
import { PhoneBookSheet } from './PhoneBookSheet';
import { useFocusReturn } from './useFocusReturn';
import type { PhoneOption } from './SwipeRow';

type Tab = 'today' | 'calendar' | 'clients' | 'more';
type Page =
  | { kind: MorePage | 'practice' | 'hours' | 'account'; back: string }
  | { kind: 'client'; clientId: string; back: string };
interface SessionState { id: string; option: PhoneOption | null }
interface SheetState { title: string; clientId?: string; slot?: string }
interface ToastState { text: string; undo?: () => void | Promise<void>; error?: boolean }

/** Kept out of the component: reading the clock is for event handlers, not rendering. */
const currentTimeMs = () => Date.now();

/** Back labels that are places, not people; anything else is a client's first name and is blurred in privacy mode. */
const GENERIC_BACK = new Set(['More', 'Clients', 'Settings', 'Back']);

const MAIN: Record<Tab, string | null> = { today: 'Book next session', calendar: 'Book a session', clients: 'Add a client', more: null };

interface Props {
  clients: ClientRow[];
  tokens: TokenRow[];
  submissions: SubmissionRow[];
  events: CalendarEvent[];
  drift: DriftItem[];
  calendar: CalendarStatus | null;
  waitlist: WaitlistRow[];
  reminderHealth: ReminderHealth | null;
  flash: { kind: 'success' | 'error'; msg: string } | null;
  /** The last refresh failed: the numbers shown may be stale. */
  loadError: boolean;
  sessionsFilter?: SessionFilter;
  formsTab?: FormsTab;
  /** A notice's button carried a filter (unpaid, needs receipt, pending forms): remember it for the page it opens. */
  onIntent: (opts: { sessionsFilter?: SessionFilter; formsTab?: FormsTab }) => void;
  onReload: () => void;
  onConnectCalendar: () => void;
  onDisconnectCalendar: () => void;
  onNewClient: () => void;
  /** The existing client record (ClientDetail). */
  onOpenClientRecord: (c: ClientRow) => void;
  /** The existing session editor (SessionEditModal). */
  onEditSession: (s: SessionRow, c: ClientRow) => void;
  privacy: boolean;
  onTogglePrivacy: () => void;
  onOpenMfa: () => void;
  onSignOut: () => void;
  /** The existing calendar (SessionsList) and income report + statement import. */
  fullCalendar: ReactNode;
  fullMoney: ReactNode;
  /** A dashboard pop-up (client record, editor, Add a client) is open above the phone layers. */
  overlayOpen: boolean;
}

export function PhoneApp(p: Props) {
  const { clients } = p;
  const [tab, setTab] = useState<Tab>('today');
  const [stack, setStack] = useState<Page[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [calOpenFull, setCalOpenFull] = useState(false);
  const free = useFreeTimes(clients, reloadKey);
  const { remember, restore } = useFocusReturn();
  const toastTimer = useRef<number | undefined>(undefined);

  const page = stack[stack.length - 1] ?? null;

  // Which session is open (found afresh, so a reload updates it; gone = close).
  let found: { s: SessionRow; c: ClientRow } | null = null;
  if (session) {
    for (const c of clients) { const s = c.sessions.find(x => x.id === session.id); if (s) { found = { s, c }; break; } }
  }
  // A session that has gone (deleted elsewhere) simply isn't shown.
  const sessionOpen = Boolean(session && found);

  const refresh = useCallback(() => { p.onReload(); setReloadKey(k => k + 1); }, [p]);

  // The page behind a layer never scrolls.
  const locked = Boolean(page || sessionOpen || sheet);
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [locked]);

  const showToast = useCallback((text: string, undo?: () => void | Promise<void>, error?: boolean) => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, undo, error });
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 8000 : 6000);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const rowFallback = (rowId?: string) => () => (rowId ? document.querySelector<HTMLElement>(`[data-session-row="${rowId}"] .ph-row`) : null);

  function openSession(id: string, option: PhoneOption | null = null) {
    remember(); setSession({ id, option });
  }
  function closeSession() { const id = session?.id; setSession(null); restore(rowFallback(id)); }
  function openSheet(s: SheetState) { remember(); setSheet(s); }
  function closeSheet() { setSheet(null); restore(); }
  function push(next: Page) { remember(); setStack(st => [...st, next]); }
  function back() { setStack(st => st.slice(0, -1)); restore(); }

  function selectTab(t: Tab) {
    setStack([]); setSession(null); setSheet(null); setCalOpenFull(false);
    setTab(t);
    window.scrollTo({ top: 0 });
  }

  // A "Needs a decision" notice's button: the right page, carrying its filter.
  const navigate: Navigate = (section, opts) => {
    p.onIntent({ sessionsFilter: opts?.sessionsFilter, formsTab: opts?.formsTab });
    if (section === 'revenue') { setTab('more'); setStack([{ kind: 'money', back: 'More' }]); return; }
    if (section === 'forms') { setTab('more'); setStack([{ kind: 'forms', back: 'More' }]); return; }
    if (section === 'sessions') { setStack([]); setTab('calendar'); setCalOpenFull(true); window.scrollTo({ top: 0 }); return; }
    setStack([]); setTab('today');
  };

  // Escape: close the top layer (the session page and the sheet handle their own).
  useEffect(() => {
    if (sessionOpen || sheet || p.overlayOpen || !page) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); back(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionOpen, sheet, page, p.overlayOpen]);

  const clientById = (id: string) => clients.find(c => c.id === id);
  const waiting = p.waitlist.filter(w => w.status === 'waiting').length;

  function bookNext() {
    // The client whose session started most recently today (the one just seen), else the first still to come.
    const today = dublinYmd(new Date().toISOString());
    const list: Array<{ c: ClientRow; t: number }> = [];
    for (const c of clients) for (const s of dedupeSessions(c.sessions)) {
      if (s.status !== 'cancelled' && dublinYmd(s.session_date) === today) list.push({ c, t: new Date(s.session_date).getTime() });
    }
    list.sort((a, b) => a.t - b.t);
    const nowMs = currentTimeMs();
    const seen = list.filter(x => x.t <= nowMs).pop() ?? list[0];
    openSheet({ title: 'Book next session', clientId: seen?.c.id });
  }
  function mainAction() {
    if (tab === 'today') bookNext();
    else if (tab === 'calendar') openSheet({ title: 'Book a session' });
    else if (tab === 'clients') p.onNewClient();
  }

  // ── Sub-page content ──────────────────────────────────────────────────
  function pageFrame(pg: Page): { title: string; sub: string; titleClass?: string; body: ReactNode } {
    const monthName = new Date().toLocaleDateString('en-IE', { month: 'long', timeZone: 'Europe/Dublin' });
    switch (pg.kind) {
      case 'money':
        return { title: 'Money', sub: `${monthName} so far`, body: <PhoneMoney clients={clients} onOpenSession={(id, o) => openSession(id, o)} fullMoney={p.fullMoney} /> };
      case 'forms':
        return { title: 'Forms', sub: 'Send to a client, or download a PDF', body: <FormsBody clients={clients} submissions={p.submissions} tokens={p.tokens} formsTab={p.formsTab} onNewClient={p.onNewClient} /> };
      case 'waitlist':
        return { title: 'Waitlist', sub: waiting === 0 ? 'Nobody waiting' : `${waiting} ${waiting === 1 ? 'person' : 'people'} waiting`, body: <Waitlist rows waitlist={p.waitlist} onReload={p.onReload} /> };
      case 'settings':
        return {
          title: 'Settings', sub: 'Your practice',
          body: (
            <>
              <SettingsOverview phone clients={clients} calendar={p.calendar} onGo={t => push({ kind: t, back: 'Settings' })} />
              <div className="ph-card">
                <button type="button" className="ph-navrow" onClick={() => push({ kind: 'account', back: 'Settings' })}>
                  <span className="ph-txt"><b>Account and privacy</b><span>Google Calendar, privacy mode, two-factor, sign out</span></span>
                  <span className="ph-chev" aria-hidden><IconChevronRight /></span>
                </button>
              </div>
            </>
          ),
        };
      case 'practice': return { title: 'Practice', sub: 'Fees, links and working hours', body: <SettingsPanel /> };
      case 'hours': return { title: 'Accreditation hours', sub: 'Towards your target', body: <HoursPage clients={clients} /> };
      case 'account':
        return {
          title: 'Account and privacy', sub: 'This device and your sign-in',
          body: <AccountTab calendar={p.calendar} onConnectCalendar={p.onConnectCalendar} onDisconnectCalendar={p.onDisconnectCalendar}
            privacy={p.privacy} onTogglePrivacy={p.onTogglePrivacy} onOpenMfa={p.onOpenMfa} onSignOut={p.onSignOut} />,
        };
      case 'client': {
        const c = clientById(pg.clientId);
        if (!c) return { title: 'Client', sub: '', body: <p className="ph-note">This client is no longer on the list.</p> };
        const last = dedupeSessions(c.sessions).filter(s => s.status !== 'cancelled')
          .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())[0];
        const line = [cadenceLabel(c), last ? (last.session_format === 'online' ? 'Online' : 'In person') : null, c.session_fee ? displayFee(c.session_fee) : null].filter(Boolean).join(' · ');
        return {
          title: c.full_name, sub: line, titleClass: 'pii',
          body: <PhoneClientPage client={c} onOpenSession={(id, o) => openSession(id, o)}
            onBook={id => openSheet({ title: 'Book next session', clientId: id })}
            onSendForms={() => push({ kind: 'forms', back: firstName(c.full_name) })}
            onDetails={() => p.onOpenClientRecord(c)} />,
        };
      }
    }
  }
  const frame = page ? pageFrame(page) : null;

  return (
    <div className="ph-app">
      {/* Screens behind a layer are inert and not announced. */}
      <div className="ph-screens" inert={locked} aria-hidden={locked || undefined}>
        <main>
          <section className="ph-screen" aria-label="Today" hidden={tab !== 'today'}>
            {tab === 'today' && (
              <PhoneToday clients={clients} tokens={p.tokens} events={p.events} drift={p.drift} calendar={p.calendar}
                reminderHealth={p.reminderHealth} flash={p.flash} loadError={p.loadError} onRetry={p.onReload} free={free}
                onOpenSession={openSession} onBook={slot => openSheet({ title: 'Book a session', slot })}
                onReload={refresh} onConnectCalendar={p.onConnectCalendar} onNavigate={navigate} />
            )}
          </section>
          <section className="ph-screen" aria-label="Calendar" hidden={tab !== 'calendar'}>
            {tab === 'calendar' && <PhoneCalendar clients={clients} onOpenSession={openSession} fullCalendar={p.fullCalendar} openFull={calOpenFull || p.sessionsFilter !== undefined} />}
          </section>
          <section className="ph-screen" aria-label="Clients" hidden={tab !== 'clients'}>
            {tab === 'clients' && <PhoneClients clients={clients} onOpenClientPage={id => push({ kind: 'client', clientId: id, back: 'Clients' })} />}
          </section>
          <section className="ph-screen" aria-label="More" hidden={tab !== 'more'}>
            {tab === 'more' && <PhoneMore clients={clients} waiting={waiting} privacy={p.privacy} onTogglePrivacy={p.onTogglePrivacy}
              onOpenPage={k => push({ kind: k, back: 'More' })} />}
          </section>
        </main>
      </div>

      <div className="ph-chrome" inert={Boolean(sessionOpen || sheet)}>
        {!page && MAIN[tab] && <button type="button" className="ph-main" onClick={mainAction}>{MAIN[tab]}</button>}
        <nav className="ph-tabs" aria-label="Main">
          {([['today', 'Today', <IconToday key="t" />], ['calendar', 'Calendar', <IconCalendar key="c" />], ['clients', 'Clients', <IconPeople key="p" />], ['more', 'More', <IconMore key="m" />]] as const).map(([id, label, icon]) => (
            <button key={id} type="button" className="ph-tab" aria-current={tab === id ? 'page' : undefined} onClick={() => selectTab(id)}>{icon}{label}</button>
          ))}
        </nav>
      </div>

      {page && frame && (
        <section className="ph-layer is-page" aria-labelledby="ph-page-title" inert={Boolean(sessionOpen || sheet)}>
          <div className="ph-layer-head ph-page-head">
            <button type="button" className="ph-back" onClick={back} autoFocus><IconChevronLeft /><span className={GENERIC_BACK.has(page.back) ? undefined : 'pii'}>{page.back}</span></button>
            <h2 id="ph-page-title" className={frame.titleClass}>{frame.title}</h2>
            {frame.sub && <p>{frame.sub}</p>}
          </div>
          <div className="ph-layer-body">{frame.body}</div>
        </section>
      )}

      {session && found && sessionOpen && (
        <PhoneSessionPage key={session.id} session={found.s} client={found.c} initialOption={session.option} free={free}
          onClose={closeSession} onChanged={refresh} onToast={showToast}
          onOpenClientPage={() => {
            const cid = found!.c.id;
            setSession(null);
            if (!(page?.kind === 'client' && page.clientId === cid)) setStack(st => [...st, { kind: 'client', clientId: cid, back: tab === 'clients' ? 'Clients' : 'Back' }]);
          }}
          onEditSession={() => { const { s, c } = found!; setSession(null); p.onEditSession(s, c); }} />
      )}

      {sheet && (
        <PhoneBookSheet clients={clients} free={free} title={sheet.title} initialClientId={sheet.clientId} initialSlot={sheet.slot}
          onClose={closeSheet}
          onBooked={(message, ok) => { setSheet(null); showToast(message, undefined, !ok); refresh(); }} />
      )}

      {toast && (
        <div className={`ph-toast${toast.error ? ' is-error' : ''}`} role="status" aria-live="polite">
          <span className="pii">{toast.text}</span>
          {toast.undo && <button type="button" onClick={async () => { const u = toast.undo; setToast(null); await u?.(); }}>Undo</button>}
          <button type="button" aria-label="Dismiss" onClick={() => setToast(null)}><IconClose /></button>
        </div>
      )}
    </div>
  );
}
