'use client';

import { useEffect, useState } from 'react';
import { login, logout, checkSession } from './api';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [value, setValue] = useState('');
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
          <p className="admin-eyebrow" style={{ marginBottom: 10 }}>Owen Lynch · Admin</p>
          <h1 className="admin-h1" style={{ fontSize: 28, margin: '6px 0 4px' }}>Sign in</h1>
          <p className="admin-subline">Enter the admin secret to continue.</p>
          <form
            onSubmit={async e => {
              e.preventDefault();
              if (!value.trim() || busy) return;
              setBusy(true);
              setError('');
              const ok = await login(value.trim());
              setBusy(false);
              if (ok) {
                setValue('');
                setAuthed(true);
              } else {
                setError('Incorrect admin secret.');
              }
            }}
            style={{ marginTop: 22 }}
          >
            <input
              type="password"
              placeholder="Admin secret"
              value={value}
              onChange={e => setValue(e.target.value)}
              autoFocus
              className="admin-input"
            />
            {error && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--terracotta)' }}>{error}</p>
            )}
            <button type="submit" disabled={busy} className="admin-btn-primary" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}>
              {busy ? 'Signing in…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
