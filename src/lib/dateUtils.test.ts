import { describe, it, expect } from 'vitest';
import { formatShortWhen, formatShortDay } from './dateUtils';

describe('formatShortWhen', () => {
  it('formats a winter instant in Dublin time', () => {
    expect(formatShortWhen('2026-11-24T16:00:00Z')).toBe('Tue 24 Nov, 16:00');
    expect(formatShortWhen('2026-11-27T15:30:00Z')).toBe('Fri 27 Nov, 15:30');
  });
  it('applies summer time', () => {
    expect(formatShortWhen('2026-07-07T16:00:00Z')).toBe('Tue 7 Jul, 17:00');
  });
  it('handles noon, morning and midnight on the 24-hour clock', () => {
    expect(formatShortWhen('2026-11-24T12:05:00Z')).toBe('Tue 24 Nov, 12:05');
    expect(formatShortWhen('2026-11-24T09:00:00Z')).toBe('Tue 24 Nov, 09:00');
    expect(formatShortWhen('2026-11-24T00:30:00Z')).toBe('Tue 24 Nov, 00:30');
  });
  it('day part only', () => {
    expect(formatShortDay('2026-11-24T16:00:00Z')).toBe('Tue 24 Nov');
  });
});
