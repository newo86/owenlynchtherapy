'use client';

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

const PAYMENT_TONES: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  paid:     { bg: 'rgba(79,138,104,0.2)',  fg: '#A6E3BD', border: 'rgba(79,138,104,0.35)', label: 'Paid' },
  unpaid:   { bg: 'rgba(200,90,26,0.22)',  fg: '#F4956A', border: 'rgba(200,90,26,0.4)',   label: 'Unpaid' },
  refunded: { bg: 'rgba(255,255,255,0.08)', fg: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.15)', label: 'Refunded' },
};
const FORMAT_TONES: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  in_person: { bg: 'rgba(255,255,255,0.07)', fg: 'rgba(255,255,255,0.75)', border: 'rgba(255,255,255,0.14)', label: 'In Person' },
  online:    { bg: 'rgba(79,138,104,0.15)',  fg: '#A6E3BD',                border: 'rgba(79,138,104,0.3)',   label: 'Online' },
};

function Pill({ tones, kind }: { tones: typeof PAYMENT_TONES; kind: string }) {
  const t = tones[kind] ?? tones[Object.keys(tones)[0]];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 8px', borderRadius: 5,
      background: t.bg, color: t.fg, border: `1px solid ${t.border}`,
      fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
    }}>{t.label}</span>
  );
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
    <div className="admin-glass admin-glass-hover" style={{
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
    }}>
      <Avatar name={client.full_name} size={42} />

      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 500, fontSize: 15, color: 'white' }}>
          {client.full_name}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
          {client.email}
        </div>
      </div>

      <div style={{ minWidth: 90 }}>
        <div style={{
          fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
          fontWeight: 200, fontSize: 22, color: 'white',
        }}>
          {formatTime(session.session_date)}
        </div>
        <div style={{ fontSize: 11, color: '#D4A843', letterSpacing: '0.5px' }}>
          {displayFee(session.fee)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Pill tones={FORMAT_TONES} kind={formatKind} />
        <Pill tones={PAYMENT_TONES} kind={paymentKind} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginLeft: 'auto' }}>
        {session.status === 'scheduled' && onMarkAttended && (
          <button onClick={onMarkAttended} disabled={busy} className="admin-btn-primary">Mark Attended</button>
        )}
        {onSendReceipt && (
          <button onClick={onSendReceipt} disabled={busy} className="admin-btn-secondary">Send Receipt</button>
        )}
      </div>

      {needsAttendedConfirm && (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, paddingTop: 10, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#F4956A' }}>
            Payment not yet received. Mark attended anyway?
          </p>
          <button onClick={onConfirmAttended} className="admin-btn-primary">Confirm</button>
          <button onClick={onCancelConfirm} className="admin-btn-ghost">Cancel</button>
        </div>
      )}

      {feedback && (
        <p style={{ width: '100%', margin: 0, fontSize: 12, color: '#A6E3BD', paddingTop: 4 }}>
          {feedback}
        </p>
      )}
    </div>
  );
}
