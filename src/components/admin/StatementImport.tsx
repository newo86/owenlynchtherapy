'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { adminFetch, displayFee, formatDateTime, dedupeSessions } from './api';
import type { ClientRow, SessionRow } from './types';

// Revolut statement reconciliation (Phase 4).
//
// Privacy-first: the CSV is parsed entirely IN THE BROWSER — the statement
// (which contains unrelated personal transactions) is never uploaded or
// stored. Only the matches the practitioner explicitly confirms result in
// mark-paid calls to the existing route, so every payment lands in the
// ledger exactly like a manually recorded one.

interface Props {
  clients: ClientRow[];
  onReload: () => void;
}

interface Txn {
  date: Date;
  description: string;
  amountCents: number;
}

interface Match {
  txn: Txn;
  session: SessionRow;
  client: ClientRow;
  confident: boolean;
}

// Minimal CSV parser that copes with quoted fields and commas-in-quotes.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some(f => f.trim() !== '')) rows.push(row);
  return rows;
}

const norm = (v: string) => v.toLowerCase().replace(/[^a-zà-ÿ ]/gi, ' ').replace(/\s+/g, ' ').trim();

function nameMatches(clientName: string, description: string): boolean {
  const tokens = norm(clientName).split(' ').filter(t => t.length > 1);
  const desc = ' ' + norm(description) + ' ';
  if (tokens.length === 0) return false;
  // Full match: every name token appears in the description.
  if (tokens.every(t => desc.includes(' ' + t + ' ') || desc.includes(' ' + t))) return true;
  // Bank-style "J Smith": first initial + surname.
  const surname = tokens[tokens.length - 1];
  const initial = tokens[0][0];
  return desc.includes(' ' + surname) && new RegExp(`(^| )${initial}[a-z]* `).test(desc);
}

export function StatementImport({ clients, onReload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [unmatched, setUnmatched] = useState<Txn[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [parseError, setParseError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function reset() {
    setMatches([]); setUnmatched([]); setSelected(new Set());
    setParseError(null); setResult(null);
  }

  async function handleFile(file: File) {
    reset();
    setOpen(true);
    if (!/\.csv$/i.test(file.name)) {
      setParseError('Please export the statement as CSV/Excel from the Revolut app (Account → Statement → Excel). PDF statements can\'t be read reliably.');
      return;
    }
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) { setParseError('That file looks empty.'); return; }

    // Find columns by header name (Revolut: Type, Product, Started Date,
    // Completed Date, Description, Amount, Fee, Currency, State, Balance).
    const header = rows[0].map(h => h.trim().toLowerCase());
    const col = (...names: string[]) => names.map(n => header.indexOf(n)).find(i => i !== undefined && i >= 0) ?? -1;
    const iDate = col('completed date', 'started date', 'date');
    const iDesc = col('description', 'reference', 'counterparty');
    const iAmount = col('amount');
    const iState = col('state');
    if (iDate < 0 || iDesc < 0 || iAmount < 0) {
      setParseError("Couldn't find the Date / Description / Amount columns — is this a Revolut CSV export?");
      return;
    }

    const txns: Txn[] = [];
    for (const r of rows.slice(1)) {
      const amount = Math.round(parseFloat(r[iAmount]) * 100);
      if (!isFinite(amount) || amount <= 0) continue; // incoming money only
      if (iState >= 0 && r[iState] && !/completed/i.test(r[iState])) continue;
      const date = new Date(r[iDate]);
      if (isNaN(date.getTime())) continue;
      txns.push({ date, description: r[iDesc] ?? '', amountCents: amount });
    }
    if (txns.length === 0) {
      setParseError('No completed incoming payments found in that statement.');
      return;
    }

    // Candidate sessions: unpaid, not cancelled, not Stripe-paid.
    const candidates: Array<{ s: SessionRow; c: ClientRow }> = [];
    for (const c of clients) {
      for (const s of dedupeSessions(c.sessions)) {
        if (s.status === 'cancelled') continue;
        if (s.payment_status === 'paid' || s.payment_status === 'refunded') continue;
        candidates.push({ s, c });
      }
    }

    const found: Match[] = [];
    const usedSessions = new Set<string>();
    const leftovers: Txn[] = [];
    for (const txn of txns) {
      // Prefer: name + exact amount + session within 21 days before payment.
      const scored = candidates
        .filter(({ s }) => !usedSessions.has(s.id) && (s.fee ?? 0) === txn.amountCents)
        .map(({ s, c }) => {
          const days = (txn.date.getTime() - new Date(s.session_date).getTime()) / 86_400_000;
          const dateOk = days >= -2 && days <= 21;
          const nameOk = nameMatches(c.full_name, txn.description);
          return { s, c, score: (nameOk ? 2 : 0) + (dateOk ? 1 : 0), nameOk, dateOk };
        })
        .filter(x => x.score >= 1)
        .sort((a, b) => b.score - a.score
          || Math.abs(txn.date.getTime() - new Date(a.s.session_date).getTime())
           - Math.abs(txn.date.getTime() - new Date(b.s.session_date).getTime()));
      const best = scored[0];
      if (best) {
        usedSessions.add(best.s.id);
        found.push({ txn, session: best.s, client: best.c, confident: best.nameOk && best.dateOk });
      } else {
        leftovers.push(txn);
      }
    }

    setMatches(found);
    setUnmatched(leftovers);
    // Pre-tick only the confident (name+amount+date) matches.
    setSelected(new Set(found.filter(m => m.confident).map(m => m.session.id)));
  }

  async function applySelected() {
    setApplying(true);
    let ok = 0, failed = 0;
    for (const m of matches) {
      if (!selected.has(m.session.id)) continue;
      try {
        const res = await adminFetch('/api/admin/mark-paid', {
          method: 'POST', body: JSON.stringify({ session_id: m.session.id }),
        });
        if (res.ok) ok++; else failed++;
      } catch { failed++; }
    }
    setApplying(false);
    setResult(`${ok} session${ok === 1 ? '' : 's'} marked paid${failed > 0 ? ` · ${failed} failed — try those again` : ''}.`);
    onReload();
  }

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <p className="admin-eyebrow">Reconcile payments</p>
          <h2 className="admin-h2">Import a Revolut statement</h2>
        </div>
        <button
          className="admin-btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={13} strokeWidth={1.8} /> Choose CSV
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
        />
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', margin: 0, maxWidth: 640 }}>
        Export a statement from the Revolut app (Account → Statement → <strong>Excel/CSV</strong>),
        drop it here, and incoming payments are matched to unpaid sessions by name, amount and
        date. Nothing is marked paid until you confirm — and the file itself never leaves your
        browser.
      </p>

      {open && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 16 }}>
          {parseError && (
            <p style={{ fontSize: 13, color: 'var(--terracotta)', margin: 0 }}>{parseError}</p>
          )}

          {result && (
            <p style={{ fontSize: 13, color: 'var(--sage)', margin: 0, fontWeight: 500 }}>{result}</p>
          )}

          {!parseError && !result && matches.length === 0 && unmatched.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--ink-muted)', margin: 0 }}>Reading statement…</p>
          )}

          {!result && matches.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 10px' }}>
                {matches.length} payment{matches.length === 1 ? '' : 's'} matched — confident
                matches are pre-ticked; review the rest before confirming.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matches.map(m => (
                  <label
                    key={m.session.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: 'var(--cream)', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${m.confident ? 'rgba(79,138,104,0.3)' : 'rgba(212,168,67,0.45)'}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(m.session.id)}
                      onChange={e => setSelected(prev => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(m.session.id); else next.delete(m.session.id);
                        return next;
                      })}
                    />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
                      <span style={{ fontWeight: 600, color: 'var(--forest-deep)' }}>
                        {displayFee(m.txn.amountCents)}
                      </span>
                      {' '}
                      <span className="pii" style={{ color: 'var(--ink-muted)' }}>
                        “{m.txn.description.slice(0, 48)}”
                      </span>
                      {' '}
                      <span style={{ color: 'var(--ink-muted)' }}>
                        on {m.txn.date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                      </span>
                      <span style={{ margin: '0 6px', color: 'var(--ink-muted)' }}>→</span>
                      <span className="pii" style={{ fontWeight: 500, color: 'var(--forest-deep)' }}>
                        {m.client.full_name}
                      </span>
                      <span style={{ color: 'var(--ink-muted)' }}>
                        {' '}· session {formatDateTime(m.session.session_date)}
                      </span>
                    </div>
                    {!m.confident && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#7a611f', whiteSpace: 'nowrap' }}>
                        CHECK ME
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
                <button
                  className="admin-btn-primary"
                  disabled={applying || selected.size === 0}
                  onClick={() => void applySelected()}
                >
                  {applying ? 'Recording…' : `Mark ${selected.size} session${selected.size === 1 ? '' : 's'} paid`}
                </button>
                <button className="admin-btn-secondary" onClick={() => { setOpen(false); reset(); }}>
                  <X size={12} /> Discard
                </button>
              </div>
            </>
          )}

          {!result && unmatched.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '0 0 6px' }}>
                {unmatched.length} incoming payment{unmatched.length === 1 ? '' : 's'} didn&apos;t
                match any unpaid session (left for you):
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--ink-muted)' }}>
                {unmatched.slice(0, 8).map((t, i) => (
                  <li key={i} className="pii">
                    {displayFee(t.amountCents)} — “{t.description.slice(0, 48)}” ·{' '}
                    {t.date.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}
                  </li>
                ))}
                {unmatched.length > 8 && <li>…and {unmatched.length - 8} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
