'use client';

import { useEffect, useState } from 'react';
import {
  VALUES, LIFE_AREAS, OWN_VALUE_IDS, TOP_COUNT, NEGLECTED_MAX, RATING_LABELS, TEXT_LIMITS,
  valueName, valueDesc,
  type ValueRating, type ValuesAnswers, type OwnValueId,
} from '@/lib/questionnaires/values';
import {
  QShell, QCard, QHeading, QProgress, PrimaryButton, NavRow, QInvalid,
  loadDraft, saveDraft, clearDraft,
} from './ui';

const STEPS = ['Rate each value', 'Your top six', 'Values wanting more room'];
const RESULTS = STEPS.length + 1; // step index of the results screen

// The life-area scores and "one small step" were removed from the online
// worksheet (Nov 2026); their fields stay in the answer shape, empty, so older
// results and the server's validation keep working.
const emptyAnswers = (): ValuesAnswers => ({
  ratings: {},
  ownValues: {},
  top: [],
  neglected: [],
  areas: Object.fromEntries(LIFE_AREAS.map(a => [a.id, { note: '', importance: null, living: null }])),
  step: { action: '', value: '', obstacles: '', worth: '' },
});

const inputCls = 'w-full rounded-md px-4 py-3 text-base bg-white text-forest border border-[#E0D8CE] focus:outline-none focus:border-green focus:ring-1 focus:ring-green placeholder:text-ink-soft/70';

export default function ValuesForm({ token, firstName }: { token: string; firstName: string }) {
  const draftKey = `ol_values_${token.slice(0, 12)}`;
  const [step, setStep] = useState(0); // 0 = intro, 1..3 = steps, 4 = results
  const [a, setA] = useState<ValuesAnswers>(emptyAnswers);
  const [submitting, setSubmitting] = useState(false);
  const [emailedCopy, setEmailedCopy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkProblem, setLinkProblem] = useState<'used' | 'expired' | 'invalid' | null>(null);

  useEffect(() => {
    const d = loadDraft<{ a: ValuesAnswers; step: number }>(draftKey);
    if (d?.a) {
      // Older drafts may hold life-area notes or a small step from the longer
      // worksheet: drop them, as the client can no longer see them.
      const empty = emptyAnswers();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore once on mount
      setA({ ...empty, ...d.a, areas: empty.areas, step: empty.step });
      setStep(Math.min(d.step ?? 0, STEPS.length));
    }
  }, [draftKey]);
  useEffect(() => { if (step <= STEPS.length) saveDraft(draftKey, { a, step }); }, [a, step, draftKey]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const ownNamed = OWN_VALUE_IDS.filter(id => a.ownValues[id]?.trim());
  const allIds = [...VALUES.map(v => v.id), ...ownNamed];
  const ratedCount = VALUES.filter(v => a.ratings[v.id]).length;

  function rate(id: string, r: ValueRating) {
    setA(prev => {
      const top = r === 'not' ? prev.top.filter(t => t !== id) : prev.top;
      return { ...prev, ratings: { ...prev.ratings, [id]: r }, top, neglected: prev.neglected.filter(n => top.includes(n)) };
    });
  }
  function toggleTop(id: string) {
    setA(prev => {
      if (prev.top.includes(id)) {
        return { ...prev, top: prev.top.filter(t => t !== id), neglected: prev.neglected.filter(n => n !== id) };
      }
      if (prev.top.length >= TOP_COUNT) return prev;
      return { ...prev, top: [...prev.top, id] };
    });
  }
  function toggleNeglected(id: string) {
    setA(prev => prev.neglected.includes(id)
      ? { ...prev, neglected: prev.neglected.filter(n => n !== id) }
      : prev.neglected.length >= NEGLECTED_MAX ? prev : { ...prev, neglected: [...prev.neglected, id] });
  }

  async function submit() {
    setSubmitting(true); setError(null);
    try {
      // Drop ratings for own values that were later cleared.
      const ratings = Object.fromEntries(Object.entries(a.ratings).filter(([id]) => allIds.includes(id)));
      const res = await fetch('/api/questionnaires/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, kind: 'values', answers: { ...a, ratings, areas: emptyAnswers().areas, step: emptyAnswers().step } }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.reason) { setLinkProblem(json.reason); clearDraft(draftKey); }
        setError(json.error ?? 'Something went wrong. Please try again.');
        return;
      }
      clearDraft(draftKey);
      setEmailedCopy(Boolean(json.emailed_copy));
      setStep(RESULTS);
    } catch {
      setError('Couldn’t reach the server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (linkProblem && linkProblem !== 'used') return <QInvalid reason={linkProblem} />;
  if (step === RESULTS) return <ValuesResults a={a} firstName={firstName} emailedCopy={emailedCopy} />;

  return (
    <QShell>
      {step === 0 && (
        <>
          <QHeading
            title="Finding your values"
            lead={<>{firstName ? `Hi ${firstName}. ` : ''}Values are how you want to be as a person: what you want to stand for, and how you want to treat yourself, other people and the world around you.</>}
          />
          <QCard className="flex flex-col gap-6">
            <p className="text-base leading-relaxed text-forest/90">
              Think of them like a compass. A compass gives you a direction to head in, even on hard days, but you never arrive at “west”. Goals are the places on the map you can reach and tick off along the way.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-[#E4EDE6] p-5 flex flex-col gap-2">
                <h3 className="text-base font-semibold text-forest">A value</h3>
                <p className="text-base text-forest/85 leading-relaxed">A direction you keep moving in. You can act on it today, whatever is going on.</p>
                <p className="text-sm text-ink-soft">Being a loving partner · Learning and growing</p>
              </div>
              <div className="rounded-md bg-[#FAF0D9] p-5 flex flex-col gap-2">
                <h3 className="text-base font-semibold text-[#7A5A12]">A goal</h3>
                <p className="text-base text-forest/85 leading-relaxed">Something you can finish. Once it’s done, it’s done.</p>
                <p className="text-sm text-ink-soft">Getting married · Running 5k</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-semibold text-forest">Values are not</h3>
              <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-base text-forest/85">
                <li><b className="font-medium">Rules.</b> If it sounds like “I should”, it’s probably a rule.</li>
                <li><b className="font-medium">Feelings.</b> “Being happy” is a feeling. Values are about what you do.</li>
                <li><b className="font-medium">Others’ wishes.</b> They’re yours, not what others expect of you.</li>
                <li><b className="font-medium">Right or wrong.</b> There are no correct answers.</li>
              </ul>
            </div>
            <p className="text-base text-ink-soft">It takes about 10 minutes. Your answers are kept if you refresh the page, until you close this tab.</p>
          </QCard>
          <div className="flex justify-end"><PrimaryButton onClick={() => setStep(1)}>Begin</PrimaryButton></div>
        </>
      )}

      {step >= 1 && step <= STEPS.length && <QProgress step={step} total={STEPS.length} label={STEPS[step - 1]} />}

      {step === 1 && (
        <>
          <p className="text-base text-ink-soft -mt-4">Go with what feels true for you. Mark each one as very, quite or not so important.</p>
          <QCard className="!px-0 !py-2">
            <ul>
              {VALUES.map(v => (
                <RateRow key={v.id} id={v.id} name={v.name} desc={v.desc} value={a.ratings[v.id]} onRate={rate} />
              ))}
              {OWN_VALUE_IDS.map((id, i) => (
                <OwnRow
                  key={id}
                  id={id}
                  index={i}
                  text={a.ownValues[id] ?? ''}
                  value={a.ratings[id]}
                  onText={t => setA(prev => {
                    const ownValues = { ...prev.ownValues, [id]: t.slice(0, TEXT_LIMITS.ownValue) };
                    if (t.trim()) return { ...prev, ownValues };
                    const ratings = { ...prev.ratings }; delete ratings[id];
                    return { ...prev, ownValues, ratings, top: prev.top.filter(x => x !== id), neglected: prev.neglected.filter(x => x !== id) };
                  })}
                  onRate={rate}
                />
              ))}
            </ul>
          </QCard>
          <NavRow onBack={() => setStep(0)}>
            <div className="flex items-center gap-4">
              <span className="text-sm text-ink-soft">{ratedCount} of {VALUES.length}</span>
              <PrimaryButton disabled={ratedCount < VALUES.length} onClick={() => setStep(2)}>Next</PrimaryButton>
            </div>
          </NavRow>
        </>
      )}

      {step === 2 && (
        <TopSix a={a} ownIds={ownNamed} onToggle={toggleTop} onBack={() => setStep(1)} onNext={() => setStep(3)} />
      )}

      {step === 3 && (
        <>
          <p className="text-base text-ink-soft -mt-4 [text-wrap:pretty]">
            Of your top six, are there any you’re not living by as much as you’d like at the moment? Choose up to three, or skip this if none fit. This isn’t about getting it wrong; it shows where there’s room to move towards what matters.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {a.top.map((id, i) => {
              const on = a.neglected.includes(id);
              const full = !on && a.neglected.length >= NEGLECTED_MAX;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  disabled={full}
                  onClick={() => toggleNeglected(id)}
                  className={`text-left rounded-lg border p-4 min-h-16 flex gap-3 items-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-forest disabled:opacity-40 ${on ? 'bg-[#FBEDE3] border-orange' : 'bg-white border-[#E0D8CE]'}`}
                >
                  <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-sm ${on ? 'bg-orange text-white' : 'bg-linen text-forest'}`}>{i + 1}</span>
                  <span className="flex flex-col">
                    <span className="text-base font-medium text-forest">{valueName(id, a.ownValues)}</span>
                    {valueDesc(id) && <span className="text-sm text-ink-soft">{valueDesc(id)}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {error && <p role="alert" className="text-base text-[#A04714]">{error}</p>}
          <NavRow onBack={() => setStep(2)}>
            <div className="flex items-center gap-4">
              <span className="text-sm text-ink-soft">{a.neglected.length} of {NEGLECTED_MAX}</span>
              <PrimaryButton disabled={submitting} onClick={submit}>{submitting ? 'Sending…' : 'See my values'}</PrimaryButton>
            </div>
          </NavRow>
        </>
      )}

      <p className="text-sm text-ink-soft">Based on acceptance and commitment therapy (ACT), drawing on the work of Steven Hayes and Russ Harris.</p>
    </QShell>
  );
}

function Segmented({ name, value, onRate }: { name: string; value?: ValueRating; onRate: (r: ValueRating) => void }) {
  const opts: Array<{ r: ValueRating; short: string; on: string }> = [
    { r: 'very', short: 'Very', on: 'bg-green text-white border-green' },
    { r: 'quite', short: 'Quite', on: 'bg-gold text-forest border-gold' },
    { r: 'not', short: 'Not so', on: 'bg-[#E9E2D6] text-forest border-[#D9D0C2]' },
  ];
  return (
    <div role="radiogroup" aria-label={`How important is ${name}?`} className="grid grid-cols-3 gap-1.5 shrink-0 w-full sm:w-[234px]">
      {opts.map(o => (
        <button
          key={o.r}
          type="button"
          role="radio"
          aria-checked={value === o.r}
          aria-label={RATING_LABELS[o.r]}
          onClick={() => onRate(o.r)}
          className={`min-h-11 rounded-md border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${value === o.r ? o.on : 'bg-white text-forest border-[#E0D8CE]'}`}
        >
          {o.short}
        </button>
      ))}
    </div>
  );
}

function RateRow({ id, name, desc, value, onRate }: { id: string; name: string; desc: string; value?: ValueRating; onRate: (id: string, r: ValueRating) => void }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 md:px-8 py-4 border-t first:border-t-0 border-[#EFE9DF]">
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium text-forest">{name}</p>
        <p className="text-sm text-ink-soft">{desc}</p>
      </div>
      <Segmented name={name} value={value} onRate={r => onRate(id, r)} />
    </li>
  );
}

function OwnRow({ id, index, text, value, onText, onRate }: { id: OwnValueId; index: number; text: string; value?: ValueRating; onText: (t: string) => void; onRate: (id: string, r: ValueRating) => void }) {
  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 md:px-8 py-4 border-t border-[#EFE9DF]">
      <label className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-sm text-ink-soft">My own{index === 0 ? ' (optional)' : ''}</span>
        <input className={inputCls} value={text} maxLength={TEXT_LIMITS.ownValue} onChange={e => onText(e.target.value)} placeholder="A value of your own" />
      </label>
      {text.trim() && <Segmented name={text} value={value} onRate={r => onRate(id, r)} />}
    </li>
  );
}

const PROMPTS = [
  ['Your 80th birthday', 'Imagine someone giving a speech about you. What would you love them to say about how you lived and who you were?'],
  ['Where it hurts', 'What pains you? Hurt often points straight at something you care about.'],
  ['People you admire', 'Who do you look up to? What is it about the way they are that you admire?'],
  ['Most like yourself', 'When have you felt most alive, or most like you? What were you doing, and how were you being?'],
  ['If no one would know', 'What would you still choose to do if no one would ever see it or praise you for it?'],
  ['If the struggle eased', 'If difficult thoughts and feelings had less hold on you, what would you do more of?'],
] as const;

function TopSix({ a, ownIds, onToggle, onBack, onNext }: { a: ValuesAnswers; ownIds: string[]; onToggle: (id: string) => void; onBack: () => void; onNext: () => void }) {
  const ids = [...VALUES.map(v => v.id), ...ownIds];
  const very = ids.filter(id => a.ratings[id] === 'very');
  const quite = ids.filter(id => a.ratings[id] === 'quite');
  const full = a.top.length >= TOP_COUNT;

  const chip = (id: string) => {
    const rank = a.top.indexOf(id);
    const on = rank >= 0;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={on}
        disabled={!on && full}
        onClick={() => onToggle(id)}
        className={`inline-flex items-center gap-2 min-h-11 pl-2 pr-4 rounded-full border text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-35 ${on ? 'bg-forest text-white border-forest' : 'bg-white text-forest border-[#D9D0C2]'}`}
      >
        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${on ? 'bg-white/15' : 'bg-linen'}`} aria-hidden>{on ? rank + 1 : '+'}</span>
        {valueName(id, a.ownValues)}
      </button>
    );
  };

  return (
    <>
      <p className="text-base text-ink-soft -mt-4 [text-wrap:pretty]">From the ones that matter most, choose the six that feel closest to the heart of you. Tap in any order; you can change your mind.</p>
      <QCard className="flex flex-col gap-6">
        {very.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-forest">Very important to you</h3>
            <div className="flex flex-wrap gap-2">{very.map(chip)}</div>
          </div>
        )}
        {quite.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-forest">Quite important to you</h3>
            <div className="flex flex-wrap gap-2">{quite.map(chip)}</div>
          </div>
        )}
        {very.length + quite.length < TOP_COUNT && (
          <p className="text-base text-[#A04714]">You’ve marked fewer than six values as important. Go back and look again, or add one of your own.</p>
        )}
      </QCard>
      <details className="group rounded-lg border border-[#E0D8CE] bg-white/60 px-5 py-4">
        <summary className="cursor-pointer text-base text-forest list-none flex justify-between items-center">
          Finding it hard to choose? Some questions that can help
          <span className="text-ink-soft group-open:rotate-45 transition-transform text-xl leading-none" aria-hidden>+</span>
        </summary>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {PROMPTS.map(([t, q]) => (
            <div key={t}><dt className="text-base font-medium text-forest">{t}</dt><dd className="text-base text-ink-soft">{q}</dd></div>
          ))}
        </dl>
      </details>
      <NavRow onBack={onBack}>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink-soft">{a.top.length} of {TOP_COUNT}</span>
          <PrimaryButton disabled={a.top.length !== TOP_COUNT} onClick={onNext}>Next</PrimaryButton>
        </div>
      </NavRow>
    </>
  );
}

function ValuesResults({ a, firstName, emailedCopy }: { a: ValuesAnswers; firstName: string; emailedCopy: boolean }) {
  return (
    <QShell>
      <QHeading
        title={firstName ? `Your values, ${firstName}` : 'Your values'}
        lead={`Thank you. Your answers are with me, and we can look at them together. Here’s what you chose, to keep for yourself.${emailedCopy ? ' I’ve also emailed you a copy.' : ''}`}
      />

      <QCard className="flex flex-col gap-5">
        <h2 className="font-heading font-light text-2xl text-forest">My top six</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {a.top.map((id, i) => {
            const neglected = a.neglected.includes(id);
            return (
              <li key={id} className={`rounded-lg p-4 flex gap-3 items-start border ${neglected ? 'border-orange bg-[#FBEDE3]' : 'border-[#E4EDE6] bg-[#F3F7F3]'}`}>
                <span className="w-8 h-8 shrink-0 rounded-full bg-forest text-white flex items-center justify-center text-base font-light">{i + 1}</span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-lg font-medium text-forest">{valueName(id, a.ownValues)}</span>
                  {valueDesc(id) && <span className="text-sm text-ink-soft">{valueDesc(id)}</span>}
                  {neglected && <span className="text-sm text-[#A04714] mt-1">Wanting more room right now</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </QCard>

      <p className="text-sm text-ink-soft">Based on acceptance and commitment therapy (ACT), drawing on the work of Steven Hayes and Russ Harris.</p>
    </QShell>
  );
}
