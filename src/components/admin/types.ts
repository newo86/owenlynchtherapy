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

export type AdminSection = 'dashboard' | 'clients' | 'sessions' | 'revenue' | 'forms' | 'new-client';

export type SessionFilter = 'all' | 'unpaid' | 'needs_receipt' | 'this_week' | 'unpaid_this_week';
export type FormsTab = 'submitted' | 'pending';

export const FORMAT_LABELS: Record<string, string> = {
  in_person: 'In Person',
  online: 'Online',
  no_preference: 'No Preference',
};
