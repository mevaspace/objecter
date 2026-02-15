import { getNestedValue, setNestedValue, pathCache } from '../../../src/utils/nested-property.utils';

beforeEach(() => {
  pathCache.clear();
});

describe('getNestedValue', () => {
  it('should get top-level property', () => {
    expect(getNestedValue({ name: 'John' }, 'name')).toBe('John');
  });

  it('should get nested property with dot notation', () => {
    expect(getNestedValue({ user: { name: 'John' } }, 'user.name')).toBe('John');
  });

  it('should get deeply nested property', () => {
    const obj = { a: { b: { c: { d: 'deep' } } } };
    expect(getNestedValue(obj, 'a.b.c.d')).toBe('deep');
  });

  it('should handle array index access with bracket notation', () => {
    const obj = { items: ['a', 'b', 'c'] };
    expect(getNestedValue(obj, 'items[1]')).toBe('b');
  });

  it('should handle nested array index access', () => {
    const obj = { data: { items: [{ name: 'first' }] } };
    expect(getNestedValue(obj, 'data.items[0].name')).toBe('first');
  });

  it('should return undefined for null source', () => {
    expect(getNestedValue(null, 'any')).toBeUndefined();
  });

  it('should return undefined for undefined source', () => {
    expect(getNestedValue(undefined, 'any')).toBeUndefined();
  });

  it('should return undefined for missing key', () => {
    expect(getNestedValue({ a: 1 }, 'b')).toBeUndefined();
  });

  it('should return undefined when intermediate is null', () => {
    expect(getNestedValue({ a: null }, 'a.b')).toBeUndefined();
  });

  it('should return undefined when intermediate is non-object', () => {
    expect(getNestedValue({ a: 42 }, 'a.b')).toBeUndefined();
  });

  it('should return undefined when array index target is not an array', () => {
    expect(getNestedValue({ items: 'not-array' }, 'items[0]')).toBeUndefined();
  });

  it('should cache path parts and reuse them', () => {
    getNestedValue({ a: { b: 1 } }, 'a.b');
    expect(pathCache.has('a.b')).toBe(true);

    getNestedValue({ a: { b: 2 } }, 'a.b');
    expect(pathCache.size).toBe(1);
  });

  it('should clear cache when exceeding 1000 entries', () => {
    for (let i = 0; i < 1000; i++) {
      getNestedValue({}, `path_${i}`);
    }
    expect(pathCache.size).toBe(1000);

    getNestedValue({}, 'overflow_key');
    expect(pathCache.size).toBe(1);
    expect(pathCache.has('overflow_key')).toBe(true);
  });
});

describe('setNestedValue', () => {
  it('should set top-level property', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'name', 'John');
    expect(obj.name).toBe('John');
  });

  it('should set nested property and create intermediates', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'user.name', 'John');
    expect((obj.user as Record<string, unknown>).name).toBe('John');
  });

  it('should set deeply nested property', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'a.b.c', 'deep');
    expect(getNestedValue(obj, 'a.b.c')).toBe('deep');
  });

  it('should handle array index notation', () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, 'items[0].name', 'first');
    expect(getNestedValue(obj, 'items[0].name')).toBe('first');
  });

  it('should overwrite existing non-object intermediate', () => {
    const obj: Record<string, unknown> = { a: 'string' };
    setNestedValue(obj, 'a.b', 'value');
    expect(getNestedValue(obj, 'a.b')).toBe('value');
  });

  it('should throw on __proto__ key', () => {
    const obj: Record<string, unknown> = {};
    expect(() => setNestedValue(obj, '__proto__.polluted', true)).toThrow('Security Error');
  });

  it('should throw on constructor key', () => {
    const obj: Record<string, unknown> = {};
    expect(() => setNestedValue(obj, 'constructor.polluted', true)).toThrow('Security Error');
  });

  it('should throw on prototype key', () => {
    const obj: Record<string, unknown> = {};
    expect(() => setNestedValue(obj, 'prototype.polluted', true)).toThrow('Security Error');
  });

  it('should throw on prototype pollution in final key', () => {
    const obj: Record<string, unknown> = {};
    expect(() => setNestedValue(obj, '__proto__', 'bad')).toThrow('Security Error');
  });

  it('should throw on prototype pollution in array key', () => {
    const obj: Record<string, unknown> = {};
    expect(() => setNestedValue(obj, '__proto__[0].x', 'bad')).toThrow('Security Error');
  });
});
