'use client';

import { colors, fonts, shadows } from './theme';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { displayFee, formatTime } from './api';
import type { SessionRow, ClientRow } from './types';

interface Props {
  session: SessionRow;
  client: ClientRow;
  busy?: boolean;
  feedback?: string | null;
  needsAttendedConfirm?: boolean;
  onMarkAttended?: () => void;
  onConfirmAttended?: () => void;
  onCancelConfirm?: () => void;
  onSendReceipt?: () => void;
}

export function SessionCard({
  session, client, busy, feedback,
  needsAttendedConfirm,
  onMarkAttended, onConfirmAttended, onCancelConfirm, onSendReceipt,
}: Props) {
  const formatKind = session.session_format === 'in_person' ? 'in_person' : 'online';
  const paymentKind = session.payment_status === 'paid' ? 'paid'
    : session.payment_status === 'refunded' ? 'refunded' : 'unpaid';

  return (
    <div
      style={{
        background: colors.white,
        borderRadius: 8,
        borderTop: `3px solid ${colors.gold}`,
        boxShadow: shadows.card,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <Avatar name={client.full_name} size={42} />

      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontFamily: fonts.sans, fontWeight: 500, fontSize: 15, color: colors.forest }}>
          {client.full_name}
        </div>
        <div style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          {client.email}
        </div>
      </div>

      <div style={{ minWidth: 90 }}>
        <div style={{ fontFamily: fonts.display, fontWeight: 300, fontSize: 22, color: colors.forest }}>
          {formatTime(session.session_date)}
        </div>
        <div style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.textMuted, letterSpacing: '0.5px' }}>
          {displayFee(session.fee)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge kind={formatKind} />
        <Badge kind={paymentKind} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
        {session.status === 'scheduled' && onMarkAttended && (
          <button onClick={onMarkAttended} disabled={busy} className="admin-btn-primary">
            Mark Attended
          </button>
        )}
        {onSendReceipt && (
          <button onClick={onSendReceipt} disabled={busy} className="admin-btn-secondary">
            Send Receipt
          </button>
        )}
      </div>

      {needsAttendedConfirm && (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0 0', flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontFamily: fonts.sans, fontSize: 13, color: colors.terracottaDark }}>
            Payment not yet received. Mark attended anyway?
          </p>
          <button
            onClick={onConfirmAttended}
            style={{
              padding: '6px 12px', background: colors.terracotta, color: colors.white,
              border: 'none', borderRadius: 5,
              fontFamily: fonts.sans, fontSize: 11, fontWeight: 500, letterSpacing: '1.2px',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >Confirm</button>
          <button
            onClick={onCancelConfirm}
            style={{
              padding: '6px 12px', background: 'transparent', color: colors.textMuted,
              border: `1px solid ${colors.border}`, borderRadius: 5,
              fontFamily: fonts.sans, fontSize: 11, fontWeight: 500, letterSpacing: '1.2px',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >Cancel</button>
        </div>
      )}

      {feedback && (
        <p style={{ width: '100%', margin: 0, fontFamily: fonts.sans, fontSize: 12, color: colors.sageDark, paddingTop: 4 }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
