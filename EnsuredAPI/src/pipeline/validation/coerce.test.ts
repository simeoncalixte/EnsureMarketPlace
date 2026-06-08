import { toRecord, asText, asNumber, toList, firstNonEmpty } from './coerce';

describe('toRecord', () => {
  test('passes through objects, collapses non-objects to {}', () => {
    const obj = { a: 1 };
    expect(toRecord(obj)).toBe(obj);
    expect(toRecord(null)).toEqual({});
    expect(toRecord(undefined)).toEqual({});
    expect(toRecord(42)).toEqual({});
    expect(toRecord('x')).toEqual({});
  });
});

describe('asText', () => {
  test.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['   ', null],
    ['  hi  ', 'hi'],
    [42, '42'],
    [false, 'false'],
  ])('asText(%p) -> %p', (input, expected) => {
    expect(asText(input)).toBe(expected);
  });
});

describe('asNumber', () => {
  test.each([
    [null, null],
    [undefined, null],
    ['', null],
    ['abc', null],
    [Number.NaN, null],
    [Number.POSITIVE_INFINITY, null],
    ['12.5', 12.5],
    [0, 0],
    [7, 7],
  ])('asNumber(%p) -> %p', (input, expected) => {
    expect(asNumber(input)).toBe(expected);
  });
});

describe('toList', () => {
  test('non-arrays become []', () => {
    expect(toList(null)).toEqual([]);
    expect(toList('wind')).toEqual([]);
    expect(toList({})).toEqual([]);
  });
  test('arrays are lowercased, trimmed, de-blanked', () => {
    expect(toList(['Wind', '  Storm ', '', '  '])).toEqual(['wind', 'storm']);
    expect(toList([1, 2])).toEqual(['1', '2']);
  });
});

describe('firstNonEmpty', () => {
  test('skips null/undefined/blank, returns first populated', () => {
    expect(firstNonEmpty(null, undefined, '  ', 'x')).toBe('x');
    expect(firstNonEmpty(0)).toBe(0); // 0 is populated
    expect(firstNonEmpty(false)).toBe(false);
    expect(firstNonEmpty(null, undefined)).toBeUndefined();
    expect(firstNonEmpty()).toBeUndefined();
  });
});
