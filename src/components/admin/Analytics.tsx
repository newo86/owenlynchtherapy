'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Mail, Link2, Check } from 'lucide-react';
import { adminFetch, formatDate } from './api';
import type { ClientRow } from './types';
import { PRACTICE } from '@/practice.config';
import {
  CNIP_SCALES, CNIP_ADDITIONAL, CNIP_ADDITIONAL_SHORT, scoreCnip, summariseCnip,
  type CnipAnswers, type CnipScaleScore,
} from '@/lib/questionnaires/cnip';
import {
  VALUES, LIFE_AREAS, valueName, valueDesc, areaGaps, type ValuesAnswers,
} from '@/lib/questionnaires/values';

type Kind = 'values' | 'cnip';
/** The practitioner's own test links: no client record behind them. */
const TEST_ID = 'test';
const KIND_LABEL: Record<Kind, string> = { values: 'Finding your values', cnip: 'Therapy preferences (C–NIP–2)' };

interface ResponseRow {
  id: string;
  client_id: string;
  kind: Kind;
  answers: unknown;
  scores: unknown;
  submitted_at: string;
}
interface PendingRow {
  id: string;
  client_id: string;
  kind: Kind;
  created_at: string;
  expires_at: string;
  emailed_at: string | null;
}

export function Analytics({ clients }: { clients: ClientRow[] }) {
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ok' | 'error' | 'missing'>('loading');
  const [tab, setTab] = useState<Kind>('cnip');

  const load = useCallback(async () => {
    try {
      const res = await adminFetch('/api/admin/questionnaires');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadState(json.migration_missing ? 'missing' : 'error'); return; }
      setResponses(json.responses ?? []);
      setPending(json.pending ?? []);
      setLoadState('ok');
    } catch { setLoadState('error'); }
  }, []);
  // Fetch on mount: state is only set after the request resolves.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const nameOf = useCallback(
    (id: string) => id === TEST_ID ? 'Test (you)' : clients.find(c => c.id === id)?.full_name ?? 'Former client',
    [clients],
  );
  const hasTests = responses.some(r => r.client_id === TEST_ID) || pending.some(p => p.client_id === TEST_ID);
  const [clearing, setClearing] = useState(false);
  async function clearTests() {
    if (!confirm('Delete all your test links and test results? Client results are not touched.')) return;
    setClearing(true);
    try {
      const res = await adminFetch('/api/admin/questionnaires', { method: 'DELETE' });
      if (!res.ok) alert('Could not clear the test results. Please try again.');
      await load();
    } finally { setClearing(false); }
  }

  return (
    <div className="admin-qa">
      <SendPanel clients={clients} onSent={load} />

      {hasTests && (
        <p className="admin-qa-testbar">
          You have test results from trying the forms yourself. They’re marked “Test (you)” and left out of the caseload figures.
          <button type="button" className="admin-link" disabled={clearing} onClick={() => void clearTests()}>
            {clearing ? 'Clearing…' : 'Clear test results'}
          </button>
        </p>
      )}

      {loadState === 'missing' && (
        <p className="admin-qa-note" role="alert">The questionnaires table isn’t in the database yet. Run supabase/migrations/questionnaires.sql (via /db-migrate) and reload.</p>
      )}
      {loadState === 'error' && (
        <p className="admin-qa-note" role="alert">Couldn’t load questionnaire results. <button className="admin-link" onClick={() => void load()}>Retry</button></p>
      )}

      {pending.length > 0 && (
        <section className="admin-card" aria-labelledby="qa-pending-h">
          <h2 id="qa-pending-h" className="admin-h2">Waiting to be completed</h2>
          <ul className="admin-qa-pending">
            {pending.map(p => (
              <li key={p.id}>
                <b className="pii">{nameOf(p.client_id)}</b>
                <span>{KIND_LABEL[p.kind]}</span>
                <span className="admin-qa-muted">
                  {p.emailed_at ? 'Emailed' : 'Link made'} {formatDate(p.created_at)} · open until {formatDate(p.expires_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="admin-qa-tabs" role="tablist" aria-label="Questionnaire">
        {(['cnip', 'values'] as Kind[]).map(k => (
          <button key={k} role="tab" aria-selected={tab === k} className={`admin-qa-tab${tab === k ? ' is-active' : ''}`} onClick={() => setTab(k)}>
            {k === 'cnip' ? 'Preferences' : 'Values'}
            <span className="admin-qa-count">{responses.filter(r => r.kind === k).length}</span>
          </button>
        ))}
      </div>

      {loadState === 'ok' && (
        tab === 'cnip'
          ? <CnipSection responses={responses.filter(r => r.kind === 'cnip')} nameOf={nameOf} />
          : <ValuesSection responses={responses.filter(r => r.kind === 'values')} nameOf={nameOf} />
      )}
    </div>
  );
}

// ── Sending ────────────────────────────────────────────────────────────────

function SendPanel({ clients, onSent }: { clients: ClientRow[]; onSent: () => void }) {
  const sorted = useMemo(
    () => clients.slice().sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed') || a.full_name.localeCompare(b.full_name)),
    [clients],
  );
  const [clientId, setClientId] = useState('');
  const [kind, setKind] = useState<Kind>('cnip');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; emailed: boolean; emailError: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isTest = clientId === TEST_ID;
  const client = clients.find(c => c.id === clientId);
  const recipient = isTest ? PRACTICE.email : client?.email ?? '';

  async function send(email: boolean) {
    if (!clientId) return;
    if (email && !confirm(isTest
      ? `Email a test ${KIND_LABEL[kind]} link to you (${recipient})?`
      : `Email the ${KIND_LABEL[kind]} link to ${client?.full_name} (${recipient})?`)) return;
    setBusy(true); setError(null); setResult(null); setCopied(false);
    try {
      const res = await adminFetch('/api/admin/questionnaires/send', { method: 'POST', body: JSON.stringify({ client_id: clientId, kind, email }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? 'Could not create the link.'); return; }
      setResult({ url: json.url, emailed: json.emailed, emailError: json.email_error });
      onSent();
    } catch { setError('Could not reach the server.'); }
    finally { setBusy(false); }
  }

  async function copy() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt('Copy this link', result.url); }
  }

  return (
    <section className="admin-card" aria-labelledby="qa-send-h">
      <h2 id="qa-send-h" className="admin-h2">Send a questionnaire</h2>
      <p className="admin-qa-sub">Each link is private to one client, works once and stays open for 14 days. Nothing is emailed unless you press Email.</p>
      <div className="admin-qa-send">
        <label className="admin-qa-field">
          <span>Client</span>
          <select className="admin-qa-select pii" value={clientId} onChange={e => { setClientId(e.target.value); setResult(null); }}>
            <option value="">Choose a client</option>
            <option value={TEST_ID}>Test (sends to you)</option>
            {sorted.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.status === 'completed' ? ' (ended)' : ''}</option>)}
          </select>
        </label>
        <div className="admin-qa-field">
          <span id="qa-kind-l">Questionnaire</span>
          <div className="admin-qa-seg" role="radiogroup" aria-labelledby="qa-kind-l">
            {(['cnip', 'values'] as Kind[]).map(k => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'is-on' : ''} onClick={() => { setKind(k); setResult(null); }}>
                {k === 'cnip' ? 'C–NIP–2' : 'Values'}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-qa-actions">
          <button type="button" className="admin-btn-secondary" disabled={!clientId || busy} onClick={() => send(false)}>
            <Link2 size={14} aria-hidden /> Make link
          </button>
          <button type="button" className="admin-btn-primary" disabled={!clientId || busy || !recipient} onClick={() => send(true)} title={clientId && !recipient ? 'No email on record' : undefined}>
            <Mail size={14} aria-hidden /> Email it
          </button>
        </div>
      </div>
      {error && <p className="admin-qa-note" role="alert">{error}</p>}
      {result && (
        <div className="admin-qa-result" role="status">
          <p>
            {result.emailed ? <>Emailed to <span className="pii">{recipient}</span>. </> : null}
            {result.emailError ? <span className="admin-qa-warn">{result.emailError} </span> : null}
            {!result.emailed && 'Copy the link and send it however suits.'}
          </p>
          <div className="admin-qa-linkrow">
            <code className="pii">{result.url}</code>
            <button type="button" className="admin-btn-secondary" onClick={copy}>
              {copied ? <><Check size={14} aria-hidden /> Copied</> : <><Copy size={14} aria-hidden /> Copy</>}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Shared: pick a client, then one of their completions ───────────────────

function useClientPicker(responses: ResponseRow[]) {
  const clientIds = useMemo(() => {
    const seen: string[] = [];
    for (const r of responses) if (!seen.includes(r.client_id)) seen.push(r.client_id); // newest first
    return seen;
  }, [responses]);
  const [clientId, setClientId] = useState<string>('');
  const active = clientIds.includes(clientId) ? clientId : clientIds[0] ?? '';
  const history = responses.filter(r => r.client_id === active)
    .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()); // oldest first
  return { clientIds, active, setClientId, history };
}

function ClientSelect({ ids, value, onChange, nameOf }: { ids: string[]; value: string; onChange: (v: string) => void; nameOf: (id: string) => string }) {
  return (
    <label className="admin-qa-field admin-qa-clientpick">
      <span>Client</span>
      <select className="admin-qa-select pii" value={value} onChange={e => onChange(e.target.value)}>
        {ids.map(id => <option key={id} value={id}>{nameOf(id)}</option>)}
      </select>
    </label>
  );
}

function Completions({ history, selected, onSelect }: { history: ResponseRow[]; selected: string; onSelect: (id: string) => void }) {
  if (history.length < 2) return <p className="admin-qa-muted">Completed {formatDate(history[0].submitted_at)}</p>;
  return (
    <div className="admin-qa-field">
      <span>Completed</span>
      <div className="admin-qa-chips" role="radiogroup" aria-label="Completion">
        {history.map((r, i) => (
          <button key={r.id} type="button" role="radio" aria-checked={selected === r.id} className={selected === r.id ? 'is-on' : ''} onClick={() => onSelect(r.id)}>
            {i + 1}. {formatDate(r.submitted_at)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── C–NIP–2 ────────────────────────────────────────────────────────────────

function scoresOf(r: ResponseRow): CnipScaleScore[] {
  const s = r.scores as { scales?: CnipScaleScore[] } | null;
  return s?.scales ?? scoreCnip(r.answers as CnipAnswers).scales;
}

function CnipSection({ responses, nameOf }: { responses: ResponseRow[]; nameOf: (id: string) => string }) {
  const { clientIds, active, setClientId, history } = useClientPicker(responses);
  const [sel, setSel] = useState('');
  if (clientIds.length === 0) {
    return <section className="admin-card"><p className="admin-empty">No C–NIP–2 completions yet. Send one above; results appear here once the client finishes. Clients never see their scores.</p></section>;
  }
  const current = history.find(r => r.id === sel) ?? history[history.length - 1];
  const idx = history.indexOf(current);
  const prev = idx > 0 ? history[idx - 1] : null;
  const scores = scoresOf(current);
  const prevScores = prev ? scoresOf(prev) : null;
  const answers = current.answers as CnipAnswers;
  const firstName = active === TEST_ID ? 'You' : (nameOf(active).trim().split(/\s+/)[0] || 'This client');
  const summary = summariseCnip(
    firstName,
    scores,
    answers.additional,
    prev && prevScores ? { scores: prevScores, label: formatDate(prev.submitted_at) } : undefined,
  );

  return (
    <section className="admin-card admin-qa-detail" aria-labelledby="qa-cnip-h">
      <div className="admin-qa-detailhead">
        <h2 id="qa-cnip-h" className="admin-h2">Therapy preferences</h2>
        <ClientSelect ids={clientIds} value={active} onChange={v => { setClientId(v); setSel(''); }} nameOf={nameOf} />
      </div>
      <Completions history={history} selected={current.id} onSelect={setSel} />

      <div className="admin-qa-summary">
        <h3 className="admin-h3">Summary</h3>
        {summary.map((t, k) => <p key={k} className={firstName !== 'You' && t.includes(firstName) ? 'pii' : undefined}>{t}</p>)}
      </div>

      <h3 className="admin-h3 admin-qa-resultshead">Results</h3>
      <div className="admin-qa-legend" aria-hidden>
        <span><i className="admin-qa-zone-swatch" />No strong preference (UK norms)</span>
        <span><i className="admin-qa-dot-swatch" />This completion</span>
        {history.length > 1 && <span><i className="admin-qa-dot-swatch is-ghost" />Other completions</span>}
      </div>

      <ul className="admin-qa-spectrum">
        {CNIP_SCALES.map((s, i) => {
          const sc = scores[i];
          const pos = (v: number) => ((v - sc.min) / (sc.max - sc.min)) * 100;
          // Zone = scores strictly between the two cut-offs.
          const zoneL = pos(s.strongRightMax + 0.5);
          const zoneR = pos(s.strongLeftMin - 0.5);
          const delta = prevScores ? sc.score - prevScores[i].score : null;
          const label = sc.band === 'strong_left' ? `Strong: ${s.leftPole.toLowerCase()}`
            : sc.band === 'strong_right' ? `Strong: ${s.rightPole.toLowerCase()}` : 'No strong preference';
          return (
            <li key={s.id} className={`admin-qa-scale is-${sc.band}`}>
              <div className="admin-qa-poles">
                <span className={sc.band === 'strong_left' ? 'is-strong' : ''}>{s.leftPole}</span>
                <span className={sc.band === 'strong_right' ? 'is-strong' : ''}>{s.rightPole}</span>
              </div>
              {/* Positive scores (left pole) sit on the LEFT, as on the paper form. */}
              <div className="admin-qa-track" role="img" aria-label={`${s.leftPole} to ${s.rightPole}: score ${sc.score}, ${label}`}>
                <div className="admin-qa-zone" style={{ left: `${100 - zoneR}%`, width: `${zoneR - zoneL}%` }} />
                <div className="admin-qa-zero" style={{ left: `${100 - pos(0)}%` }} />
                {history.filter(h => h.id !== current.id).map(h => {
                  const v = scoresOf(h)[i].score;
                  return <div key={h.id} className="admin-qa-dot is-ghost" style={{ left: `${100 - pos(v)}%` }} />;
                })}
                <div className="admin-qa-dot" style={{ left: `${100 - pos(sc.score)}%` }}><span>{fmtScore(sc.score)}</span></div>
              </div>
              <div className="admin-qa-scalefoot">
                <span>{label}</span>
                {delta !== null && delta !== 0 && (
                  <span className="admin-qa-muted">{delta > 0 ? `${Math.abs(delta)} towards ${s.leftPole.toLowerCase()}` : `${Math.abs(delta)} towards ${s.rightPole.toLowerCase()}`} since {formatDate(prev!.submitted_at)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="admin-qa-block">
        <h3 className="admin-h3">Would like to discuss</h3>
        {answers.additional.length === 0 ? <p className="admin-qa-muted">No additional preferences ticked.</p> : (
          <ul className="admin-qa-additional">
            {CNIP_ADDITIONAL.filter(a => answers.additional.includes(a.id)).map(a => (
              <li key={a.id} className={a.id === 'dislike' ? 'is-flag' : ''}><b>{CNIP_ADDITIONAL_SHORT[a.id]}</b><span>{a.label}</span></li>
            ))}
          </ul>
        )}
      </div>

      <details className="admin-qa-block">
        <summary>Item answers</summary>
        <table className="admin-qa-items">
          <tbody>
            {CNIP_SCALES.flatMap(s => s.items.map((it, j) => {
              const v = answers.items[it.id];
              return (
                <tr key={it.id} className={j === 0 ? 'is-first' : ''}>
                  <td className={v > 0 ? 'is-pick' : ''}>{it.left}</td>
                  <td className="admin-qa-num">{fmtScore(v)}</td>
                  <td className={v < 0 ? 'is-pick' : ''}>{it.right}</td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </details>

      <p className="admin-qa-foot">Scored with the UK cut-offs on the C–NIP–2 form (about 20% of people fall in each strong band). The scores start a conversation rather than set a plan: adopt, adapt, offer an alternative, or refer on. C–NIP–2 © Cooper &amp; Norcross, CC BY-NC-ND 4.0.</p>
    </section>
  );
}

function fmtScore(n: number) { return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0'; }

// ── Values ─────────────────────────────────────────────────────────────────

function ValuesSection({ responses, nameOf }: { responses: ResponseRow[]; nameOf: (id: string) => string }) {
  const { clientIds, active, setClientId, history } = useClientPicker(responses);
  const [sel, setSel] = useState('');
  if (clientIds.length === 0) {
    return <section className="admin-card"><p className="admin-empty">No values worksheets completed yet. Send one above; the client sees their top six at the end, and you see everything here.</p></section>;
  }
  const current = history.find(r => r.id === sel) ?? history[history.length - 1];
  const a = current.answers as ValuesAnswers;
  const gaps = areaGaps(a.areas);
  const veryCount = Object.values(a.ratings).filter(r => r === 'very').length;
  const hasStep = Object.values(a.step ?? {}).some(Boolean);

  return (
    <>
      <section className="admin-card admin-qa-detail" aria-labelledby="qa-values-h">
        <div className="admin-qa-detailhead">
          <h2 id="qa-values-h" className="admin-h2">Values</h2>
          <ClientSelect ids={clientIds} value={active} onChange={v => { setClientId(v); setSel(''); }} nameOf={nameOf} />
        </div>
        <Completions history={history} selected={current.id} onSelect={setSel} />

        <div className="admin-qa-block">
          <h3 className="admin-h3">Top six</h3>
          <ol className="admin-qa-top">
            {a.top.map((id, i) => {
              const neg = a.neglected.includes(id);
              return (
                <li key={id} className={neg ? 'is-neglected' : ''}>
                  <span className="admin-qa-rank">{i + 1}</span>
                  <div>
                    <b>{valueName(id, a.ownValues)}</b>
                    {valueDesc(id) && <span>{valueDesc(id)}</span>}
                    {neg && <em>Feels neglected right now</em>}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="admin-qa-muted">{veryCount} values marked very important{a.neglected.length === 0 ? ' · none marked as neglected' : ''}.</p>
        </div>

        {gaps.length > 0 && (
          <div className="admin-qa-block">
            <h3 className="admin-h3">Values in my life</h3>
            <div className="admin-qa-legend" aria-hidden>
              <span><i className="admin-qa-bar-swatch" />How important</span>
              <span><i className="admin-qa-bar-swatch is-gold" />Living by it now</span>
            </div>
            <ul className="admin-qa-areas">
              {LIFE_AREAS.map(area => {
                const x = a.areas[area.id];
                if (!x || (x.importance === null && x.living === null)) return null;
                const gap = x.importance !== null && x.living !== null ? x.importance - x.living : null;
                return (
                  <li key={area.id}>
                    <div className="admin-qa-areahead">
                      <b>{area.name}</b>
                      {gap !== null && gap >= 3 && <span className="admin-qa-gap">Gap of {gap}</span>}
                    </div>
                    <div className="admin-qa-bars" role="img" aria-label={`${area.name}: importance ${x.importance ?? 'not answered'}, living by it ${x.living ?? 'not answered'}`}>
                      <div className="admin-qa-bar"><div className="admin-qa-bartrack"><i style={{ width: `${(x.importance ?? 0) * 10}%` }} /></div><span>{x.importance ?? '–'}</span></div>
                      <div className="admin-qa-bar is-gold"><div className="admin-qa-bartrack"><i style={{ width: `${(x.living ?? 0) * 10}%` }} /></div><span>{x.living ?? '–'}</span></div>
                    </div>
                    {x.note && <p className="admin-qa-quote">“{x.note}”</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {hasStep && (
          <div className="admin-qa-block admin-qa-step">
            <h3 className="admin-h3">One small step this week</h3>
            <dl>
              {([['Will do', a.step.action], ['Towards', a.step.value], ['Might show up', a.step.obstacles], ['Worth it because', a.step.worth]] as const)
                .filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          </div>
        )}

        <details className="admin-qa-block">
          <summary>All ratings</summary>
          <div className="admin-qa-ratings">
            {(['very', 'quite', 'not'] as const).map(r => (
              <div key={r}>
                <b>{r === 'very' ? 'Very important' : r === 'quite' ? 'Quite important' : 'Not so important'}</b>
                <p>{Object.entries(a.ratings).filter(([, v]) => v === r).map(([id]) => valueName(id, a.ownValues)).join(', ') || '–'}</p>
              </div>
            ))}
          </div>
        </details>
      </section>

      <Caseload responses={responses} />
    </>
  );
}

/** Across clients (latest worksheet each): which values come up most. */
function Caseload({ responses }: { responses: ResponseRow[] }) {
  const latest = new Map<string, ValuesAnswers>();
  for (const r of responses) {
    if (r.client_id === TEST_ID) continue; // the practitioner's own tries
    if (!latest.has(r.client_id)) latest.set(r.client_id, r.answers as ValuesAnswers); // newest first
  }
  if (latest.size < 2) return null;
  const tally = (pick: (a: ValuesAnswers) => string[]) => {
    const m = new Map<string, number>();
    for (const a of latest.values()) for (const id of pick(a)) if (VALUES.some(v => v.id === id)) m.set(id, (m.get(id) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8);
  };
  const top = tally(a => a.top);
  const neg = tally(a => a.neglected);
  const max = Math.max(1, ...top.map(t => t[1]));
  const name = (id: string) => VALUES.find(v => v.id === id)?.name ?? id;
  return (
    <section className="admin-card" aria-labelledby="qa-caseload-h">
      <h2 id="qa-caseload-h" className="admin-h2">Across your clients</h2>
      <p className="admin-qa-sub">From the latest worksheet of {latest.size} clients. Own values aren’t counted.</p>
      <div className="admin-qa-caseload">
        <div>
          <h3 className="admin-h3">Most often in a top six</h3>
          <ul className="admin-qa-tally">
            {top.map(([id, n]) => <li key={id}><span>{name(id)}</span><i style={{ width: `${(n / max) * 100}%` }} /><b>{n}</b></li>)}
          </ul>
        </div>
        {neg.length > 0 && (
          <div>
            <h3 className="admin-h3">Most often feeling neglected</h3>
            <ul className="admin-qa-tally is-terracotta">
              {neg.map(([id, n]) => <li key={id}><span>{name(id)}</span><i style={{ width: `${(n / max) * 100}%` }} /><b>{n}</b></li>)}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
