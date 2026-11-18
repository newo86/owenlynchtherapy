/**
 * "Finding your values" — an ACT worksheet (Owen's own, drawing on the work
 * of Steven Hayes and Russ Harris). Wording mirrors the printed worksheet.
 *
 * Online flow: rate every value (very / quite / not so important), choose a
 * top six, optionally mark up to three of those six as neglected, then the
 * six life areas (0–10 importance and "living by it now") and one small step.
 */

export type ValueRating = 'very' | 'quite' | 'not';
export const VALUE_RATINGS: ValueRating[] = ['very', 'quite', 'not'];
export const RATING_LABELS: Record<ValueRating, string> = {
  very: 'Very important',
  quite: 'Quite important',
  not: 'Not so important',
};

export interface ValueDef { id: string; name: string; desc: string }

export const VALUES: ValueDef[] = [
  { id: 'acceptance', name: 'Acceptance', desc: 'being open to myself, others and life as it is' },
  { id: 'adventure', name: 'Adventure', desc: 'seeking out new experiences' },
  { id: 'assertiveness', name: 'Assertiveness', desc: 'standing up for myself, respectfully' },
  { id: 'authenticity', name: 'Authenticity', desc: 'being true to who I am' },
  { id: 'beauty', name: 'Beauty', desc: 'noticing and creating things that move me' },
  { id: 'caring', name: 'Caring', desc: 'looking after people I care about' },
  { id: 'challenge', name: 'Challenge', desc: 'stretching myself to grow' },
  { id: 'compassion', name: 'Compassion', desc: 'kindness towards pain, my own included' },
  { id: 'connection', name: 'Connection', desc: 'being fully present with people' },
  { id: 'contribution', name: 'Contribution', desc: 'making a difference' },
  { id: 'cooperation', name: 'Cooperation', desc: 'working well with others' },
  { id: 'courage', name: 'Courage', desc: 'facing what’s hard' },
  { id: 'creativity', name: 'Creativity', desc: 'making, imagining, inventing' },
  { id: 'curiosity', name: 'Curiosity', desc: 'exploring and staying open' },
  { id: 'fairness', name: 'Fairness', desc: 'treating people justly' },
  { id: 'faith', name: 'Faith', desc: 'living by my spiritual or religious beliefs' },
  { id: 'fitness', name: 'Fitness', desc: 'caring for my body' },
  { id: 'flexibility', name: 'Flexibility', desc: 'adapting as things change' },
  { id: 'forgiveness', name: 'Forgiveness', desc: 'letting go of resentment' },
  { id: 'freedom', name: 'Freedom', desc: 'choosing how I live' },
  { id: 'friendliness', name: 'Friendliness', desc: 'being warm and approachable' },
  { id: 'fun', name: 'Fun', desc: 'enjoying, playing, laughing' },
  { id: 'generosity', name: 'Generosity', desc: 'giving and sharing' },
  { id: 'gratitude', name: 'Gratitude', desc: 'appreciating what I have' },
  { id: 'honesty', name: 'Honesty', desc: 'being truthful' },
  { id: 'humility', name: 'Humility', desc: 'not needing to be the centre of attention' },
  { id: 'humour', name: 'Humour', desc: 'seeing the lighter side' },
  { id: 'independence', name: 'Independence', desc: 'standing on my own feet' },
  { id: 'intimacy', name: 'Intimacy', desc: 'being open and close with someone' },
  { id: 'justice', name: 'Justice', desc: 'standing up for what’s right' },
  { id: 'kindness', name: 'Kindness', desc: 'being considerate' },
  { id: 'learning', name: 'Learning', desc: 'growing my knowledge and skills' },
  { id: 'love', name: 'Love', desc: 'being loving to others and myself' },
  { id: 'loyalty', name: 'Loyalty', desc: 'being there for my people' },
  { id: 'mindfulness', name: 'Mindfulness', desc: 'being present and aware' },
  { id: 'nature', name: 'Nature', desc: 'time in, and care for, the natural world' },
  { id: 'order', name: 'Order', desc: 'keeping things organised' },
  { id: 'patience', name: 'Patience', desc: 'waiting calmly' },
  { id: 'persistence', name: 'Persistence', desc: 'keeping going when it’s hard' },
  { id: 'respect', name: 'Respect', desc: 'treating people with consideration' },
  { id: 'responsibility', name: 'Responsibility', desc: 'owning my actions' },
  { id: 'self_care', name: 'Self-care', desc: 'looking after my own needs' },
  { id: 'security', name: 'Security', desc: 'creating safety and stability' },
  { id: 'skilfulness', name: 'Skilfulness', desc: 'doing things well' },
  { id: 'supportiveness', name: 'Supportiveness', desc: 'being there for others' },
  { id: 'trust', name: 'Trust', desc: 'being reliable and trustworthy' },
];

/** Two free-text "My own" values. */
export const OWN_VALUE_IDS = ['own1', 'own2'] as const;
export type OwnValueId = typeof OWN_VALUE_IDS[number];

export interface LifeArea { id: string; name: string; hint: string }

export const LIFE_AREAS: LifeArea[] = [
  { id: 'relationships', name: 'Close relationships', hint: 'Partner, family, the people closest to you.' },
  { id: 'friends', name: 'Friends and community', hint: 'Friendships, neighbours, groups you belong to.' },
  { id: 'work', name: 'Work and learning', hint: 'Paid or unpaid work, study, building skills.' },
  { id: 'health', name: 'Health and body', hint: 'Rest, movement, food, looking after yourself.' },
  { id: 'fun', name: 'Fun and rest', hint: 'Hobbies, play, creativity, switching off.' },
  { id: 'meaning', name: 'Meaning and spirit', hint: 'Faith, nature, causes, what gives life meaning.' },
];

export const TOP_COUNT = 6;
export const NEGLECTED_MAX = 3;

export interface LifeAreaAnswer {
  note: string;
  importance: number | null;
  living: number | null;
}

export interface ValuesAnswers {
  ratings: Record<string, ValueRating>;
  ownValues: Partial<Record<OwnValueId, string>>;
  /** In the order chosen: index 0 is the client's first pick. */
  top: string[];
  neglected: string[];
  areas: Record<string, LifeAreaAnswer>;
  step: { action: string; value: string; obstacles: string; worth: string };
}

export const TEXT_LIMITS = { ownValue: 40, areaNote: 600, step: 500 } as const;

/** Display name for a value id, including the client's own values. */
export function valueName(id: string, own: ValuesAnswers['ownValues']): string {
  const def = VALUES.find(v => v.id === id);
  if (def) return def.name;
  if ((OWN_VALUE_IDS as readonly string[]).includes(id)) return own[id as OwnValueId] || 'My own value';
  return id;
}

export function valueDesc(id: string): string | null {
  return VALUES.find(v => v.id === id)?.desc ?? null;
}

/** Biggest gaps first: areas where importance outruns how they're living. */
export function areaGaps(areas: ValuesAnswers['areas']): Array<{ id: string; gap: number }> {
  return LIFE_AREAS
    .map(a => {
      const x = areas[a.id];
      if (!x || x.importance === null || x.living === null) return null;
      return { id: a.id, gap: x.importance - x.living };
    })
    .filter((x): x is { id: string; gap: number } => x !== null)
    .sort((a, b) => b.gap - a.gap);
}

type Clean = (s: string) => string;

/**
 * Strictly parse untrusted answers from the public form. `clean` tidies
 * free text (the server strips control characters only; React escapes on output).
 * Returns an error string on failure.
 */
export function parseValuesAnswers(raw: unknown, clean: Clean): ValuesAnswers | string {
  if (!raw || typeof raw !== 'object') return 'Invalid answers';
  const r = raw as Record<string, unknown>;

  const str = (v: unknown, max: number): string | null => {
    if (v === undefined || v === null) return '';
    if (typeof v !== 'string') return null;
    const s = clean(v).trim();
    return s.length > max ? null : s;
  };

  // Own values
  const ownIn = (r.ownValues ?? {}) as Record<string, unknown>;
  if (typeof ownIn !== 'object' || Array.isArray(ownIn)) return 'Invalid own values';
  const ownValues: ValuesAnswers['ownValues'] = {};
  for (const id of OWN_VALUE_IDS) {
    const s = str(ownIn[id], TEXT_LIMITS.ownValue);
    if (s === null) return 'Your own value is too long';
    if (s) ownValues[id] = s;
  }
  const allowed = new Set<string>([...VALUES.map(v => v.id), ...OWN_VALUE_IDS.filter(id => ownValues[id])]);

  // Ratings: every listed value must be rated; own values only if named.
  const ratingsIn = r.ratings as Record<string, unknown> | undefined;
  if (!ratingsIn || typeof ratingsIn !== 'object' || Array.isArray(ratingsIn)) return 'Please rate the values';
  const ratings: Record<string, ValueRating> = {};
  for (const [id, v] of Object.entries(ratingsIn)) {
    if (!allowed.has(id)) return 'Unknown value';
    if (typeof v !== 'string' || !(VALUE_RATINGS as string[]).includes(v)) return 'Invalid rating';
    ratings[id] = v as ValueRating;
  }
  if (VALUES.some(v => !ratings[v.id])) return 'Please rate every value';

  // Top six: distinct, allowed, and not rated "not so important".
  const top = r.top;
  if (!Array.isArray(top) || top.length !== TOP_COUNT) return `Please choose your top ${TOP_COUNT} values`;
  if (new Set(top).size !== top.length) return 'Duplicate value in your top six';
  for (const id of top) {
    if (typeof id !== 'string' || !allowed.has(id) || !ratings[id] || ratings[id] === 'not') return 'Invalid top value';
  }

  const neglected = r.neglected ?? [];
  if (!Array.isArray(neglected) || neglected.length > NEGLECTED_MAX) return 'Choose up to three neglected values';
  if (new Set(neglected).size !== neglected.length) return 'Duplicate neglected value';
  for (const id of neglected) if (typeof id !== 'string' || !top.includes(id)) return 'Neglected values must be from your top six';

  // Life areas: all optional.
  const areasIn = (r.areas ?? {}) as Record<string, unknown>;
  if (typeof areasIn !== 'object' || Array.isArray(areasIn)) return 'Invalid life areas';
  const areas: ValuesAnswers['areas'] = {};
  const scale = (v: unknown): number | null | undefined => {
    if (v === undefined || v === null) return null;
    return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10 ? v : undefined;
  };
  for (const key of Object.keys(areasIn)) if (!LIFE_AREAS.some(a => a.id === key)) return 'Unknown life area';
  for (const a of LIFE_AREAS) {
    const x = (areasIn[a.id] ?? {}) as Record<string, unknown>;
    if (typeof x !== 'object') return 'Invalid life area';
    const note = str(x.note, TEXT_LIMITS.areaNote);
    const importance = scale(x.importance);
    const living = scale(x.living);
    if (note === null) return `${a.name}: note is too long`;
    if (importance === undefined || living === undefined) return `${a.name}: scores must be 0 to 10`;
    areas[a.id] = { note, importance, living };
  }

  const stepIn = (r.step ?? {}) as Record<string, unknown>;
  if (typeof stepIn !== 'object' || Array.isArray(stepIn)) return 'Invalid step';
  const step = { action: '', value: '', obstacles: '', worth: '' };
  for (const k of Object.keys(step) as Array<keyof typeof step>) {
    const s = str(stepIn[k], TEXT_LIMITS.step);
    if (s === null) return 'Your small step is too long';
    step[k] = s;
  }

  return { ratings, ownValues, top: top as string[], neglected: neglected as string[], areas, step };
}
