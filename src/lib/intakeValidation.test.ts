import { describe, expect, it } from 'vitest';
import { NAME_RE, isValidPhone, filenameSlug } from './intakeValidation';

describe('intake name rule', () => {
  it.each(['Jane Durnin', "O'Brien", 'O’Brien', 'Seán Ó Néill', 'Łukasz Kowalski', 'Mary St. John', 'Anne-Marie'])(
    'accepts %s', name => expect(NAME_RE.test(name)).toBe(true));
  it.each(['J', 'Jane <script>', 'Jane123', 'a@b.com', 'Jane\nDurnin', 'Jane\u2028Durnin'])(
    'rejects %s', name => expect(NAME_RE.test(name)).toBe(false));
});

describe('intake phone rule', () => {
  it.each(['087 000 0000', '+353 87 000 0000', '01 234 5678', '07700 900000', '+44 7700 900000', '0044 7700 900000', '(087) 000-0000'])(
    'accepts %s', n => expect(isValidPhone(n)).toBe(true));
  it.each(['', '12345', 'phone', '+0 123456789', '087', '+353 87 000 0000 ext 5'])(
    'rejects %s', n => expect(isValidPhone(n)).toBe(false));
});

describe('filename slug', () => {
  it('is always header-safe ASCII', () => {
    for (const n of ['Łukasz Kowalski', 'O’Brien', 'Seán Ó Néill', '. .', 'Мария']) {
      expect(filenameSlug(n)).toMatch(/^[a-z0-9-]+$/);
    }
    expect(filenameSlug('Seán Ó Néill')).toBe('sean-o-neill');
    expect(filenameSlug('Мария')).toBe('client');
  });
});
