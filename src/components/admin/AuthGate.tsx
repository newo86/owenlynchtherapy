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
    return <div className="admin-root"><div className="admin-bg" /></div>;
  }

  if (!authed) {
    return (
      <div className="admin-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div className="admin-bg">
          <div className="admin-bg-circle admin-bg-circle-1" />
          <div className="admin-bg-circle admin-bg-circle-2" />
          <div className="admin-bg-circle admin-bg-circle-3" />
          <div className="admin-bg-grain" />
        </div>
        <div className="admin-glass" style={{
          position: 'relative',
          zIndex: 1,
          padding: '38px 38px 32px',
          width: '100%',
          maxWidth: 420,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 500,
            letterSpacing: '3px', textTransform: 'uppercase',
            color: '#C85A1A', marginBottom: 10,
          }}>
            Owen Lynch · Admin
          </div>
          <h1 style={{
            margin: '0 0 8px',
            fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
            fontWeight: 300, fontSize: 26, color: 'white',
            letterSpacing: '-0.4px',
          }}>Sign in</h1>
          <p style={{ margin: '0 0 22px', fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
            Enter the admin secret to continue.
          </p>
          <form onSubmit={e => {
            e.preventDefault();
            if (!value.trim()) return;
            setSecret(value.trim());
            setAuthed(true);
            setError('');
          }}>
            <input
              type="password"
              placeholder="Admin secret"
              value={value}
              onChange={e => setValue(e.target.value)}
              autoFocus
              className="admin-input"
            />
            {error && (
              <p style={{ margin: '10px 0 0', fontSize: 13, color: '#F4956A' }}>{error}</p>
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
