'use client';

import { useEffect, useState } from 'react';
import { CNIP_SCALES, CNIP_ADDITIONAL, CNIP_RESPONSES, type CnipResponse } from '@/lib/questionnaires/cnip';
import { QShell, QCard, QHeading, QProgress, PrimaryButton, NavRow, QInvalid, QMessage } from './ui';

// The C–NIP–2 is licensed CC BY-NC-ND 4.0 (no adaptations). The wording, the
// order and the 3 … −3 response scale are shown exactly as on the UK form.
// Scale groups are paged one per screen for phones; nothing is reworded.
// Clients don't see their scores (the scoring key is for the therapist).

const TOTAL = CNIP_SCALES.length + 1;
const fmt = (n: number) => (n < 0 ? `−${-n}` : String(n));

export default function CnipForm({ token, firstName }: { token: string; firstName: string }) {
  const [page, setPage] = useState(0); // 0 intro, 1..7 scales, 8 additional
  const [items, setItems] = useState<Record<string, CnipResponse>>({});
  const [additional, setAdditional] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [linkProblem, setLinkProblem] = useState<'expired' | 'invalid' | null>(null);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [page]);

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      const res = await fetch('/api/questionnaires/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, kind: 'cnip', answers: { items, additional } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.reason === 'expired' || json.reason === 'invalid') setLinkProblem(json.reason);
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone(true);
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (linkProblem) return <QInvalid reason={linkProblem} />;
  if (done) {
    return (
      <QMessage
        heading={firstName ? `Thank you, ${firstName}` : 'Thank you'}
        body={<>Your answers have been sent securely. We’ll talk through them together, so there’s nothing more you need to do. If anything else about how you’d like therapy to be comes to mind, you can bring it up at any time.</>}
      />
    );
  }

  const scale = page >= 1 && page <= CNIP_SCALES.length ? CNIP_SCALES[page - 1] : null;
  const scaleDone = scale ? scale.items.every(i => items[i.id] !== undefined) : true;

  return (
    <QShell wide>
      {page === 0 && (
        <>
          <QHeading
            title="Cooper–Norcross Inventory of Preferences–2"
            lead={<>{firstName ? `Hi ${firstName}. ` : ''}We want therapy to be the best fit for you.</>}
          />
          <QCard className="flex flex-col gap-4 text-base leading-relaxed text-forest/90">
            <p>Please indicate your preferences for how a therapist or counsellor should work with you by checking one box on each row.</p>
            <p>A 3 indicates a strong preference in that direction, 2 indicates a moderate preference in that direction, 1 indicates a slight preference in that direction, 0 indicates no preference in either direction or an equal preference in both directions.</p>
            <p>Each set of options has two sides, so take a moment to consider both before you decide.</p>
            <p className="text-ink-soft">It takes about five minutes. There are no right or wrong answers.</p>
          </QCard>
          <div className="flex justify-end"><PrimaryButton onClick={() => setPage(1)}>Begin</PrimaryButton></div>
        </>
      )}

      {scale && (
        <>
          <QProgress step={page} total={TOTAL} label="I would like the therapist to…" />
          <div className="flex flex-col gap-4">
            {scale.items.map(item => (
              <ItemRow key={item.id} id={item.id} left={item.left} right={item.right} value={items[item.id]}
                onChange={v => setItems(p => ({ ...p, [item.id]: v }))} />
            ))}
          </div>
          <NavRow onBack={() => setPage(p => p - 1)}>
            <PrimaryButton disabled={!scaleDone} onClick={() => setPage(p => p + 1)}>Next</PrimaryButton>
          </NavRow>
        </>
      )}

      {page === TOTAL && (
        <>
          <QProgress step={page} total={TOTAL} label="Additional preferences for consideration" />
          <QCard className="flex flex-col gap-4">
            <p className="text-base font-medium text-forest">Please check any of the following boxes if you would like to discuss further preferences regarding:</p>
            <ul className="flex flex-col">
              {CNIP_ADDITIONAL.map(a => {
                const on = additional.includes(a.id);
                return (
                  <li key={a.id} className="border-t first:border-t-0 border-[#EFE9DF]">
                    <label className="flex items-start gap-3 py-3 cursor-pointer min-h-11">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => setAdditional(p => on ? p.filter(x => x !== a.id) : [...p, a.id])}
                        className="mt-1 w-5 h-5 shrink-0 accent-[#2A4D3C]"
                      />
                      <span className="text-base text-forest/90">{a.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </QCard>
          {error && <p role="alert" className="text-base text-[#A04714]">{error}</p>}
          <NavRow onBack={() => setPage(p => p - 1)}>
            <PrimaryButton disabled={submitting} onClick={submit}>{submitting ? 'Sending…' : 'Send my answers'}</PrimaryButton>
          </NavRow>
        </>
      )}

      <p className="text-sm text-ink-soft">
        Cooper–Norcross Inventory of Preferences–2 (C–NIP–2) UK. © Mick Cooper and John C. Norcross.
        Licensed under <a className="underline underline-offset-2" href="https://creativecommons.org/licenses/by-nc-nd/4.0/" target="_blank" rel="noopener noreferrer">CC BY-NC-ND 4.0</a>.
        {' '}<a className="underline underline-offset-2" href="https://www.talkingpreferences.org" target="_blank" rel="noopener noreferrer">talkingpreferences.org</a>
      </p>
    </QShell>
  );
}

function ItemRow({ id, left, right, value, onChange }: { id: string; left: string; right: string; value?: CnipResponse; onChange: (v: CnipResponse) => void }) {
  return (
    <fieldset className="bg-white rounded-lg border border-[#E9E2D6] px-4 py-5 md:px-6 flex flex-col gap-4">
      <legend className="sr-only">{left} or {right}</legend>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start text-base text-forest">
        <span id={`${id}-l`} className="font-medium [text-wrap:pretty]">{left}</span>
        <span className="hidden md:block text-sm text-ink-soft text-center pt-0.5">No or equal preference</span>
        <span id={`${id}-r`} className="font-medium text-right [text-wrap:pretty] md:col-start-3 col-start-3">{right}</span>
      </div>
      <div role="radiogroup" aria-labelledby={`${id}-l ${id}-r`} className="grid grid-cols-7 gap-1.5 md:gap-2">
        {CNIP_RESPONSES.map(n => {
          const on = value === n;
          const side = n > 0 ? 'left' : n < 0 ? 'right' : 'middle';
          const strength = Math.abs(n);
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={n === 0 ? '0, no or equal preference' : `${fmt(n)}, ${strength === 3 ? 'strong' : strength === 2 ? 'moderate' : 'slight'} preference for: ${side === 'left' ? left : right}`}
              onClick={() => onChange(n)}
              className={`min-h-12 rounded-md border text-base tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${on ? 'bg-forest text-white border-forest' : 'bg-white text-forest border-[#D9D0C2]'}`}
            >
              {fmt(n)}
            </button>
          );
        })}
      </div>
      <p className="md:hidden text-sm text-ink-soft text-center -mt-2">0 = no or equal preference</p>
    </fieldset>
  );
}
