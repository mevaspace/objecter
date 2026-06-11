import { isPlainObject, deepClone } from '../../../src/utils/object.utils';

describe('isPlainObject', () => {
  it('should return true for plain objects', () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('should return true for objects created with Object.create(null)', () => {
    expect(isPlainObject(Object.create(null))).toBe(true);
  });

  it('should return false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('should return false for arrays', () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2])).toBe(false);
  });

  it('should return false for primitives', () => {
    expect(isPlainObject('string')).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });

  it('should return true for class instances (they are still objects)', () => {
    class Foo {}
    expect(isPlainObject(new Foo())).toBe(true);
  });
});

describe('deepClone', () => {
  it('should return null and undefined as-is', () => {
    expect(deepClone(null)).toBeNull();
    expect(deepClone(undefined)).toBeUndefined();
  });

  it('should return primitives as-is', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
  });

  it('should deep clone objects without reference sharing', () => {
    const original = { nested: { value: 1 }, arr: [1, 2] };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.nested).not.toBe(original.nested);
    expect(cloned.arr).not.toBe(original.arr);
  });

  it('should deep clone arrays', () => {
    const original = [{ id: 1 }, { id: 2 }];
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned[0]).not.toBe(original[0]);
  });

  it('should deep clone Date objects', () => {
    const original = new Date('2026-01-01');
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
  });

  it('should deep clone RegExp objects', () => {
    const original = /abc/gi;
    original.lastIndex = 2;
    const cloned = deepClone(original);
    expect(cloned).not.toBe(original);
    expect(cloned.source).toBe('abc');
    expect(cloned.flags).toBe('gi');
    expect(cloned.lastIndex).toBe(2);
  });

  it('should preserve prototype for custom class instances', () => {
    class Foo {
      x = 10;
      y = 20;
    }
    const original = new Foo();
    original.x = 99;
    const cloned = deepClone(original);
    expect(cloned).not.toBe(original);
    expect(cloned).toBeInstanceOf(Foo);
    expect(cloned.x).toBe(99);
    expect(cloned.y).toBe(20);
  });

  it('should block __proto__ pollution', () => {
    const malicious = JSON.parse('{"__proto__":{"polluted":true}}') as Record<string, unknown>;
    const cloned = deepClone(malicious);
    const clean = {} as Record<string, unknown>;
    expect(clean['polluted']).toBeUndefined();
    expect(cloned).not.toBe(malicious);
  });

  it('should ignore own enumerable __proto__ key on custom class instances', () => {
    class Foo {
      x = 1;
    }
    const original = new Foo();
    Object.defineProperty(original, '__proto__', {
      value: { polluted: true },
      configurable: true,
      enumerable: true,
      writable: true,
    });

    const cloned = deepClone(original);
    expect(cloned).toBeInstanceOf(Foo);
    expect(cloned.x).toBe(1);
    expect(Object.getPrototypeOf(cloned)).toBe(Foo.prototype);
    expect(Object.prototype.hasOwnProperty.call(cloned, '__proto__')).toBe(false);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('should throw on circular reference', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj['self'] = obj;
    expect(() => deepClone(obj, true)).toThrow('Circular reference detected during deep clone');
  });

  it('should return function values as-is (by reference)', () => {
    const fn = () => 42;
    expect(deepClone(fn)).toBe(fn);
  });

  it('should deep clone deeply nested objects', () => {
    const original = { a: { b: { c: { d: { e: 'deep' } } } } };
    const cloned = deepClone(original);
    expect(cloned).toEqual(original);
    expect(cloned.a.b.c.d).not.toBe(original.a.b.c.d);
    cloned.a.b.c.d.e = 'mutated';
    expect(original.a.b.c.d.e).toBe('deep');
  });
});
