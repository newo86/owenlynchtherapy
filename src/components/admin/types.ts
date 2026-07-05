export interface SessionRow {
  id: string;
  client_id: string;
  session_date: string;
  session_format: string;
  location: string | null;
  fee: number; // cents
  status: 'scheduled' | 'attended' | 'cancelled' | 'no_show' | string;
  payment_status: 'paid' | 'unpaid' | 'refunded' | string;
  stripe_payment_link_url: string | null;
  stripe_payment_link_id?: string | null;
  stripe_payment_intent_id?: string | null;
  paid_at?: string | null;
  receipt_sent_at: string | null;
  notes: string | null;
  gcal_event_id?: string | null;
  /** Reminder log rows for this session (nested from session_reminders). */
  session_reminders?: { sent_at: string; reminder_type: string }[];
}

export interface ClientRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  gp_name: string | null;
  gp_phone: string | null;
  session_fee: number;
  status: 'active' | 'new' | 'completed' | string;
  created_at: string;
  notes?: string | null;
  is_low_cost?: boolean;
  reminders_opted_out?: boolean;
  sessions: SessionRow[];
}

export interface TokenRow {
  id: string;
  token: string;
  client_name: string | null;
  client_email: string | null;
  created_at: string;
  expires_at: string;
  is_used: boolean;
}

export interface SubmissionRow {
  id: string;
  client_id: string | null;
  full_name: string;
  email: string | null;
  session_format: string;
  submitted_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO
  end: string;   // ISO
  description?: string;
  location?: string;
  htmlLink?: string;
}

export interface CalendarStatus {
  connected: boolean;
  email?: string;
}

/** Minimal reference to a Google Calendar event — used for editing/deleting unmatched GCal-only cards. */
export interface GcalRef {
  id: string;
  title: string;
  start: string;     // ISO (RFC 3339 from GCal)
  location?: string; // used to detect in_person vs online on first open
}

/** Latest automatic reminder run + kill-switch state, from /api/admin/reminders/status. */
export interface ReminderHealth {
  lastRun: {
    ran_at: string;
    outcome: string; // 'completed' | 'completed:with-failures' | 'aborted:<reason>' | 'error:<reason>'
    candidates: number;
    sent: number;
    skipped: number;
    failed: number;
    detail: unknown;
  } | null;
  emailsEnabled: boolean;
}

export interface WaitlistRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: 'waiting' | 'contacted' | string;
  created_at: string;
  contacted_at: string | null;
}

export type AdminSection = 'dashboard' | 'clients' | 'sessions' | 'revenue' | 'forms' | 'waitlist' | 'settings' | 'new-client';

export type SessionFilter = 'all' | 'unpaid' | 'needs_receipt' | 'this_week' | 'unpaid_this_week';
export type FormsTab = 'submitted' | 'pending';

export const FORMAT_LABELS: Record<string, string> = {
  in_person: 'In Person',
  online: 'Online',
  no_preference: 'No Preference',
};
