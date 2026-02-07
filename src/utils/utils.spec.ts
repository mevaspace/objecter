import { getNestedValue, setNestedValue, pathCache } from './nested-property.utils';
import { deepClone, isPlainObject } from './object.utils';

describe('nested-property.utils', () => {
  describe('Memory Leak Prevention', () => {
    it('should limit pathCache size to 1000', () => {
      pathCache.clear();

      // Add 1050 unique paths
      for (let i = 0; i < 1050; i++) {
        getNestedValue({}, `unique.path.${i}`);
      }

      // 0-999 (1000 items) added.
      // 1000th item: size is 1000 -> clear -> add 1 item. Size = 1.
      // 1001-1050: +50 items. Size should be around 51.
      expect(pathCache.size).toBeLessThan(1001);
      expect(pathCache.size).toBeGreaterThan(0);
    });
  });

  describe('getNestedValue', () => {
    it('should get simple property', () => {
      const obj = { name: 'John' };
      expect(getNestedValue(obj, 'name')).toBe('John');
    });

    it('should get nested property', () => {
      const obj = { user: { name: 'John' } };
      expect(getNestedValue(obj, 'user.name')).toBe('John');
    });

    it('should get deeply nested property', () => {
      const obj = { a: { b: { c: { d: 'value' } } } };
      expect(getNestedValue(obj, 'a.b.c.d')).toBe('value');
    });

    it('should return undefined for missing property', () => {
      const obj = { name: 'John' };
      expect(getNestedValue(obj, 'age')).toBeUndefined();
    });

    it('should return undefined for missing nested property', () => {
      const obj = { user: { name: 'John' } };
      expect(getNestedValue(obj, 'user.age')).toBeUndefined();
    });

    it('should return undefined for null/undefined object', () => {
      expect(getNestedValue(null, 'name')).toBeUndefined();
      expect(getNestedValue(undefined, 'name')).toBeUndefined();
    });

    it('should handle array index access', () => {
      const obj = { items: ['a', 'b', 'c'] };
      expect(getNestedValue(obj, 'items[1]')).toBe('b');
    });

    it('should handle nested array index', () => {
      const obj = { users: [{ name: 'John' }, { name: 'Jane' }] };
      expect(getNestedValue(obj, 'users[0].name')).toBe('John');
    });

    it('should return undefined when intermediate value is null', () => {
      const obj = { user: null };
      expect(getNestedValue(obj, 'user.name')).toBeUndefined();
    });

    it('should return undefined when traversing non-object', () => {
      const obj = { name: 'John' };
      expect(getNestedValue(obj, 'name.length.foo')).toBeUndefined();
    });

    it('should return undefined when array bracket access on non-array', () => {
      const obj = { items: 'not-array' };
      expect(getNestedValue(obj, 'items[0]')).toBeUndefined();
    });
  });

  describe('setNestedValue', () => {
    it('should set simple property', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'name', 'John');
      expect(obj.name).toBe('John');
    });

    it('should create nested structure', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'user.name', 'John');
      expect((obj.user as Record<string, unknown>).name).toBe('John');
    });

    it('should create deeply nested structure', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'a.b.c.d', 'value');
      const a = obj.a as Record<string, unknown>;
      const b = a.b as Record<string, unknown>;
      const c = b.c as Record<string, unknown>;
      expect(c.d).toBe('value');
    });

    it('should overwrite existing value', () => {
      const obj: Record<string, unknown> = { name: 'John' };
      setNestedValue(obj, 'name', 'Jane');
      expect(obj.name).toBe('Jane');
    });

    it('should set value with array index path', () => {
      const obj: Record<string, unknown> = {};
      setNestedValue(obj, 'users[0].name', 'John');
      const users = obj.users as Record<string, unknown>[];
      expect(users[0].name).toBe('John');
    });

    it('should set value on existing array', () => {
      const obj: Record<string, unknown> = { users: [{ name: 'Jane' }] };
      setNestedValue(obj, 'users[0].name', 'John');
      const users = obj.users as Record<string, unknown>[];
      expect(users[0].name).toBe('John');
    });

    it('should overwrite non-object intermediate value', () => {
      const obj: Record<string, unknown> = { user: 'string-not-object' };
      setNestedValue(obj, 'user.name', 'John');
      expect((obj.user as Record<string, unknown>).name).toBe('John');
    });

    it('should throw error on restricted keys (Prototype Pollution)', () => {
      const obj = {};
      expect(() => setNestedValue(obj, '__proto__.test', 1)).toThrow(/Security Error/);
      expect(() => setNestedValue(obj, 'constructor.test', 1)).toThrow(/Security Error/);
      expect(() => setNestedValue(obj, 'prototype.test', 1)).toThrow(/Security Error/);
    });
  });
});

describe('object.utils', () => {
  describe('isPlainObject', () => {
    it('should return true for plain objects', () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
    });

    it('should return false for arrays', () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject([1, 2, 3])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isPlainObject(null)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isPlainObject('string')).toBe(false);
      expect(isPlainObject(123)).toBe(false);
      expect(isPlainObject(true)).toBe(false);
    });
  });

  describe('deepClone', () => {
    it('should return primitives as-is', () => {
      expect(deepClone(123)).toBe(123);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
    });

    it('should clone plain objects', () => {
      const original = { a: 1, b: 2 };
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should clone nested objects', () => {
      const original = { a: { b: { c: 1 } } };
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned.a).not.toBe(original.a);
      expect(cloned.a.b).not.toBe(original.a.b);
    });

    it('should clone arrays', () => {
      const original = [1, 2, 3];
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should clone Date objects', () => {
      const original = new Date('2024-01-01');
      const cloned = deepClone(original);
      expect(cloned.getTime()).toBe(original.getTime());
      expect(cloned).not.toBe(original);
    });

    it('should prevent mutation of source', () => {
      const original = { nested: { value: 1 } };
      const cloned = deepClone(original);
      cloned.nested.value = 2;
      expect(original.nested.value).toBe(1);
    });

    it('should clone Date objects correctly', () => {
      const date = new Date('2023-01-01');
      const cloned = deepClone(date);
      expect(cloned).not.toBe(date);
      expect(cloned.getTime()).toBe(date.getTime());
    });

    it('should handle circular references correctly (structuredClone supports them)', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      const cloned = deepClone(circular);
      expect(cloned).not.toBe(circular);
      expect(cloned.self).toBe(cloned);
      expect(cloned.a).toBe(1);
    });

    it('should clone Sets and Maps', () => {
      const map = new Map([['a', 1]]);
      const set = new Set([1, 2, 3]);

      const clonedMap = deepClone(map);
      const clonedSet = deepClone(set);

      expect(clonedMap).not.toBe(map);
      expect(clonedMap.get('a')).toBe(1);

      expect(clonedSet).not.toBe(set);
      expect(clonedSet.has(1)).toBe(true);
    });
  });
});
