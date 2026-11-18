import { describe, expect, it } from 'vitest';
import { createLruCache } from './lruCache';

describe('createLruCache (D4 bounded cache)', () => {
  it('returns undefined for a missing key and the stored value otherwise', () => {
    const cache = createLruCache<string>(2);
    expect(cache.get('a')).toBeUndefined();
    cache.set('a', 'alpha');
    expect(cache.get('a')).toBe('alpha');
  });

  it('keeps falsy values as hits', () => {
    const cache = createLruCache<number | string>(2);
    cache.set('zero', 0);
    cache.set('empty', '');
    expect(cache.get('zero')).toBe(0);
    expect(cache.get('empty')).toBe('');
  });

  it('evicts the least recently used key beyond capacity', () => {
    const cache = createLruCache<string>(2);
    cache.set('a', 'alpha');
    cache.set('b', 'beta');
    expect(cache.get('a')).toBe('alpha');
    cache.set('c', 'gamma');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('alpha');
    expect(cache.get('c')).toBe('gamma');
    expect(cache.size).toBe(2);
  });

  it('overwriting a key refreshes its value and recency without growing', () => {
    const cache = createLruCache<string>(2);
    cache.set('a', 'one');
    cache.set('b', 'beta');
    cache.set('a', 'two');
    expect(cache.size).toBe(2);
    cache.set('c', 'gamma');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('two');
  });

  it('rejects a capacity that is not a positive integer', () => {
    expect(() => createLruCache<string>(0)).toThrow(RangeError);
    expect(() => createLruCache<string>(1.5)).toThrow(RangeError);
  });
});
