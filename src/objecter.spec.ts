import { Objecter } from './objecter';
import { MappingError, ValidationError } from './errors';
import { Validators } from './validators';
import { Transformers } from './transformers';
import { Validator } from './types/validator.type';

class SourceClass {
  id: number = 0;
  name: string = '';
  email: string = '';
  password: string = '';
}

class TargetClass {
  id: number = 0;
  name: string = '';
  email: string = '';
}

class Address {
  street: string = '';
  city: string = '';
}

class UserWithAddress {
  name: string = '';
  address: Address = new Address();
}

describe('Objecter', () => {
  describe('convert', () => {
    it('should convert basic fields', () => {
      const source = { id: 1, name: 'John', email: 'john@example.com', password: 'secret' };
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
      ];

      const result = Objecter.convert(source, TargetClass, mapping);

      expect(result).toBeInstanceOf(TargetClass);
      expect(result.id).toBe(1);
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    it('should apply transform function', () => {
      const source = { id: 1, name: 'john', email: 'JOHN@EXAMPLE.COM' };
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name', transform: (v: string) => v.toUpperCase() },
        { from: 'email', to: 'email', transform: (v: string) => v.toLowerCase() },
      ];

      const result = Objecter.convert(source, TargetClass, mapping);

      expect(result.name).toBe('JOHN');
      expect(result.email).toBe('john@example.com');
    });

    it('should use default value for missing field', () => {
      const source = { id: 1, name: 'John' };
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email', defaultValue: 'default@example.com' },
      ];

      const result = Objecter.convert(source, TargetClass, mapping);

      expect(result.email).toBe('default@example.com');
    });

    it('should throw for null source', () => {
      expect(() => Objecter.convert(null, TargetClass, [])).toThrow(MappingError);
    });

    it('should throw for missing required field', () => {
      const source = { id: 1, name: 'John' };
      const mapping = [{ from: 'email', to: 'email' }];

      expect(() => Objecter.convert(source, TargetClass, mapping)).toThrow(MappingError);
    });

    it('should not throw for optional field', () => {
      const source = { id: 1, name: 'John' };
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email', optional: true },
      ];

      const result = Objecter.convert(source, TargetClass, mapping);
      expect(result.id).toBe(1);
    });

    it('should skip field when skipIfNull is true and value is null', () => {
      const source = { id: 1, name: 'John', email: null };
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email', skipIfNull: true },
      ];

      const result = Objecter.convert(source, TargetClass, mapping);
      expect(result.email).toBe('');
    });

    it('should handle nested path access', () => {
      const source = { user: { id: 1 } };
      const mapping = [{ from: 'user.id', to: 'id' }];

      const result = Objecter.convert(source, TargetClass, mapping);
      expect(result.id).toBe(1);
    });

    it('should handle nested object mapping', () => {
      const source = { name: 'John', address: { street: '123 Main St', city: 'NYC' } };
      const mapping = [
        { from: 'name', to: 'name' },
        {
          from: 'address',
          to: 'address',
          transform: Objecter.createMapper(Address, [
            { from: 'street', to: 'street' },
            { from: 'city', to: 'city' },
          ]),
        },
      ];

      const result = Objecter.convert(source, UserWithAddress, mapping);
      expect(result.address).toBeInstanceOf(Address);
      expect(result.address.street).toBe('123 Main St');
      expect(result.address.city).toBe('NYC');
    });

    it('should run validation and throw on failure', () => {
      const source = { id: 1, name: 'John', email: 'invalid-email' };
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email', validate: Validators.pattern(/^.+@.+\..+$/) },
      ];

      expect(() => Objecter.convert(source, TargetClass, mapping)).toThrow(ValidationError);
    });

    it('should pass validation for valid data', () => {
      const source = { id: 1, name: 'John', email: 'john@example.com' };
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email', validate: Validators.pattern(/^.+@.+\..+$/) },
      ];

      const result = Objecter.convert(source, TargetClass, mapping);
      expect(result.email).toBe('john@example.com');
    });

    it('should use builtin transformers', () => {
      const source = { id: '123', name: '  john  ', email: 'JOHN@EXAMPLE.COM' };
      const mapping = [
        { from: 'id', to: 'id', transform: Transformers.toNumber() },
        { from: 'name', to: 'name', transform: Transformers.trim() },
        { from: 'email', to: 'email', transform: Transformers.toLowerCase() },
      ];

      const result = Objecter.convert(source, TargetClass, mapping);
      expect(result.id).toBe(123);
      expect(result.name).toBe('john');
      expect(result.email).toBe('john@example.com');
    });
  });

  describe('convertArray', () => {
    it('should convert array of objects', () => {
      const sources = [
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ];
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
      ];

      const results = Objecter.convertArray(sources, TargetClass, mapping);

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('John');
      expect(results[1].name).toBe('Jane');
    });

    it('should throw for non-array', () => {
      expect(() => Objecter.convertArray('not array' as any, TargetClass, [])).toThrow(MappingError);
    });
  });

  describe('convertArrayGenerator', () => {
    it('should yield items via generator', () => {
      const sources = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const mapping = [{ from: 'id', to: 'id' }];

      const generator = Objecter.convertArrayGenerator(sources, TargetClass, mapping);

      const results: TargetClass[] = [];
      for (const item of generator) {
        results.push(item);
      }

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe(1);
      expect(results[2].id).toBe(3);
    });

    it('should throw correct error in generator', () => {
      const sources = [{ id: 1 }, { id: null }]; // 2nd item invalid
      const mapping = [{ from: 'id', to: 'id' }];

      const generator = Objecter.convertArrayGenerator(sources, TargetClass, mapping);

      // First item ok
      expect(generator.next().value.id).toBe(1);

      // Second item throws
      expect(() => generator.next()).toThrow('Error at index 1');
    });
  });
  describe('Strict Mapping', () => {
    class StrictTarget {
      exists: string = '';
    }

    it('should throw when mapping to non-existent property in strict mode', () => {
      const source = { val: 'test' };
      const mapping = [{ from: 'val', to: 'nonExistent' }];

      // Strict mapping is true by default
      expect(() => Objecter.convert(source, StrictTarget, mapping)).toThrow(/Strict mapping failed/);
    });

    it('should allow mapping to non-existent property when strictMapping is false', () => {
      const source = { val: 'test' };
      const mapping = [{ from: 'val', to: 'nonExistent' }];

      const result = Objecter.convert(source, StrictTarget, mapping, { strictMapping: false });
      expect((result as any).nonExistent).toBe('test');
    });

    it('should allow mapping to existing property', () => {
      const source = { val: 'test' };
      const mapping = [{ from: 'val', to: 'exists' }];

      const result = Objecter.convert(source, StrictTarget, mapping);
      expect(result.exists).toBe('test');
    });
  });
  describe('createMapper', () => {
    it('should create reusable mapper', () => {
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
      ];

      const mapper = Objecter.createMapper<SourceClass, TargetClass>(TargetClass, mapping);

      const source = { id: 1, name: 'John', email: 'john@example.com', password: 'secret' };
      const result = mapper(source);

      expect(result).toBeInstanceOf(TargetClass);
      expect(result.name).toBe('John');
    });

    it('should be usable as a transform function', () => {
      const subMapping = [{ from: 'name' }];
      const subMapper = Objecter.createMapper(TargetClass, subMapping);

      const source = { sub: { name: 'SubItem' } };
      const mainMapping = [{ from: 'sub', to: 'sub', transform: subMapper }];

      class MainTarget {
        sub: TargetClass = new TargetClass();
      }

      const result = Objecter.convert(source, MainTarget, mainMapping);
      expect(result.sub).toBeInstanceOf(TargetClass);
      expect(result.sub.name).toBe('SubItem');
    });
  });

  describe('createArrayMapper', () => {
    it('should create reusable array mapper', () => {
      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
      ];

      const mapper = Objecter.createArrayMapper<SourceClass, TargetClass>(TargetClass, mapping);

      const sources = [
        { id: 1, name: 'John', email: 'john@example.com', password: 'secret' },
        { id: 2, name: 'Jane', email: 'jane@example.com', password: 'secret' },
      ];
      const results = mapper(sources);

      expect(results).toHaveLength(2);
    });

    it('should be usable as a transform function for arrays', () => {
      const subMapping = [{ from: 'name' }];
      const subArrayMapper = Objecter.createArrayMapper(TargetClass, subMapping);

      const source = { subs: [{ name: 'Item1' }, { name: 'Item2' }] };

      class MainTarget {
        subs: TargetClass[] = [];
      }

      const mainMapping = [{ from: 'subs', to: 'subs', transform: subArrayMapper }];

      const result = Objecter.convert(source, MainTarget, mainMapping);
      expect(result.subs).toHaveLength(2);
      expect(result.subs[0]).toBeInstanceOf(TargetClass);
      expect(result.subs[0].name).toBe('Item1');
    });
  });

  describe('merge', () => {
    it('should merge multiple sources', () => {
      const source1 = { id: 1 };
      const source2 = { name: 'John' };
      const source3 = { email: 'john@example.com' };

      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
        { from: 'email', to: 'email' },
      ];

      const result = Objecter.merge([source1, source2, source3], TargetClass, mapping);

      expect(result.id).toBe(1);
      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
    });

    it('should override with later sources', () => {
      const source1 = { id: 1, name: 'John' };
      const source2 = { name: 'Jane' };

      const mapping = [
        { from: 'id', to: 'id' },
        { from: 'name', to: 'name' },
      ];

      const result = Objecter.merge([source1, source2], TargetClass, mapping);

      expect(result.name).toBe('Jane');
    });
  });

  describe('toPlainObject', () => {
    it('should convert to plain object without mapping', () => {
      const source = new SourceClass();
      source.id = 1;
      source.name = 'John';

      const result = Objecter.toPlainObject(source);

      expect(result).toEqual({ id: 1, name: 'John', email: '', password: '' });
    });

    it('should convert with mapping', () => {
      const source = { id: 1, name: 'John', extra: 'ignored' };
      const mapping = [
        { from: 'id', to: 'userId' },
        { from: 'name', to: 'userName' },
      ];

      const result = Objecter.toPlainObject(source, mapping);

      expect(result).toEqual({ userId: 1, userName: 'John' });
    });

    it('should throw for null source', () => {
      expect(() => Objecter.toPlainObject(null)).toThrow(MappingError);
    });
  });

  describe('autoMap option', () => {
    it('should auto-map same-name properties', () => {
      const source = { id: 1, name: 'John', email: 'john@example.com' };
      const mapping = [{ from: 'name', to: 'name', transform: (v: string) => v.toUpperCase() }];

      const result = Objecter.convert(source, TargetClass, mapping, { autoMap: true });

      expect(result.id).toBe(1);
      expect(result.name).toBe('JOHN');
      expect(result.email).toBe('john@example.com');
    });

    it('should ignore unmapped source properties and use target schema (Optimization)', () => {
      // Create a massive source object
      const source: any = { targetProp: 'value' };
      for (let i = 0; i < 50000; i++) {
        source[`extra_${i}`] = i;
      }

      class Target {
        targetProp: string = '';
      }

      const result = Objecter.convert(source, Target, [], { autoMap: true });

      expect(result.targetProp).toBe('value');
      expect((result as any).extra_0).toBeUndefined();
    });
  });

  describe('Error Path Context', () => {
    it('should include full nested path in MappingError', () => {
      class Child {
        val: number = 0;
      }
      class Parent {
        child: Child = new Child();
      }

      const source = {
        child: {
          val: 'not-a-number', // Should fail transformation
        },
      };

      const mapping = [
        {
          from: 'child',
          transform: Objecter.createMapper(Child, [{ from: 'val', transform: Transformers.toNumber() }]),
        },
      ];

      try {
        Objecter.convert(source, Parent, mapping);
        throw new Error('Should have thrown MappingError');
      } catch (e) {
        if (e instanceof MappingError) {
          expect(e.field).toBe('child.val');
          expect(e.message).toContain('child.val');
        } else {
          throw e;
        }
      }
    });

    it('should bubble up array index paths', () => {
      class Child {
        val: number = 0;
      }
      class Parent {
        children: Child[] = [];
      }

      const source = { children: [{ val: 1 }, { val: 'bad' }] };

      const mapping = [
        {
          from: 'children',
          transform: Objecter.createArrayMapper(Child, [{ from: 'val', transform: Transformers.toNumber() }]),
        },
      ];

      try {
        Objecter.convert(source, Parent, mapping);
        throw new Error('Should have thrown MappingError');
      } catch (e) {
        if (e instanceof MappingError) {
          expect(e.field).toBe('children.[1].val');
        } else {
          throw e;
        }
      }
    });
  });

  describe('Flexible Validation', () => {
    class Source {
      value: any;
    }

    class Target {
      value: any;
    }

    it('should support custom predicate function (boolean return)', () => {
      const isAdult: Validator<number> = (age) => age >= 18;

      const mapping = [{ from: 'value', validate: isAdult }];

      const source = new Source();
      source.value = 20;

      const result = Objecter.convert(source, Target, mapping);
      expect(result.value).toBe(20);

      source.value = 10;
      expect(() => Objecter.convert(source, Target, mapping)).toThrow(/value is invalid/);
    });

    it('should support Zod-like schemas', () => {
      const zodSchema = {
        safeParse: (data: unknown) => {
          if (typeof data === 'string' && data.length > 3) {
            return { success: true };
          }
          return { success: false, error: { errors: [{ message: 'Too short' }] } };
        },
      };

      const mapping = [{ from: 'value', validate: zodSchema }];

      const source = new Source();
      source.value = 'long enough';

      const result = Objecter.convert(source, Target, mapping);
      expect(result.value).toBe('long enough');

      source.value = 'sho';
      expect(() => Objecter.convert(source, Target, mapping)).toThrow(/value: Too short/);
    });

    it('should still support legacy ValidateFn', () => {
      const legacyValidator: Validator<number> = (val, fieldName) => ({
        valid: val > 0,
        errors: val <= 0 ? [`${fieldName} must be positive`] : undefined,
      });

      const mapping = [{ from: 'value', validate: legacyValidator }];

      const source = new Source();
      source.value = 5;

      const result = Objecter.convert(source, Target, mapping);
      expect(result.value).toBe(5);

      source.value = -5;
      expect(() => Objecter.convert(source, Target, mapping)).toThrow(/value must be positive/);
    });

    it('should support mixed validators', () => {
      const isNumber: Validator<number> = (val) => typeof val === 'number';
      const isPositive: Validator<number> = (val, field) => ({
        valid: val > 0,
        errors: val <= 0 ? [`${field} not positive`] : undefined,
      });

      const mapping = [{ from: 'value', validate: [isNumber, isPositive] }];

      const source = new Source();
      source.value = 10;
      expect(Objecter.convert(source, Target, mapping).value).toBe(10);

      source.value = 'not number';
      expect(() => Objecter.convert(source, Target, mapping)).toThrow(/value is invalid/);

      source.value = -10;
      expect(() => Objecter.convert(source, Target, mapping)).toThrow(/value not positive/);
    });
  });

  describe('Stress Tests', () => {
    it('should handle deep nesting (15 levels)', () => {
      // Create deeply nested source
      let source: any = { value: 'deep' };
      for (let i = 0; i < 15; i++) {
        source = { nested: source };
      }

      class DeepTarget {
        value: string = '';
      }

      const mapping = [
        {
          from: 'nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.nested.value',
          to: 'value',
        },
      ];

      const result = Objecter.convert(source, DeepTarget, mapping);
      expect(result.value).toBe('deep');
    });

    it('should handle very long property paths', () => {
      const pathParts = new Array(50).fill('a').join('.');
      let source: any = { value: 'found' };
      for (let i = 49; i >= 0; i--) {
        source = { a: source };
      }

      class Target {
        result: string = '';
      }

      const mapping = [{ from: `${pathParts}.value`, to: 'result' }];
      const result = Objecter.convert(source, Target, mapping);
      expect(result.result).toBe('found');
    });

    it('should handle large arrays efficiently with generator', () => {
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({ id: i, name: `Item${i}` }));

      class Item {
        id: number = 0;
        name: string = '';
      }

      const mapping = [{ from: 'id' }, { from: 'name' }];
      const generator = Objecter.convertArrayGenerator(largeArray, Item, mapping);

      const results: Item[] = [];
      for (const item of generator) {
        results.push(item);
        if (results.length >= 100) break;
      }

      expect(results.length).toBe(100);
      expect(results[0].id).toBe(0);
      expect(results[99].id).toBe(99);
    });
  });

  describe('AutoMap Edge Cases', () => {
    it('should skip undefined values when copyUndefined is false', () => {
      class Target {
        existing: string = 'default';
        another: number = 0;
      }

      const source = { existing: undefined, another: 42 };
      const result = Objecter.convert(source, Target, [], { autoMap: true, copyUndefined: false });

      expect(result.existing).toBe('default');
      expect(result.another).toBe(42);
    });

    it('should copy undefined values when copyUndefined is true', () => {
      class Target {
        existing: string = 'default';
      }

      const source = { existing: undefined };
      const result = Objecter.convert(source, Target, [], { autoMap: true, copyUndefined: true });

      expect(result.existing).toBeUndefined();
    });

    it('should not auto-map properties not in source', () => {
      class Target {
        a: string = 'default-a';
        b: string = 'default-b';
      }

      const source = { a: 'from-source' };
      const result = Objecter.convert(source, Target, [], { autoMap: true });

      expect(result.a).toBe('from-source');
      expect(result.b).toBe('default-b');
    });

    it('should skip constructor property in autoMap', () => {
      class Target {
        value: string = '';
      }

      const source = { value: 'test', constructor: 'malicious' };
      const result = Objecter.convert(source, Target, [], { autoMap: true });

      expect(result.value).toBe('test');
      expect(result.constructor).toBe(Target);
    });
  });

  describe('Merge Edge Cases', () => {
    it('should handle null/undefined sources in merge array', () => {
      class Target {
        a: number = 0;
        b: string = '';
      }

      const result = Objecter.merge([null, { a: 1 }, undefined, { b: 'test' }], Target, [{ from: 'a' }, { from: 'b' }]);

      expect(result.a).toBe(1);
      expect(result.b).toBe('test');
    });

    it('should handle primitive values in merge array (ignored)', () => {
      class Target {
        a: number = 0;
      }

      const result = Objecter.merge(['string', 123, { a: 42 }], Target, [{ from: 'a' }]);

      expect(result.a).toBe(42);
    });
  });

  describe('Generator Edge Cases', () => {
    it('should throw for non-array in generator', () => {
      expect(() => {
        const gen = Objecter.convertArrayGenerator('not array' as any, TargetClass, []);
        gen.next();
      }).toThrow(MappingError);
    });

    it('should wrap transform errors in MappingError with context', () => {
      class BadTransform {
        val: number = 0;
      }

      const sources = [{ val: 1 }];
      const mapping = [
        {
          from: 'val',
          transform: () => {
            throw new TypeError('Custom type error');
          },
        },
      ];

      const gen = Objecter.convertArrayGenerator(sources, BadTransform, mapping);
      expect(() => gen.next()).toThrow(/Custom type error/);
    });
  });

  describe('ConvertArray Edge Cases', () => {
    it('should wrap transform errors in MappingError with context', () => {
      class BadTransform {
        val: number = 0;
      }

      const sources = [{ val: 1 }];
      const mapping = [
        {
          from: 'val',
          transform: () => {
            throw new Error('Custom error');
          },
        },
      ];

      expect(() => Objecter.convertArray(sources, BadTransform, mapping)).toThrow(/Custom error/);
    });
  });
});
