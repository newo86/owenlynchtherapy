'use client';

import { useState } from 'react';
import { X, Check, Copy } from 'lucide-react';
import { adminFetch } from './api';

interface Props {
  asModal?: boolean;
  initialClientName?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface Generated {
  url: string;
  paymentLinkUrl: string;
  clientEmail: string;
}

export function NewClientModal({ asModal = false, initialClientName, onClose, onSuccess }: Props) {
  const [clientName, setClientName] = useState(initialClientName ?? '');
  const [clientEmail, setClientEmail] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionFormat, setSessionFormat] = useState<'in_person' | 'online'>('in_person');
  const [sessionFee, setSessionFee] = useState('');
  const [sendIntake, setSendIntake] = useState(true);
  const [isLowCost, setIsLowCost] = useState(false);
  // Optional contact / personal detail fields
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [gpName, setGpName] = useState('');
  const [gpPhone, setGpPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<Generated | null>(null);
  const [quickAddDone, setQuickAddDone] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copy(value: string, key: string) {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(c => (c === key ? null : c)), 1500);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setGenerated(null);
    setQuickAddDone(false);
    try {
      if (sendIntake) {
        // Full intake flow — generates token, creates Stripe link, emails client.
        const res = await adminFetch('/api/intake/generate-token', {
          method: 'POST',
          body: JSON.stringify({
            client_name: clientName,
            client_email: clientEmail,
            session_date: sessionDate,
            session_format: sessionFormat,
            session_fee: Number(sessionFee),
          }),
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? 'Failed to generate link.'); return; }
        // Save optional contact fields + low-cost flag via update endpoint.
        if (json.client_id) {
          const extras: Record<string, unknown> = {};
          if (isLowCost) extras.is_low_cost = true;
          if (phone.trim()) extras.phone = phone.trim();
          if (dob.trim()) extras.date_of_birth = dob.trim();
          if (emergencyName.trim()) extras.emergency_contact_name = emergencyName.trim();
          if (emergencyPhone.trim()) extras.emergency_contact_phone = emergencyPhone.trim();
          if (gpName.trim()) extras.gp_name = gpName.trim();
          if (gpPhone.trim()) extras.gp_phone = gpPhone.trim();
          if (Object.keys(extras).length > 0) {
            await adminFetch('/api/admin/clients/update', {
              method: 'POST',
              body: JSON.stringify({ client_id: json.client_id, ...extras }),
            });
          }
        }
        setGenerated({
          url: json.url,
          paymentLinkUrl: json.payment_link_url ?? '',
          clientEmail,
        });
      } else {
        // Quick add — no token, no Stripe, no welcome email.
        const res = await adminFetch('/api/admin/clients/quick-add', {
          method: 'POST',
          body: JSON.stringify({
            client_name: clientName,
            client_email: clientEmail || undefined,
            session_fee: Number(sessionFee),
            is_low_cost: isLowCost,
            first_session_date: sessionDate || undefined,
            first_session_format: sessionFormat,
            phone: phone.trim() || undefined,
            date_of_birth: dob.trim() || undefined,
            emergency_contact_name: emergencyName.trim() || undefined,
            emergency_contact_phone: emergencyPhone.trim() || undefined,
            gp_name: gpName.trim() || undefined,
            gp_phone: gpPhone.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) { setError(json.error ?? 'Failed to add client.'); return; }
        setQuickAddDone(true);
      }
      setClientName(''); setClientEmail(''); setSessionDate(''); setSessionFee(''); setSessionFormat('in_person');
      setIsLowCost(false);
      setPhone(''); setDob(''); setEmergencyName(''); setEmergencyPhone(''); setGpName(''); setGpPhone('');
      onSuccess?.();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const form = (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mode toggle */}
      <div style={{
        background: 'var(--cream)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}>
        <input
          id="send-intake"
          type="checkbox"
          checked={sendIntake}
          onChange={e => setSendIntake(e.target.checked)}
          style={{ accentColor: 'var(--terracotta)', marginTop: 3 }}
        />
        <div style={{ flex: 1 }}>
          <label htmlFor="send-intake" style={{
            display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--forest-deep)',
            cursor: 'pointer',
          }}>
            Send intake link &amp; welcome email
          </label>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-muted)' }}>
            {sendIntake
              ? 'New client gets an intake form, Stripe payment link, and welcome email.'
              : 'Quick add — just create the record. No intake link, Stripe link, or email sent. Useful for clients already onboarded outside this dashboard.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label className="admin-label">Client name *</label>
          <input type="text" required placeholder="e.g. Jane Smith"
            value={clientName} onChange={e => setClientName(e.target.value)} className="admin-input" />
        </div>
        <div>
          <label className="admin-label">
            Client email{sendIntake ? ' *' : <span style={{ color: 'var(--ink-muted)' }}> (optional)</span>}
          </label>
          <input type="email" required={sendIntake} placeholder="jane@example.com"
            value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="admin-input" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <label className="admin-label">
            Session date &amp; time {sendIntake ? '*' : <span style={{ color: 'var(--ink-muted)' }}>(optional)</span>}
          </label>
          <input
            type="datetime-local"
            required={sendIntake}
            value={sessionDate}
            onChange={e => setSessionDate(e.target.value)}
            className="admin-input"
          />
        </div>
        <div>
          <label className="admin-label">Session fee (€) *</label>
          <input type="number" required placeholder="e.g. 80" min="1" step="1"
            value={sessionFee} onChange={e => setSessionFee(e.target.value)} className="admin-input" />
        </div>
      </div>
      <div>
        <label className="admin-label">Session format *</label>
        <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
          {(['in_person', 'online'] as const).map(v => (
            <label key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              fontSize: 14, color: 'var(--forest-deep)',
            }}>
              <input
                type="radio"
                name="sessionFormat"
                value={v}
                checked={sessionFormat === v}
                onChange={() => setSessionFormat(v)}
                style={{ accentColor: 'var(--terracotta)' }}
              />
              {v === 'in_person' ? 'In Person' : 'Online'}
            </label>
          ))}
        </div>
      </div>

      <label style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        fontSize: 13, color: 'var(--forest-deep)',
      }}>
        <input
          type="checkbox"
          checked={isLowCost}
          onChange={e => setIsLowCost(e.target.checked)}
          style={{ accentColor: 'var(--terracotta)' }}
        />
        Mark as low-cost client
        <span style={{ fontSize: 12, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
          (kept separate in revenue stats)
        </span>
      </label>

      {/* Optional contact / personal fields */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="admin-eyebrow" style={{ margin: 0 }}>Personal details <span style={{ fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, color: 'var(--ink-muted)', fontSize: 11 }}>— all optional</span></p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="admin-label">Date of birth</label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="admin-input" />
          </div>
          <div>
            <label className="admin-label">Phone number</label>
            <input type="tel" placeholder="e.g. 085 123 4567" value={phone} onChange={e => setPhone(e.target.value)} className="admin-input" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="admin-label">Emergency contact name</label>
            <input type="text" placeholder="e.g. Mary Smith" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} className="admin-input" />
          </div>
          <div>
            <label className="admin-label">Emergency contact phone</label>
            <input type="tel" placeholder="e.g. 086 987 6543" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} className="admin-input" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label className="admin-label">GP name</label>
            <input type="text" placeholder="e.g. Dr. O'Brien" value={gpName} onChange={e => setGpName(e.target.value)} className="admin-input" />
          </div>
          <div>
            <label className="admin-label">GP phone</label>
            <input type="tel" placeholder="e.g. 01 234 5678" value={gpPhone} onChange={e => setGpPhone(e.target.value)} className="admin-input" />
          </div>
        </div>
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta)' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={busy || !clientName.trim() || (sendIntake && !clientEmail.trim()) || (sendIntake && !sessionDate) || !sessionFee}
        className="admin-btn-primary"
        style={{ alignSelf: 'flex-start' }}
      >
        {busy
          ? (sendIntake ? 'Generating PDFs & sending email…' : 'Adding client…')
          : (sendIntake ? 'Generate & Send Welcome Email' : 'Add client')}
      </button>
      {busy && sendIntake && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-muted)', fontStyle: 'italic' }}>
          This can take up to ~10 s the first time; subsequent sends are faster.
        </p>
      )}

      {quickAddDone && (
        <p style={{
          margin: 0, fontSize: 13, color: 'var(--sage)',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>
          <Check size={14} strokeWidth={2.4} /> Client added.
        </p>
      )}

      {generated && (
        <div style={{
          marginTop: 8, padding: 18,
          background: 'rgba(79,138,104,0.10)',
          border: '1px solid rgba(79,138,104,0.35)',
          borderRadius: 12,
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Check size={16} strokeWidth={2.4} color="var(--sage)" />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sage)' }}>
              Link generated · welcome email sent to {generated.clientEmail}
            </span>
          </div>

          <LinkRow
            label="Intake form link"
            value={generated.url}
            copied={copiedKey === 'intake'}
            onCopy={() => copy(generated.url, 'intake')}
          />
          {generated.paymentLinkUrl && (
            <LinkRow
              label="Stripe payment link"
              value={generated.paymentLinkUrl}
              copied={copiedKey === 'pay'}
              onCopy={() => copy(generated.paymentLinkUrl, 'pay')}
            />
          )}
        </div>
      )}
    </form>
  );

  if (!asModal) {
    return (
      <div className="admin-card" style={{ padding: 28, maxWidth: 720 }}>
        {form}
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(42, 77, 60, 0.32)',
        zIndex: 90,
        animation: 'admin-fade-in 150ms ease',
      }} />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'white',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(42, 77, 60, 0.18)',
        zIndex: 100,
        width: 'min(640px, 92vw)',
        maxHeight: '92vh',
        overflowY: 'auto',
        animation: 'admin-pop-in 180ms ease',
      }}>
        <div style={{
          padding: '20px 26px',
          background: 'var(--forest-deep)',
          color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderRadius: '18px 18px 0 0',
        }}>
          <div>
            <p style={{
              margin: 0,
              fontSize: 10, fontWeight: 500,
              letterSpacing: '4px', textTransform: 'uppercase',
              color: 'var(--terracotta-soft)',
            }}>Onboarding</p>
            <h2 style={{
              margin: '4px 0 0',
              fontFamily: 'var(--font-montserrat), Avenir, sans-serif',
              fontWeight: 300, fontSize: 22, color: 'white', letterSpacing: '0.5px',
            }}>New client</h2>
          </div>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 6 }}>
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>
        <div style={{ padding: 28 }}>{form}</div>
      </div>
    </>
  );
}

function LinkRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 10, fontWeight: 500,
        letterSpacing: '2px', textTransform: 'uppercase',
        color: 'var(--ink-muted)',
        marginBottom: 4,
      }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <code style={{
          flex: 1,
          fontFamily: 'SF Mono, Menlo, monospace',
          fontSize: 12,
          color: 'var(--ink)',
          background: 'var(--cream)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '7px 10px',
          wordBreak: 'break-all',
        }}>{value}</code>
        <button onClick={onCopy} className={copied ? 'admin-btn-primary' : 'admin-btn-secondary'} style={{ padding: '8px 12px' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
