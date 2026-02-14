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
});
