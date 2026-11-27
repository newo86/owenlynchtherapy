import { describe, it, expect } from 'vitest';
import { formatShortWhen, formatShortDay } from './dateUtils';

describe('formatShortWhen', () => {
  it('formats a winter instant in Dublin time', () => {
    expect(formatShortWhen('2026-11-24T16:00:00Z')).toBe('Tue 24 Nov, 4:00pm');
    expect(formatShortWhen('2026-11-27T15:30:00Z')).toBe('Fri 27 Nov, 3:30pm');
  });
  it('applies summer time', () => {
    expect(formatShortWhen('2026-07-07T16:00:00Z')).toBe('Tue 7 Jul, 5:00pm');
  });
  it('handles noon and morning', () => {
    expect(formatShortWhen('2026-11-24T12:05:00Z')).toBe('Tue 24 Nov, 12:05pm');
    expect(formatShortWhen('2026-11-24T09:00:00Z')).toBe('Tue 24 Nov, 9:00am');
  });
  it('day part only', () => {
    expect(formatShortDay('2026-11-24T16:00:00Z')).toBe('Tue 24 Nov');
  });
});
