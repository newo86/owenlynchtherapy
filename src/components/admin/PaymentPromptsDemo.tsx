'use client';

// Dev-only preview of PaymentPromptsCard with fake data (see
// src/app/(admin)/admin-demo/page.tsx). Choices just show a note. The layout
// follows the real viewport (phone layout at 768px and under), so check the
// phone view by opening this page in a real 390px-wide window.
import { useState, useSyncExternalStore } from 'react';
import { PaymentPromptsCard, type PaymentChoice } from './PaymentPromptsCard';
import { demoPrompts } from './demoData';

const QUERY = '(max-width: 768px)';
function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
const isPhone = () => window.matchMedia(QUERY).matches;

export function PaymentPromptsDemo() {
  const [last, setLast] = useState('');
  const compact = useSyncExternalStore(subscribe, isPhone, () => false);
  const onChoose = (id: string, c: PaymentChoice) => setLast(`Chose ${c} for ${id}. Nothing was saved or sent.`);
  return (
    <div className="admin-root" style={{ padding: 24, minHeight: '100vh' }}>
      <h1 className="admin-h1">Payment prompts demo</h1>
      <p className="admin-subline">Fake data. The layout follows this window: narrow it to 390px for the phone version.</p>
      {last && <div className="admin-banner is-ok" role="status">{last}</div>}

      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>List</h2>
      <div style={{ maxWidth: 760 }}>
        <PaymentPromptsCard key={compact ? 'phone' : 'desk'} prompts={demoPrompts} onChoose={onChoose} compact={compact} />
      </div>

      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>Confirm open</h2>
      <div style={{ maxWidth: 760 }}>
        <PaymentPromptsCard
          key={compact ? 'phone' : 'desk'}
          prompts={demoPrompts}
          onChoose={onChoose}
          compact={compact}
          initialConfirm={{ sessionId: 'demo-1', choice: 'paid_receipt' }}
        />
      </div>
    </div>
  );
}
