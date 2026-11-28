// Made-up clients for the dev-only /admin-demo page. Never real data.
import type { PaymentPromptItem } from './PaymentPromptsCard';
import type { FollowedItem } from '@/lib/followGoogle';

export const demoPrompts: PaymentPromptItem[] = [
  {
    session_id: 'demo-1',
    session_date: '2026-11-24T16:00:00.000Z',
    fee: 8000,
    label: 'Aoife E.',
    client_name: 'Aoife Example',
    client_email: 'aoife@example.com',
    receipt_sent_at: null,
    snoozed: false,
  },
  {
    session_id: 'demo-2',
    session_date: '2026-11-24T17:00:00.000Z',
    fee: 7000,
    label: 'Ciara S.',
    client_name: 'Ciara Sample',
    client_email: 'ciara@example.com',
    receipt_sent_at: null,
    snoozed: false,
  },
  {
    session_id: 'demo-3',
    session_date: '2026-11-27T15:00:00.000Z',
    fee: 8000,
    label: 'Sam T.',
    client_name: 'Sam Tester',
    client_email: null,
    receipt_sent_at: null,
    snoozed: true,
  },
];

export const demoFollowed: FollowedItem[] = [
  {
    id: 'demo-f1', kind: 'cancelled_occurrence', label: 'Aoife E.',
    line: 'Cancelled Aoife E.’s Tue 2 Dec, 4:00pm session — deleted in Google',
    appliedAt: '2026-11-28T09:10:00.000Z', undone: false, canUndo: true,
  },
  {
    id: 'demo-f2', kind: 'interval_changed', label: 'Ciara S.',
    line: 'Ciara S. now every 2 weeks (was weekly) — changed in Google; cancelled 4 sessions that no longer fit',
    appliedAt: '2026-11-27T18:40:00.000Z', undone: false, canUndo: true,
  },
  {
    id: 'demo-f3', kind: 'series_ended', label: 'Sam T.',
    line: 'Cancelled Sam T.’s 6 sessions from Fri 5 Dec, 3:00pm — the series was deleted in Google',
    appliedAt: '2026-11-26T12:05:00.000Z', undone: false, canUndo: true,
  },
];

export const demoFrequencySummary =
  'From Tue 9 Dec, every 2 weeks. Cancels 4 sessions: Tue 16 Dec, Tue 30 Dec, Tue 13 Jan and Tue 27 Jan. Google Calendar will be updated. Your client isn’t emailed.';
