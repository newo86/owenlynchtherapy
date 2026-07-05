'use client';

import { useEffect, useState } from 'react';
import { login, logout, checkSession } from './api';
import { PRACTICE } from '@/practice.config';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Ask the server whether this browser already holds a valid session cookie.
    checkSession().then(ok => { if (!cancelled) setAuthed(ok); });
    function onUnauth() {
      void logout();
      setAuthed(false);
      setError('Session expired — please sign in again.');
    }
    window.addEventListener('admin-unauthorized', onUnauth);
    return () => { cancelled = true; window.removeEventListener('admin-unauthorized', onUnauth); };
  }, []);

  if (authed === null) {
    return <div className="admin-root" />;
  }

  if (!authed) {
    return (
      <div className="admin-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="admin-bg-shapes" aria-hidden>
          <div className="admin-blob admin-blob-1" />
          <div className="admin-blob admin-blob-2" />
          <div className="admin-blob admin-blob-3" />
          <div className="admin-blob admin-blob-4" />
          <div className="admin-blob admin-blob-5" />
        </div>
        <div className="admin-card" style={{
          position: 'relative',
          zIndex: 1,
          padding: '40px 36px 32px',
          width: '100%',
          maxWidth: 420,
          borderRadius: 22,
        }}>
          <p className="admin-eyebrow" style={{ marginBottom: 10 }}>{PRACTICE.practitionerName} · Admin</p>
          <h1 className="admin-h1" style={{ fontSize: 28, margin: '6px 0 4px' }}>{mfaStep ? 'Verify it’s you' : 'Sign in'}</h1>
          <p className="admin-subline">{mfaStep ? 'Enter the 6-digit code from your authenticator app.' : 'Enter the admin secret to continue.'}</p>
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (busy) return;
              if (!mfaStep) {
                if (!value.trim()) return;
                setBusy(true);
                setError('');
                const res = await login(value.trim());
                setBusy(false);
                if (res.ok) { setValue(''); setCode(''); setAuthed(true); }
                else if (res.mfaRequired) { setMfaStep(true); setError(''); }
                else { setError('Incorrect admin secret.'); }
              } else {
                if (!code.trim()) return;
                setBusy(true);
                setError('');
                const res = await login(value.trim(), code.trim());
                setBusy(false);
                if (res.ok) { setValue(''); setCode(''); setMfaStep(false); setAuthed(true); }
                else { setError(res.error ?? 'Invalid verification code.'); }
              }
            }}
            style={{ marginTop: 22 }}
          >
            {!mfaStep ? (
              <input
                type="password"
                placeholder="Admin secret"
                value={value}
                onChange={e => setValue(e.target.value)}
                autoFocus
                className="admin-input"
              />
            ) : (
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                className="admin-input"
                style={{ letterSpacing: '0.4em', textAlign: 'center', fontSize: 18 }}
              />
            )}
            {error && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--terracotta)' }}>{error}</p>
            )}
            <button type="submit" disabled={busy} className="admin-btn-primary" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}>
              {busy ? (mfaStep ? 'Verifying…' : 'Signing in…') : (mfaStep ? 'Verify' : 'Continue')}
            </button>
            {mfaStep && (
              <button
                type="button"
                onClick={() => { setMfaStep(false); setCode(''); setError(''); }}
                style={{ marginTop: 12, width: '100%', background: 'none', border: 'none', color: 'var(--ink-muted)', fontSize: 12, cursor: 'pointer' }}
              >
                ← Back
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
