import { describe, it, expect } from 'vitest';
import { CNIP_SCALES, CNIP_ITEMS, scoreCnip, parseCnipAnswers, bandFor, type CnipResponse } from './cnip';
import { VALUES, parseValuesAnswers, areaGaps } from './values';
import { sanitiseInput } from '@/lib/sanitise';

const allItems = (v: CnipResponse) => Object.fromEntries(CNIP_ITEMS.map(i => [i.id, v]));

describe('C–NIP–2', () => {
  it('has 25 items in 7 scales and 11 additional preferences, as on the form', () => {
    expect(CNIP_SCALES).toHaveLength(7);
    expect(CNIP_ITEMS).toHaveLength(25);
    expect(CNIP_SCALES.map(s => s.items.length)).toEqual([3, 5, 3, 3, 4, 4, 3]);
  });

  it('sums each scale, with the right-hand pole negative (guidelines example)', () => {
    const items = allItems(0);
    items.pa1 = 3; items.pa2 = 0; items.pa3 = -2; // 3 + 0 − 2 = 1
    items.ws1 = -2; items.ws2 = -3; items.ws3 = 2; // −3
    const s = scoreCnip({ items, additional: [] });
    expect(s.scales.find(x => x.id === 'pa_pr')!.score).toBe(1);
    expect(s.scales.find(x => x.id === 'ws_pr')!.score).toBe(-3);
    expect(s.scales.find(x => x.id === 'tl_ntl')!.max).toBe(15);
  });

  it('applies the UK cut-offs at their exact boundaries', () => {
    const byId = (id: string) => CNIP_SCALES.find(s => s.id === id)!;
    // Pa–Pr: 9 to 4 strong past, 3 to −3 none, −4 to −9 strong present
    expect(bandFor(byId('pa_pr'), 4)).toBe('strong_left');
    expect(bandFor(byId('pa_pr'), 3)).toBe('none');
    expect(bandFor(byId('pa_pr'), -3)).toBe('none');
    expect(bandFor(byId('pa_pr'), -4)).toBe('strong_right');
    // TL–NTL: 15 to 10, 9 to 0, −1 to −15
    expect(bandFor(byId('tl_ntl'), 10)).toBe('strong_left');
    expect(bandFor(byId('tl_ntl'), 0)).toBe('none');
    expect(bandFor(byId('tl_ntl'), -1)).toBe('strong_right');
    // WS–PR: 9 to 8, 7 to 3, 2 to −9
    expect(bandFor(byId('ws_pr'), 8)).toBe('strong_left');
    expect(bandFor(byId('ws_pr'), 3)).toBe('none');
    expect(bandFor(byId('ws_pr'), 2)).toBe('strong_right');
    // BW–NBW: 9 to 6, 5 to −2, −3 to −9
    expect(bandFor(byId('bw_nbw'), 6)).toBe('strong_left');
    expect(bandFor(byId('bw_nbw'), -2)).toBe('none');
    expect(bandFor(byId('bw_nbw'), -3)).toBe('strong_right');
    // In–Ac: 12 to 6, 5 to −2, −3 to −12
    expect(bandFor(byId('in_ac'), 6)).toBe('strong_left');
    expect(bandFor(byId('in_ac'), -3)).toBe('strong_right');
    // EI–ER: 12 to 10, 9 to 3, 2 to −12
    expect(bandFor(byId('ei_er'), 10)).toBe('strong_left');
    expect(bandFor(byId('ei_er'), 9)).toBe('none');
    expect(bandFor(byId('ei_er'), 2)).toBe('strong_right');
    // TC–NTC: 9 to 6, 5 to 1, 0 to −9
    expect(bandFor(byId('tc_ntc'), 6)).toBe('strong_left');
    expect(bandFor(byId('tc_ntc'), 1)).toBe('none');
    expect(bandFor(byId('tc_ntc'), 0)).toBe('strong_right');
  });

  it('rejects missing, extra, fractional or out-of-range answers', () => {
    expect(parseCnipAnswers({ items: allItems(0), additional: ['dislike'] })).not.toBeNull();
    const missing = allItems(0); delete (missing as Record<string, number>).tc3;
    expect(parseCnipAnswers({ items: missing })).toBeNull();
    expect(parseCnipAnswers({ items: { ...allItems(0), extra: 1 } })).toBeNull();
    expect(parseCnipAnswers({ items: { ...allItems(0), pa1: 4 } })).toBeNull();
    expect(parseCnipAnswers({ items: { ...allItems(0), pa1: 1.5 } })).toBeNull();
    expect(parseCnipAnswers({ items: allItems(0), additional: ['nope'] })).toBeNull();
  });
});

describe('Values worksheet', () => {
  const ratings = Object.fromEntries(VALUES.map(v => [v.id, 'very']));
  const base = {
    ratings,
    ownValues: {},
    top: ['honesty', 'love', 'courage', 'learning', 'fun', 'nature'],
    neglected: ['fun', 'nature'],
    areas: { health: { note: 'Move more', importance: 9, living: 3 }, fun: { note: '', importance: 6, living: 5 } },
    step: { action: 'Walk on Saturday', value: 'Nature', obstacles: '', worth: '' },
  };

  it('accepts a complete worksheet and fills blank life areas', () => {
    const r = parseValuesAnswers(base, sanitiseInput);
    expect(typeof r).toBe('object');
    if (typeof r === 'string') return;
    expect(r.areas.relationships).toEqual({ note: '', importance: null, living: null });
    expect(areaGaps(r.areas)[0]).toEqual({ id: 'health', gap: 6 });
  });

  it('requires exactly six distinct top values, none rated "not so important"', () => {
    expect(parseValuesAnswers({ ...base, top: base.top.slice(0, 5) }, sanitiseInput)).toBeTypeOf('string');
    expect(parseValuesAnswers({ ...base, top: [...base.top.slice(0, 5), 'love'] }, sanitiseInput)).toBeTypeOf('string');
    expect(parseValuesAnswers({ ...base, ratings: { ...ratings, fun: 'not' } }, sanitiseInput)).toBeTypeOf('string');
  });

  it('only allows up to three neglected values, all from the top six', () => {
    expect(parseValuesAnswers({ ...base, neglected: ['fun', 'nature', 'love', 'honesty'] }, sanitiseInput)).toBeTypeOf('string');
    expect(parseValuesAnswers({ ...base, neglected: ['trust'] }, sanitiseInput)).toBeTypeOf('string');
  });

  it('accepts a named own value in the top six, and strips markup from text', () => {
    const r = parseValuesAnswers({
      ...base,
      ownValues: { own1: '<b>Playfulness</b>' },
      ratings: { ...ratings, own1: 'very' },
      top: [...base.top.slice(0, 5), 'own1'],
      neglected: [],
    }, sanitiseInput);
    expect(typeof r).toBe('object');
    if (typeof r !== 'string') expect(r.ownValues.own1).toBe('Playfulness');
  });

  it('rejects unrated values, unknown ids and bad scores', () => {
    const partial = { ...ratings }; delete (partial as Record<string, string>).trust;
    expect(parseValuesAnswers({ ...base, ratings: partial }, sanitiseInput)).toBeTypeOf('string');
    expect(parseValuesAnswers({ ...base, ratings: { ...ratings, own2: 'very' } }, sanitiseInput)).toBeTypeOf('string');
    expect(parseValuesAnswers({ ...base, areas: { health: { importance: 11 } } }, sanitiseInput)).toBeTypeOf('string');
    expect(parseValuesAnswers({ ...base, areas: { bogus: {} } }, sanitiseInput)).toBeTypeOf('string');
  });
});

describe('Values results email', () => {
  it('escapes everything the client typed', async () => {
    const { buildValuesResultsHtml } = await import('@/lib/emailTemplates');
    const html = buildValuesResultsHtml({
      firstName: '<b>Jane</b>',
      top: [{ name: '<img src=x onerror=alert(1)>', desc: null, neglected: true }],
      areas: [{ name: 'Health and body', importance: 8, living: 3 }],
      step: { action: '<script>alert(1)</script>\nthen rest', value: 'Nature', obstacles: '', worth: '' },
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('<br>then rest');
    expect(html).toContain('Wanting more room right now');
  });
});

describe('C–NIP–2 written summary', () => {
  const withBands = (bands: Record<string, 'strong_left' | 'strong_right' | 'none'>) =>
    CNIP_SCALES.map(s => ({ id: s.id, score: 0, min: -9, max: 9, band: bands[s.id] ?? 'none' }));

  it('names strong preferences, neutral scales and topics to discuss', async () => {
    const { summariseCnip } = await import('./cnip');
    const out = summariseCnip('Jane', withBands({ tl_ntl: 'strong_left', bw_nbw: 'strong_right' }), ['frequency', 'dislike']);
    expect(out[0]).toBe('Jane would like a therapist who takes the lead and gives sessions structure and doesn’t set work between sessions.');
    expect(out[1]).toMatch(/^No strong preference about focusing on the past or the present, /);
    expect(out[2]).toBe('They would like to talk about how often to meet and something they would dislike or despise happening in therapy.');
  });

  it('says so gently when there are no strong preferences', async () => {
    const { summariseCnip } = await import('./cnip');
    expect(summariseCnip('Jane', withBands({}), [])[0]).toMatch(/^Jane has no strong preferences at the moment/);
  });

  it('reports band changes since the previous completion, with "you" grammar for tests', async () => {
    const { summariseCnip } = await import('./cnip');
    const prev = { scores: withBands({ ei_er: 'strong_left' }), label: '15 Sept 2026' };
    const out = summariseCnip('You', withBands({ tc_ntc: 'strong_left' }), [], prev);
    expect(out.at(-1)).toBe('Since 15 Sept 2026: now a strong preference for therapist to challenge; no longer a strong preference for emotional intensity.');
    expect(summariseCnip('Jane', withBands({}), [], { scores: withBands({}), label: '1 Oct 2026' }).at(-1))
      .toBe('No change in strong preferences since 1 Oct 2026.');
  });
});
