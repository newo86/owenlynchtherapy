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
