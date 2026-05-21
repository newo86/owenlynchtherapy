'use client';

import { useEffect, useState } from 'react';
import { colors, fonts, input as inputStyle, btnPrimary } from './theme';
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
    return <div style={{ minHeight: '100vh', background: colors.linen }} />;
  }

  if (!authed) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.linen,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          background: colors.white,
          borderRadius: 8,
          borderTop: `3px solid ${colors.gold}`,
          boxShadow: '0 8px 32px rgba(42,77,60,0.10)',
          padding: '36px 36px 32px',
          width: '100%',
          maxWidth: 420,
        }}>
          <div style={{
            fontFamily: fonts.sans, fontSize: 10, fontWeight: 500,
            letterSpacing: '3px', textTransform: 'uppercase',
            color: colors.terracotta, marginBottom: 10,
          }}>
            Owen Lynch · Admin
          </div>
          <h1 style={{
            margin: '0 0 8px',
            fontFamily: fonts.display, fontWeight: 300, fontSize: 26, color: colors.forest,
            letterSpacing: '-0.01em',
          }}>
            Sign in
          </h1>
          <p style={{ margin: '0 0 22px', fontFamily: fonts.sans, fontSize: 13, color: colors.textMuted }}>
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
              style={inputStyle}
            />
            {error && (
              <p style={{ margin: '10px 0 0', fontFamily: fonts.sans, fontSize: 13, color: colors.terracottaDark }}>{error}</p>
            )}
            <button type="submit" style={{ ...btnPrimary, marginTop: 18, width: '100%', justifyContent: 'center' }}>
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
