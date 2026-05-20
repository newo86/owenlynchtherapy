'use client';

import { useState, useEffect } from 'react';

interface TokenRow {
  id: string;
  token: string;
  client_name: string | null;
  client_email: string | null;
  created_at: string;
  expires_at: string;
  is_used: boolean;
}

const STORAGE_KEY = 'intake_admin_auth';

export default function AdminIntakePage() {
  const [authed, setAuthed] = useState(false);
  const [secretInput, setSecretInput] = useState('');
  const [authError, setAuthError] = useState('');

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{ url: string; expires_at: string } | null>(null);
  const [genError, setGenError] = useState('');

  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokensError, setTokensError] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) setAuthed(true);
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!secretInput.trim()) return;
    sessionStorage.setItem(STORAGE_KEY, secretInput.trim());
    setAuthed(true);
    setAuthError('');
  }

  function getSecret() {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  }

  async function generateToken(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenerated(null);
    setGenError('');
    try {
      const res = await fetch('/api/intake/generate-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getSecret()}`,
        },
        body: JSON.stringify({ client_name: clientName, client_email: clientEmail }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY);
          setAuthed(false);
          setAuthError('Session expired — please re-enter your admin secret.');
          return;
        }
        setGenError(json.error ?? 'Failed to generate token.');
        return;
      }
      setGenerated({ url: json.url, expires_at: json.expires_at });
      setClientName('');
      setClientEmail('');
      loadTokens();
    } catch {
      setGenError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function loadTokens() {
    setLoadingTokens(true);
    setTokensError('');
    try {
      const res = await fetch('/api/intake/tokens', {
        headers: { Authorization: `Bearer ${getSecret()}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        setTokensError(json.error ?? 'Failed to load tokens.');
        return;
      }
      setTokens(json.tokens ?? []);
    } catch {
      setTokensError('Network error. Please try again.');
    } finally {
      setLoadingTokens(false);
    }
  }

  useEffect(() => {
    if (authed) loadTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function tokenStatus(row: TokenRow) {
    if (row.is_used) return { label: 'Submitted', color: '#4F8A68' };
    if (new Date(row.expires_at) < new Date()) return { label: 'Expired', color: '#999' };
    return { label: 'Pending', color: '#C85A1A' };
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 28, color: '#2A4D3C', marginBottom: 8 }}>
            Admin Access
          </h1>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
            Enter your admin secret to continue.
          </p>
          <form onSubmit={handleAuth}>
            <input
              type="password"
              placeholder="Admin secret"
              value={secretInput}
              onChange={e => setSecretInput(e.target.value)}
              autoFocus
              style={inputStyle}
            />
            {authError && <p style={{ color: '#C85A1A', fontSize: 13, marginTop: 8 }}>{authError}</p>}
            <button type="submit" style={{ ...btnStyle, marginTop: 16 }}>
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 300, fontSize: 30, color: '#2A4D3C', margin: 0 }}>
          Intake Links
        </h1>
        <button
          onClick={() => { sessionStorage.removeItem(STORAGE_KEY); setAuthed(false); }}
          style={{ fontSize: 13, color: '#999', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Sign out
        </button>
      </div>

      {/* Generate token */}
      <section style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', marginBottom: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: '#2A4D3C', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 20, marginTop: 0 }}>
          Generate new link
        </h2>
        <form onSubmit={generateToken} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Client name</label>
              <input
                type="text"
                placeholder="e.g. Jane Smith"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Client email (optional)</label>
              <input
                type="email"
                placeholder="e.g. jane@example.com"
                value={clientEmail}
                onChange={e => setClientEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          {genError && <p style={{ color: '#C85A1A', fontSize: 13, margin: 0 }}>{genError}</p>}
          <button type="submit" disabled={generating || !clientName.trim()} style={{ ...btnStyle, alignSelf: 'flex-start' }}>
            {generating ? 'Generating…' : 'Generate link'}
          </button>
        </form>

        {generated && (
          <div style={{ marginTop: 20, padding: '16px 18px', backgroundColor: '#F0F7F3', borderRadius: 8, borderLeft: '3px solid #4F8A68' }}>
            <p style={{ fontSize: 13, color: '#2A4D3C', fontWeight: 600, margin: '0 0 8px' }}>
              Link generated — valid until {formatDate(generated.expires_at)}
            </p>
            <p style={{ fontSize: 13, color: '#333', wordBreak: 'break-all', margin: '0 0 12px', fontFamily: 'monospace' }}>
              {generated.url}
            </p>
            <button
              onClick={() => navigator.clipboard.writeText(generated.url)}
              style={{ fontSize: 12, color: '#4F8A68', background: 'none', border: '1px solid #4F8A68', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </section>

      {/* Recent tokens */}
      <section style={{ background: '#fff', borderRadius: 12, padding: '28px 28px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#2A4D3C', letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}>
            Recent links
          </h2>
          <button
            onClick={loadTokens}
            disabled={loadingTokens}
            style={{ fontSize: 12, color: '#666', background: 'none', border: '1px solid #ddd', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
          >
            {loadingTokens ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {tokensError && <p style={{ color: '#C85A1A', fontSize: 13 }}>{tokensError}</p>}

        {tokens.length === 0 && !loadingTokens && (
          <p style={{ fontSize: 14, color: '#999' }}>No links generated yet.</p>
        )}

        {tokens.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                {['Client', 'Created', 'Expires', 'Status'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 0', color: '#999', fontWeight: 500, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tokens.map(row => {
                const status = tokenStatus(row);
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid #f3f3f3' }}>
                    <td style={{ padding: '10px 0', color: '#333' }}>
                      <div>{row.client_name ?? '—'}</div>
                      {row.client_email && <div style={{ fontSize: 12, color: '#999' }}>{row.client_email}</div>}
                    </td>
                    <td style={{ padding: '10px 12px 10px 0', color: '#666', whiteSpace: 'nowrap' }}>
                      {formatDate(row.created_at)}
                    </td>
                    <td style={{ padding: '10px 12px 10px 0', color: '#666', whiteSpace: 'nowrap' }}>
                      {formatDate(row.expires_at)}
                    </td>
                    <td style={{ padding: '10px 0' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        color: status.color,
                        backgroundColor: `${status.color}18`,
                      }}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #E0D8CE',
  borderRadius: 8,
  fontSize: 14,
  color: '#333',
  backgroundColor: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '1.5px',
  color: '#2D5A42',
  marginBottom: 6,
};

const btnStyle: React.CSSProperties = {
  padding: '10px 22px',
  backgroundColor: '#C85A1A',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
};
