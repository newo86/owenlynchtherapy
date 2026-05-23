'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Download } from 'lucide-react';
import { Avatar } from './Avatar';
import { adminFetch, formatDateTime } from './api';
import { FORMAT_LABELS } from './types';
import type { SubmissionRow, TokenRow } from './types';

interface Props {
  submissions: SubmissionRow[];
  tokens: TokenRow[];
  initialTab?: TabId;
}

type TabId = 'submitted' | 'pending';

function tokenKind(t: TokenRow): 'submitted' | 'pending' | 'expired' {
  if (t.is_used) return 'submitted';
  if (new Date(t.expires_at) < new Date()) return 'expired';
  return 'pending';
}

const TOKEN_TAG = {
  submitted: { cls: 'admin-tag-active', label: 'Submitted' },
  pending:   { cls: 'admin-tag-new',    label: 'Pending' },
  expired:   { cls: 'admin-tag-pause',  label: 'Expired' },
};

export function FormsTable({ submissions, tokens, initialTab }: Props) {
  const [tab, setTab] = useState<TabId>(initialTab ?? 'submitted');

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div className="admin-segmented">
          {([
            { id: 'submitted', label: `Submitted (${submissions.length})` },
            { id: 'pending', label: `Sent links (${tokens.length})` },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`admin-segmented-btn${tab === t.id ? ' is-active' : ''}`}
            >{t.label}</button>
          ))}
        </div>

        <div className="admin-input-icon-wrap" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <Search size={16} strokeWidth={1.8} aria-hidden />
          <input
            type="text"
            placeholder="Search by name or email"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="admin-input"
          />
        </div>
      </div>

      {tab === 'submitted' && (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Email</th>
              <th>Format</th>
              <th>Submitted</th>
              <th style={{ textAlign: 'right' as const }}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center' as const, padding: 28, color: 'var(--ink-muted)' }}>No submitted forms.</td></tr>
            )}
            {filteredSubs.map(sub => (
              <tr key={sub.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={sub.full_name} size={32} />
                    <div style={{ fontWeight: 500, color: 'var(--forest-deep)' }}>{sub.full_name}</div>
                  </div>
                </td>
                <td>{sub.email ?? '—'}</td>
                <td>{FORMAT_LABELS[sub.session_format] ?? sub.session_format}</td>
                <td style={{ whiteSpace: 'nowrap' as const }}>{formatDateTime(sub.submitted_at)}</td>
                <td style={{ textAlign: 'right' as const }}>
                  <button onClick={() => downloadPDF(sub)} disabled={downloadingId === sub.id} className="admin-btn-secondary">
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
        <table className="admin-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredTokens.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center' as const, padding: 28, color: 'var(--ink-muted)' }}>No intake links generated yet.</td></tr>
            )}
            {filteredTokens.map(row => {
              const k = tokenKind(row);
              const t = TOKEN_TAG[k];
              return (
                <tr key={row.id}>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--forest-deep)' }}>{row.client_name ?? '—'}</div>
                    {row.client_email && (
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{row.client_email}</div>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' as const }}>{formatDateTime(row.created_at)}</td>
                  <td style={{ whiteSpace: 'nowrap' as const }}>{formatDateTime(row.expires_at)}</td>
                  <td><span className={`admin-tag ${t.cls}`}>{t.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
