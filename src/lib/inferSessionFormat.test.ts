import { describe, expect, it } from 'vitest';
import { inferSessionFormat } from './calendarSync';

describe('inferSessionFormat (calendar import)', () => {
  it('a Meet link means online, confirmed', () => {
    expect(inferSessionFormat({ title: 'Kieran session', hasVideo: true }, 'in_person'))
      .toEqual({ format: 'online', confirmed: true });
  });

  it('"in person", the venue or Capel Street means in person, confirmed', () => {
    for (const ev of [
      { title: 'Philip (in person)' },
      { title: 'Kieran in-person' },
      { title: 'Kieran session', location: '106 Capel Street, Dublin 1' },
      { title: 'Session at Insight Matters' },
    ]) {
      expect(inferSessionFormat(ev, 'online')).toEqual({ format: 'in_person', confirmed: true });
    }
  });

  it('"online" in the title means online, confirmed', () => {
    expect(inferSessionFormat({ title: 'Kieran online' }, 'in_person'))
      .toEqual({ format: 'online', confirmed: true });
  });

  it('17 Nov 2026 case: no link, no location, client was last online — NOT confirmed', () => {
    expect(inferSessionFormat({ title: 'Kieran session' }, 'online'))
      .toEqual({ format: 'online', confirmed: false });
  });

  it('nothing to go on and no history — in person placeholder, NOT confirmed', () => {
    expect(inferSessionFormat({ title: 'Kieran session' }, null))
      .toEqual({ format: 'in_person', confirmed: false });
  });
});
