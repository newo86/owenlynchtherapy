'use client';

import { useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { colors, fonts, shadows, tableHeader, input as inputStyle } from './theme';
import { Avatar } from './Avatar';
import { adminFetch, formatDateTime } from './api';
import { FORMAT_LABELS } from './types';
import type { SubmissionRow, TokenRow } from './types';

interface Props {
  submissions: SubmissionRow[];
  tokens: TokenRow[];
}

type TabId = 'submitted' | 'pending';

export function FormsTable({ submissions, tokens }: Props) {
  const [tab, setTab] = useState<TabId>('submitted');
  const [q, setQ] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredSubs = useMemo(() => {
    const lower = q.trim().toLowerCase();
    if (!lower) return submissions;
    return submissions.filter(s =>
      s.full_name.toLowerCase().includes(lower)
      || (s.email ?? '').toLowerCase().includes(lower)
    );
  }, [submissions, q]);

  const filteredTokens = useMemo(() => {
    const lower = q.trim().toLowerCase();
    if (!lower) return tokens;
    return tokens.filter(t =>
      (t.client_name ?? '').toLowerCase().includes(lower)
      || (t.client_email ?? '').toLowerCase().includes(lower)
    );
  }, [tokens, q]);

  async function downloadPDF(sub: SubmissionRow) {
    setDownloadingId(sub.id);
    try {
      const res = await adminFetch(`/api/intake/download-pdf?submission_id=${sub.id}`);
      if (!res.ok) { alert(`Failed to generate PDF (${res.status}).`); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const name = sub.full_name.replace(/\s+/g, '-').toLowerCase();
      const date = new Date(sub.submitted_at).toISOString().split('T')[0];
      a.href = url;
      a.download = `intake-${name}-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingId(null);
    }
  }

  function tokenStatus(t: TokenRow) {
    if (t.is_used) return { label: 'Submitted', color: colors.sageDark };
    if (new Date(t.expires_at) < new Date()) return { label: 'Expired', color: colors.textFaint };
    return { label: 'Pending', color: colors.terracotta };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, padding: 4, background: colors.white, borderRadius: 6, border: `1px solid ${colors.border}` }}>
          {([
            { id: 'submitted', label: `Submitted (${submissions.length})` },
            { id: 'pending', label: `Sent links (${tokens.length})` },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '6px 14px',
                background: tab === t.id ? colors.forest : 'transparent',
                color: tab === t.id ? colors.white : colors.forest,
                border: 'none',
                borderRadius: 4,
                fontFamily: fonts.sans,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >{t.label}</button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={16} strokeWidth={1.8} color={colors.textMuted}
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} aria-hidden />
          <input
            type="text"
            placeholder="Search by name or email"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 38 }}
          />
        </div>
      </div>

      <div style={{
        background: colors.white,
        borderRadius: 8,
        borderTop: `3px solid ${colors.gold}`,
        boxShadow: shadows.card,
        overflow: 'hidden',
      }}>
        {tab === 'submitted' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: `${colors.linen}80` }}>
              <tr>
                <th style={tableHeader}>Client</th>
                <th style={tableHeader}>Email</th>
                <th style={tableHeader}>Format</th>
                <th style={tableHeader}>Submitted</th>
                <th style={{ ...tableHeader, textAlign: 'right' as const }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubs.length === 0 && (
                <tr><td colSpan={5} style={emptyTd}>No submitted forms.</td></tr>
              )}
              {filteredSubs.map(sub => (
                <tr key={sub.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={sub.full_name} size={32} />
                      <div style={{ fontWeight: 500, color: colors.forest, fontSize: 13 }}>{sub.full_name}</div>
                    </div>
                  </td>
                  <td style={td}>{sub.email ?? '—'}</td>
                  <td style={td}>{FORMAT_LABELS[sub.session_format] ?? sub.session_format}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' as const }}>{formatDateTime(sub.submitted_at)}</td>
                  <td style={{ ...td, textAlign: 'right' as const }}>
                    <button
                      onClick={() => downloadPDF(sub)}
                      disabled={downloadingId === sub.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'transparent',
                        border: `1px solid ${colors.border}`,
                        borderRadius: 4,
                        padding: '5px 10px',
                        fontFamily: fonts.sans,
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        color: colors.forest,
                        cursor: downloadingId === sub.id ? 'default' : 'pointer',
                      }}
                    >
                      <Download size={12} strokeWidth={1.8} />
                      {downloadingId === sub.id ? '…' : 'PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'pending' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: `${colors.linen}80` }}>
              <tr>
                <th style={tableHeader}>Client</th>
                <th style={tableHeader}>Created</th>
                <th style={tableHeader}>Expires</th>
                <th style={tableHeader}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTokens.length === 0 && (
                <tr><td colSpan={4} style={emptyTd}>No intake links generated yet.</td></tr>
              )}
              {filteredTokens.map(row => {
                const s = tokenStatus(row);
                return (
                  <tr key={row.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={td}>
                      <div style={{ fontWeight: 500, color: colors.forest, fontSize: 13 }}>{row.client_name ?? '—'}</div>
                      {row.client_email && (
                        <div style={{ fontSize: 11, color: colors.textMuted }}>{row.client_email}</div>
                      )}
                    </td>
                    <td style={{ ...td, whiteSpace: 'nowrap' as const }}>{formatDateTime(row.created_at)}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' as const }}>{formatDateTime(row.expires_at)}</td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        borderRadius: 999,
                        background: `${s.color}18`,
                        color: s.color,
                        fontFamily: fonts.sans,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                      }}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const td = {
  padding: '14px 16px',
  fontFamily: fonts.sans,
  fontSize: 13,
  color: colors.text,
  verticalAlign: 'middle' as const,
};

const emptyTd = {
  padding: '24px 16px',
  textAlign: 'center' as const,
  color: colors.textMuted,
  fontSize: 14,
  fontFamily: fonts.sans,
};
