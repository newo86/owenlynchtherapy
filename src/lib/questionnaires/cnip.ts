/**
 * Cooper–Norcross Inventory of Preferences–2 (C–NIP–2), UK version.
 *
 * © Mick Cooper & John C. Norcross. Licensed under CC BY-NC-ND 4.0: it may be
 * used freely in one's own practice, but NOT adapted. Item wording, the 3 to −3
 * response scale and the scoring cut-offs below are copied verbatim from the
 * UK form (C-NIP-2 v07 UK) and the developers' guidelines (May 2026). Do not
 * reword, reorder within a scale, or drop items.
 *
 * Scoring (guidelines, "Manual Scoring"): sum the items in each scale; the
 * left-hand pole scores positive (3, 2, 1), the right-hand pole negative.
 * UK benchmark norms mark roughly the outer 20% on each side as a "strong
 * preference" (supplemental table, UK row).
 */

export type CnipResponse = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export const CNIP_RESPONSES: CnipResponse[] = [3, 2, 1, 0, -1, -2, -3];

export interface CnipItem {
  id: string;
  left: string;
  right: string;
}

export interface CnipScale {
  id: 'pa_pr' | 'tl_ntl' | 'ws_pr' | 'bw_nbw' | 'in_ac' | 'ei_er' | 'tc_ntc';
  /** Short code used in the guidelines, e.g. "Pa–Pr". */
  code: string;
  /** Left (positive) pole and right (negative) pole names, guidelines wording. */
  leftPole: string;
  rightPole: string;
  /** Phrases from the form's scoring key. */
  leftStrong: string;
  rightStrong: string;
  /** UK cut-offs: score >= strongLeftMin is a strong left preference,
   *  score <= strongRightMax a strong right preference. */
  strongLeftMin: number;
  strongRightMax: number;
  items: CnipItem[];
}

export const CNIP_SCALES: CnipScale[] = [
  {
    id: 'pa_pr', code: 'Pa–Pr',
    leftPole: 'Focusing on the past', rightPole: 'Focusing on the present',
    leftStrong: 'strong preference for focusing on the past',
    rightStrong: 'strong preference for focusing on the present',
    strongLeftMin: 4, strongRightMax: -4,
    items: [
      { id: 'pa1', left: 'Explore my past experiences', right: 'Explore my current experiences' },
      { id: 'pa2', left: 'Concentrate on my early years', right: 'Concentrate on my recent experiences' },
      { id: 'pa3', left: 'Help me reflect on events from the past', right: 'Help me reflect on what I can do next' },
    ],
  },
  {
    id: 'tl_ntl', code: 'TL–NTL',
    leftPole: 'Therapist to lead', rightPole: 'Therapist not to lead',
    leftStrong: 'strong preference for therapist to lead',
    rightStrong: 'strong preference for therapist not to lead',
    strongLeftMin: 10, strongRightMax: -1,
    items: [
      { id: 'tl1', left: 'Direct the process of therapy', right: 'Allow the process of therapy to evolve naturally' },
      { id: 'tl2', left: 'Take a lead in therapy', right: 'Create space for me to lead' },
      { id: 'tl3', left: 'Plan what we do in sessions', right: 'Let session topics and activities emerge' },
      { id: 'tl4', left: 'Give structure to the therapy', right: 'Allow the therapy to be unstructured' },
      { id: 'tl5', left: 'Keep me focused', right: 'Give me space to explore things in my own way' },
    ],
  },
  {
    id: 'ws_pr', code: 'WS–PR',
    leftPole: 'Warm support', rightPole: 'Professional reserve',
    leftStrong: 'strong preference for warm support',
    rightStrong: 'strong preference for professional reserve',
    strongLeftMin: 8, strongRightMax: 2,
    items: [
      { id: 'ws1', left: 'Be personable with me', right: 'Be somewhat formal with me' },
      { id: 'ws2', left: 'Be friendly', right: 'Be reserved' },
      { id: 'ws3', left: 'Talk with me on a human level', right: 'Keep some professional distance' },
    ],
  },
  {
    id: 'bw_nbw', code: 'BW–NBW',
    leftPole: 'Between-session work', rightPole: 'No between-session work',
    leftStrong: 'strong preference for between-session work',
    rightStrong: 'strong preference for no between-session work',
    strongLeftMin: 6, strongRightMax: -3,
    items: [
      { id: 'bw1', left: 'Give me tasks to complete between sessions', right: 'Not give me tasks to complete between sessions' },
      { id: 'bw2', left: 'Give me ‘homework’ to do', right: 'Not give me ‘homework’ to do' },
      { id: 'bw3', left: 'Provide worksheets or exercises to complete outside sessions', right: 'Not provide any materials for outside work' },
    ],
  },
  {
    id: 'in_ac', code: 'In–Ac',
    leftPole: 'Focusing on insight', rightPole: 'Focusing on action',
    leftStrong: 'strong preference for focusing on awareness',
    rightStrong: 'strong preference for focusing on action',
    strongLeftMin: 6, strongRightMax: -3,
    items: [
      { id: 'in1', left: 'Help me focus on self-awareness', right: 'Help me focus on action' },
      { id: 'in2', left: 'Help me understand myself', right: 'Help me change myself' },
      { id: 'in3', left: 'Help me identify patterns in my behaviour', right: 'Help me change patterns in my behaviour' },
      { id: 'in4', left: 'Help me deepen my understanding of myself', right: 'Help me find practical strategies for addressing my problems' },
    ],
  },
  {
    id: 'ei_er', code: 'EI–ER',
    leftPole: 'Emotional intensity', rightPole: 'Emotional reserve',
    leftStrong: 'strong preference for emotional intensity',
    rightStrong: 'strong preference for emotional reserve',
    strongLeftMin: 10, strongRightMax: 2,
    items: [
      { id: 'ei1', left: 'Help me find ways to express emotions', right: 'Not help me to express emotions' },
      { id: 'ei2', left: 'Encourage me to express strong feelings', right: 'Not encourage me to express strong feelings' },
      { id: 'ei3', left: 'Go deeper in the exploration of emotions', right: 'Not go deeper in the exploration of emotions' },
      { id: 'ei4', left: 'Uncover deeper layers of feelings', right: 'Stay with my current feelings' },
    ],
  },
  {
    id: 'tc_ntc', code: 'TC–NTC',
    leftPole: 'Therapist to challenge', rightPole: 'Therapist not to challenge',
    leftStrong: 'strong preference for being challenged',
    rightStrong: 'strong preference for not being challenged',
    strongLeftMin: 6, strongRightMax: 0,
    items: [
      { id: 'tc1', left: 'Be challenging of my own beliefs and views', right: 'Not be challenging of my own beliefs and views' },
      { id: 'tc2', left: 'Question how I think about things', right: 'Accept how I think about things' },
      { id: 'tc3', left: 'Challenge how I feel about things', right: 'Accept how I feel about things' },
    ],
  },
];

export const CNIP_ITEMS: CnipItem[] = CNIP_SCALES.flatMap(s => s.items);

/** Part two: additional preferences to discuss (verbatim). */
export const CNIP_ADDITIONAL: Array<{ id: string; label: string }> = [
  { id: 'characteristics', label: 'A therapist of a particular gender, race/ethnicity, sexual orientation, religion, or other personal characteristic?' },
  { id: 'language', label: 'A therapist/counsellor who speaks a specific language that is most comfortable for you?' },
  { id: 'modality', label: 'Modality of therapy (e.g., individual, couple, family, or group therapy)?' },
  { id: 'orientation', label: 'Orientation of therapy (e.g., psychodynamic, cognitive, person-centred, or another approach)?' },
  { id: 'number', label: 'Number of therapy sessions (e.g., four, dependent on review, open-ended, or another arrangement)?' },
  { id: 'length', label: 'Length of therapy sessions (e.g., 50 minutes, 60 minutes, 90 minutes, or another duration)?' },
  { id: 'frequency', label: 'Frequency of therapy (e.g., twice weekly, weekly, monthly, ad hoc, or another schedule)?' },
  { id: 'medication', label: 'Medication, psychotherapy, or both in combination?' },
  { id: 'self_help', label: 'Use of self-help books, self-help groups, or computer programs in addition to therapy?' },
  { id: 'other', label: 'Any other strong preferences that come to mind? (Please feel free to raise these at any point in therapy.)' },
  { id: 'dislike', label: 'Anything that you would dislike or despise happening in your therapy or counselling?' },
];

/** Short labels for the dashboard (the full wording is shown on hover/expand). */
export const CNIP_ADDITIONAL_SHORT: Record<string, string> = {
  characteristics: 'Therapist characteristics',
  language: 'Language',
  modality: 'Modality',
  orientation: 'Orientation',
  number: 'Number of sessions',
  length: 'Session length',
  frequency: 'Frequency',
  medication: 'Medication / psychotherapy',
  self_help: 'Self-help alongside therapy',
  other: 'Other strong preferences',
  dislike: 'Something they’d dislike or despise',
};

export interface CnipAnswers {
  items: Record<string, CnipResponse>;
  additional: string[];
}

export type CnipBand = 'strong_left' | 'none' | 'strong_right';

export interface CnipScaleScore {
  id: CnipScale['id'];
  score: number;
  min: number;
  max: number;
  band: CnipBand;
}

export interface CnipScores {
  scales: CnipScaleScore[];
}

export function bandFor(scale: CnipScale, score: number): CnipBand {
  if (score >= scale.strongLeftMin) return 'strong_left';
  if (score <= scale.strongRightMax) return 'strong_right';
  return 'none';
}

export function scoreCnip(answers: CnipAnswers): CnipScores {
  return {
    scales: CNIP_SCALES.map(scale => {
      const score = scale.items.reduce((sum, item) => sum + (answers.items[item.id] ?? 0), 0);
      const max = scale.items.length * 3;
      return { id: scale.id, score, min: -max, max, band: bandFor(scale, score) };
    }),
  };
}

/**
 * Strictly parse untrusted answers from the public form. Every item must be
 * answered with an integer in −3..3; additional preferences must be known ids.
 * Returns null on anything unexpected.
 */
export function parseCnipAnswers(raw: unknown): CnipAnswers | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { items?: unknown; additional?: unknown };
  if (!r.items || typeof r.items !== 'object' || Array.isArray(r.items)) return null;
  const itemsIn = r.items as Record<string, unknown>;
  const items: Record<string, CnipResponse> = {};
  for (const item of CNIP_ITEMS) {
    const v = itemsIn[item.id];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < -3 || v > 3) return null;
    items[item.id] = v as CnipResponse;
  }
  if (Object.keys(itemsIn).length !== CNIP_ITEMS.length) return null;

  const additionalIn = r.additional ?? [];
  if (!Array.isArray(additionalIn)) return null;
  const known = new Set(CNIP_ADDITIONAL.map(a => a.id));
  const additional: string[] = [];
  for (const a of additionalIn) {
    if (typeof a !== 'string' || !known.has(a)) return null;
    if (!additional.includes(a)) additional.push(a);
  }
  return { items, additional };
}

// ── Plain-English summary for the dashboard ────────────────────────────────
// Written for the therapist, from the scored scales and the ticked extras.
// It names only STRONG preferences (outside the UK norm band), as the
// guidelines suggest: the scores start a conversation rather than set a plan.

/** What a strong preference at each pole asks of the therapist, finishing
 *  "would like a therapist who …". */
const SUMMARY_PHRASES: Record<CnipScale['id'], { left: string; right: string; neutral: string }> = {
  pa_pr:  { left: 'explores their past and early years', right: 'focuses on the present and what they can do next', neutral: 'focusing on the past or the present' },
  tl_ntl: { left: 'takes the lead and gives sessions structure', right: 'leaves space for them to lead and lets sessions unfold', neutral: 'who leads the sessions' },
  ws_pr:  { left: 'is warm, friendly and personable', right: 'keeps a more formal, professional distance', neutral: 'warmth or professional reserve' },
  bw_nbw: { left: 'gives tasks, worksheets or homework between sessions', right: 'doesn’t set work between sessions', neutral: 'work between sessions' },
  in_ac:  { left: 'helps them understand themselves and their patterns', right: 'focuses on action and practical strategies', neutral: 'insight or action' },
  ei_er:  { left: 'goes deeper into emotions and encourages expressing strong feelings', right: 'stays with their current feelings rather than going deeper', neutral: 'how deeply to explore emotions' },
  tc_ntc: { left: 'challenges how they think and feel', right: 'accepts how they think and feel rather than challenging it', neutral: 'being challenged' },
};

/** Lower-case labels for the extra topics, for use mid-sentence. */
const ADDITIONAL_PHRASES: Record<string, string> = {
  characteristics: 'a therapist with particular personal characteristics',
  language: 'the language therapy is in',
  modality: 'the type of therapy (individual, couple, family or group)',
  orientation: 'the therapy approach',
  number: 'how many sessions',
  length: 'session length',
  frequency: 'how often to meet',
  medication: 'medication alongside therapy',
  self_help: 'self-help alongside therapy',
  other: 'other strong preferences',
  dislike: 'something they would dislike or despise happening in therapy',
};

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * A short written summary, e.g. "Jane would like a therapist who takes the
 * lead and gives sessions structure, and is warm, friendly and personable…".
 * `name` is the client's first name (or "You" for the practitioner's test).
 * `previous`, when given, adds what changed since the earlier completion.
 */
export function summariseCnip(
  name: string,
  scores: CnipScaleScore[],
  additional: string[],
  previous?: { scores: CnipScaleScore[]; label: string },
): string[] {
  const you = name === 'You';
  const has = you ? 'have' : 'has';
  const sentences: string[] = [];

  const strong = CNIP_SCALES.flatMap((s, i) => {
    const b = scores[i]?.band;
    if (b === 'strong_left') return [SUMMARY_PHRASES[s.id].left];
    if (b === 'strong_right') return [SUMMARY_PHRASES[s.id].right];
    return [];
  });
  const neutral = CNIP_SCALES.filter((_, i) => scores[i]?.band === 'none').map(s => SUMMARY_PHRASES[s.id].neutral);

  if (strong.length === 0) {
    sentences.push(`${name} ${has} no strong preferences at the moment, so ${you ? 'you seem' : 'they seem'} open and flexible about how you work together. Worth checking that feels right, without suggesting there should be preferences.`);
  } else {
    sentences.push(`${name} would like a therapist who ${joinList(strong)}.`);
    if (neutral.length > 0) sentences.push(`No strong preference about ${joinList(neutral)}.`);
  }

  const extras = CNIP_ADDITIONAL.filter(a => additional.includes(a.id)).map(a => ADDITIONAL_PHRASES[a.id] ?? a.id);
  if (extras.length > 0) sentences.push(`${you ? 'You' : 'They'} would like to talk about ${joinList(extras)}.`);

  if (previous) {
    // Short pole names keep this to one readable line, however much moved.
    const pole = (sc: CnipScale, b: CnipBand) => (b === 'strong_left' ? sc.leftPole : sc.rightPole).toLowerCase();
    const gained: string[] = [];
    const dropped: string[] = [];
    const switched: string[] = [];
    CNIP_SCALES.forEach((sc, i) => {
      const was = previous.scores[i]?.band;
      const now = scores[i]?.band;
      if (!was || !now || was === now) return;
      if (was === 'none') gained.push(pole(sc, now));
      else if (now === 'none') dropped.push(pole(sc, was));
      else switched.push(`${pole(sc, was)} to ${pole(sc, now)}`);
    });
    const parts = [
      gained.length ? `now a strong preference for ${joinList(gained)}` : '',
      dropped.length ? `no longer a strong preference for ${joinList(dropped)}` : '',
      switched.length ? `switched from ${joinList(switched)}` : '',
    ].filter(Boolean);
    sentences.push(parts.length === 0
      ? `No change in strong preferences since ${previous.label}.`
      : `Since ${previous.label}: ${parts.join('; ')}.`);
  }
  // The practitioner's own test reads in the second person.
  return you
    ? sentences.map(t => t.replace(/\btheir\b/g, 'your').replace(/\bthem\b/g, 'you').replace(/\bthey\b/g, 'you'))
    : sentences;
}
