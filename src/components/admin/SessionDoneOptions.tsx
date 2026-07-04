'use client';

import { displayFee } from './api';
import type { SessionRow, ClientRow } from './types';

export interface SessionDoneChoice {
  record_payment: boolean;
  send_receipt: boolean;
}

interface Props {
  session: SessionRow;
  client: ClientRow;
  busy?: boolean;
  onChoose: (choice: SessionDoneChoice) => void;
  onCancel: () => void;
}

const btn: React.CSSProperties = {
  padding: '6px 10px', fontSize: 10.5, fontWeight: 500,
  border: '1px solid rgba(79,138,104,0.35)', borderRadius: 8,
  background: 'rgba(79,138,104,0.10)', color: 'var(--forest-deep)',
  cursor: 'pointer', textAlign: 'left',
};
const btnMuted: React.CSSProperties = {
  ...btn, background: 'transparent', border: '1px solid var(--line)', color: 'var(--ink-muted)',
};

/**
 * The "Session done" inline options — one explicit choice instead of the old
 * order-dependent Mark Attended / Mark Paid / Receipt dance. Every button
 * says exactly what will happen; nothing is emailed implicitly.
 */
export function SessionDoneOptions({ session, client, busy, onChoose, onCancel }: Props) {
  const isPaid = session.payment_status === 'paid';
  const hasReceipt = Boolean(session.receipt_sent_at);
  const isLowCost = Boolean(client.is_low_cost);
  const fee = displayFee(session.fee);

  return (
    <div style={{
      marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6,
      alignItems: 'flex-end',
    }}>
      {isPaid ? (
        <>
          {!hasReceipt && (
            <button
              style={btn}
              disabled={busy}
              onClick={() => onChoose({ record_payment: false, send_receipt: true })}
            >
              Mark attended + email receipt
            </button>
          )}
          <button
            style={hasReceipt ? btn : btnMuted}
            disabled={busy}
            onClick={() => onChoose({ record_payment: false, send_receipt: false })}
          >
            {hasReceipt ? 'Mark attended (paid ✓ · receipt sent ✓)' : 'Mark attended only'}
          </button>
        </>
      ) : (
        <>
          <button
            style={btn}
            disabled={busy}
            onClick={() => onChoose({ record_payment: true, send_receipt: true })}
          >
            {isLowCost
              ? `Done — cash received (${fee}) + email receipt`
              : `Done — paid ${fee} + email receipt`}
          </button>
          <button
            style={btnMuted}
            disabled={busy}
            onClick={() => onChoose({ record_payment: true, send_receipt: false })}
          >
            {isLowCost ? 'Done — cash received, no receipt' : 'Done — paid, no receipt'}
          </button>
          <button
            style={btnMuted}
            disabled={busy}
            onClick={() => onChoose({ record_payment: false, send_receipt: false })}
          >
            Done — not paid yet
          </button>
        </>
      )}
      <button
        onClick={onCancel}
        disabled={busy}
        style={{
          background: 'none', border: 'none', padding: 0, fontSize: 10.5,
          color: 'var(--ink-muted)', textDecoration: 'underline', cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
}
