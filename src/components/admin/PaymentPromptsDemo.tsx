'use client';

// Dev-only preview of PaymentPromptsCard with fake data (see
// src/app/(admin)/admin-demo/page.tsx). Choices just show a note.
import { useState } from 'react';
import { PaymentPromptsCard, type PaymentChoice } from './PaymentPromptsCard';
import { demoPrompts } from './demoData';

export function PaymentPromptsDemo() {
  const [last, setLast] = useState('');
  const onChoose = (id: string, c: PaymentChoice) => setLast(`Chose ${c} for ${id}. Nothing was saved or sent.`);
  return (
    <div className="admin-root" style={{ padding: 24, minHeight: '100vh' }}>
      <h1 className="admin-h1">Payment prompts demo</h1>
      <p className="admin-subline">Fake data. Desktop first, then a 390px phone frame, then the first row with its confirm already open.</p>
      {last && <div className="admin-banner is-ok" role="status">{last}</div>}

      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>Desktop</h2>
      <div style={{ maxWidth: 760 }}>
        <PaymentPromptsCard prompts={demoPrompts} onChoose={onChoose} />
      </div>

      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>Phone (390px)</h2>
      <div className="pp-phone" style={{ width: 390, maxWidth: '100%' }}>
        <PaymentPromptsCard prompts={demoPrompts} onChoose={onChoose} />
      </div>

      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>Confirm open (phone)</h2>
      <div className="pp-phone" style={{ width: 390, maxWidth: '100%' }}>
        <PaymentPromptsCard
          prompts={demoPrompts}
          onChoose={onChoose}
          initialConfirm={{ sessionId: 'demo-1', choice: 'paid_receipt' }}
        />
      </div>

      <h2 className="admin-h2" style={{ margin: '24px 0 10px' }}>Confirm open (desktop)</h2>
      <div style={{ maxWidth: 760 }}>
        <PaymentPromptsCard
          prompts={demoPrompts}
          onChoose={onChoose}
          initialConfirm={{ sessionId: 'demo-1', choice: 'paid_receipt' }}
        />
      </div>
    </div>
  );
}
