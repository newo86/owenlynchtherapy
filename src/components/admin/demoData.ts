// Made-up clients for the dev-only /admin-demo page. Never real data.
import type { PaymentPromptItem } from './PaymentPromptsCard';

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
