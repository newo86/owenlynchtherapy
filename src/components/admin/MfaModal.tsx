'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { X, Check, ShieldCheck, Copy } from 'lucide-react';
import { adminFetch } from './api';

interface Props {
  onClose: () => void;
}

type View = 'loading' | 'status' | 'setup';

export function MfaModal({ onClose }: Props) {
  const [view, setView] = useState<View>('loading');
  const [enabled, setEnabled] = useState(false);
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await adminFetch('/api/admin/mfa');
      const json = await res.json().catch(() => ({ enabled: false }));
      if (cancelled) return;
      setEnabled(Boolean(json.enabled));
      setView('status');
    })();
    return () => { cancelled = true; };
  }, []);

  async function beginSetup() {
    setBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/mfa/setup', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Could not start setup.'); return; }
      setQr(json.qrDataUrl);
      setSecret(json.secret);
      setCode('');
      setView('setup');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    if (code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Could not enable.'); return; }
      setEnabled(true);
      setQr(''); setSecret(''); setCode('');
      setView('status');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (code.length !== 6) { setError('Enter a current code to turn off two-factor.'); return; }
    setBusy(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Could not disable.'); return; }
      setEnabled(false);
      setCode('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const codeInput = (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="123456"
      value={code}
      onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
      className="admin-input"
      style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: 18 }}
    />
  );

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(42,77,60,0.32)', zIndex: 110, animation: 'admin-fade-in 150ms ease' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'white', borderRadius: 18, boxShadow: '0 24px 64px rgba(42,77,60,0.18)',
        zIndex: 120, width: 'min(440px, 92vw)', maxHeight: '92vh', overflowY: 'auto',
        animation: 'admin-pop-in 180ms ease',
      }}>
        <div style={{
          padding: '20px 26px', background: 'var(--forest-deep)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '18px 18px 0 0',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 500, letterSpacing: '4px', textTransform: 'uppercase', color: 'var(--terracotta-soft)' }}>Security</p>
            <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--font-montserrat), Avenir, sans-serif', fontWeight: 300, fontSize: 22, color: 'white' }}>Two-factor authentication</h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 6 }}>
            <X size={20} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {view === 'loading' && (
            <p style={{ fontSize: 14, color: 'var(--ink-muted)', margin: 0 }}>Loading…</p>
          )}

          {view === 'status' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldCheck size={22} color={enabled ? 'var(--sage)' : 'var(--ink-muted)'} />
                <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--forest-deep)' }}>
                  {enabled ? 'Two-factor is ON' : 'Two-factor is off'}
                </span>
              </div>
              {enabled ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0 }}>
                    To turn it off, enter a current 6-digit code from your authenticator.
                  </p>
                  {codeInput}
                  {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta)' }}>{error}</p>}
                  <button onClick={disable} disabled={busy} className="admin-btn-secondary" style={{ alignSelf: 'flex-start' }}>
                    {busy ? 'Turning off…' : 'Turn off two-factor'}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0, lineHeight: 1.6 }}>
                    Add a second step to admin sign-in using an authenticator app
                    (Google Authenticator, Authy, 1Password, etc.).
                  </p>
                  {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta)' }}>{error}</p>}
                  <button onClick={beginSetup} disabled={busy} className="admin-btn-primary" style={{ alignSelf: 'flex-start' }}>
                    {busy ? 'Preparing…' : 'Set up two-factor'}
                  </button>
                </>
              )}
            </>
          )}

          {view === 'setup' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--forest-deep)', margin: 0, lineHeight: 1.6 }}>
                <strong>1.</strong> Scan this with your authenticator app:
              </p>
              {qr && (
                <div style={{ alignSelf: 'center', padding: 10, background: 'white', border: '1px solid var(--line)', borderRadius: 12 }}>
                  <Image src={qr} alt="Two-factor QR code" width={200} height={200} unoptimized />
                </div>
              )}
              <details style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                <summary style={{ cursor: 'pointer' }}>Can’t scan? Enter the key manually</summary>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <code style={{ wordBreak: 'break-all', fontSize: 12, background: 'var(--cream)', padding: '6px 8px', borderRadius: 6 }}>{secret}</code>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard?.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    className="admin-btn-secondary"
                    style={{ flexShrink: 0, padding: '6px 10px' }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
              </details>
              <p style={{ fontSize: 13, color: 'var(--forest-deep)', margin: '4px 0 0', lineHeight: 1.6 }}>
                <strong>2.</strong> Enter the 6-digit code it shows:
              </p>
              {codeInput}
              {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--terracotta)' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={confirmEnable} disabled={busy || code.length !== 6} className="admin-btn-primary">
                  {busy ? 'Verifying…' : 'Enable'}
                </button>
                <button onClick={() => { setView('status'); setError(''); setCode(''); }} className="admin-btn-secondary">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
