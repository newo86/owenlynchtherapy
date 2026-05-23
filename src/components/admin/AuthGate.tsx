'use client';

import { useEffect, useState } from 'react';
import { setSecret, clearSecret, getSecret } from './api';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setAuthed(Boolean(getSecret()));
    function onUnauth() {
      clearSecret();
      setAuthed(false);
      setError('Session expired — please re-enter your admin secret.');
    }
    window.addEventListener('admin-unauthorized', onUnauth);
    return () => window.removeEventListener('admin-unauthorized', onUnauth);
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
            onSubmit={e => {
              e.preventDefault();
              if (!value.trim()) return;
              setSecret(value.trim());
              setAuthed(true);
              setError('');
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
            <button type="submit" className="admin-btn-primary" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}>
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
