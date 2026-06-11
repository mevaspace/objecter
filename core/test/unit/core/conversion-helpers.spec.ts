import {
  initializeConversion,
  applyAutoMapping,
  throwValidationErrors,
  finalizeConversion,
  processSchemaValidationResult,
  prepareRuntimeOptions,
} from '../../../src/core/conversion-helpers';
import { ValidationError } from '../../../src/errors/validation.error';
import { DEFAULT_OPTIONS } from '../../../src/core/config-manager';
import type { Constructor, MappingContext } from '../../../src/types';

class Target {
  name = '';
  age = 0;
}

describe('initializeConversion', () => {
  it('should create a new target instance', () => {
    const { target } = initializeConversion({ name: 'John' }, Target, DEFAULT_OPTIONS);
    expect(target).toBeInstanceOf(Target);
  });

  it('should create a context with source and targetType', () => {
    const source = { name: 'John' };
    const { context } = initializeConversion(source, Target, DEFAULT_OPTIONS);
    expect(context.source).toBe(source);
    expect(context.targetType).toBe(Target);
  });

  it('should initialize undefined validationErrors and mappedTargetProps', () => {
    const { validationErrors, mappedTargetProps } = initializeConversion({}, Target, DEFAULT_OPTIONS);
    expect(validationErrors).toBeUndefined();
    expect(mappedTargetProps).toBeUndefined();
  });

  it('should pass options.context as context.data', () => {
    const opts = { ...DEFAULT_OPTIONS, context: { locale: 'id' } };
    const { context } = initializeConversion({}, Target, opts);
    expect(context.data).toEqual({ locale: 'id' });
  });
});

describe('applyAutoMapping', () => {
  it('should copy matching properties when autoMap is true', () => {
    const source = { name: 'John', age: 30 };
    const target: Record<string, unknown> = { name: '', age: 0 };
    const opts = { ...DEFAULT_OPTIONS, autoMap: true };
    applyAutoMapping(source, target, Target, new Set(), opts);
    expect(target.name).toBe('John');
    expect(target.age).toBe(30);
  });

  it('should skip already-mapped properties', () => {
    const source = { name: 'John', age: 30 };
    const target: Record<string, unknown> = { name: 'Original', age: 0 };
    const opts = { ...DEFAULT_OPTIONS, autoMap: true };
    applyAutoMapping(source, target, Target, new Set(['name']), opts);
    expect(target.name).toBe('Original');
    expect(target.age).toBe(30);
  });

  it('should skip constructor property', () => {
    const source = { constructor: 'evil' };
    const target: Record<string, unknown> = {};
    const opts = { ...DEFAULT_OPTIONS, autoMap: true };
    applyAutoMapping(source, target, Target, new Set(), opts);
    expect(target.constructor).not.toBe('evil');
  });

  it('should skip undefined values when copyUndefined is false', () => {
    const source = { name: undefined, age: 25 };
    const target: Record<string, unknown> = { name: 'default', age: 0 };
    const opts = { ...DEFAULT_OPTIONS, autoMap: true, copyUndefined: false };
    applyAutoMapping(source, target, Target, new Set(), opts);
    expect(target.name).toBe('default');
    expect(target.age).toBe(25);
  });

  it('should do nothing when autoMap is false', () => {
    const source = { name: 'John' };
    const target: Record<string, unknown> = { name: '' };
    applyAutoMapping(source, target, Target, new Set(), DEFAULT_OPTIONS);
    expect(target.name).toBe('');
  });

  it('should do nothing when source is not a plain object', () => {
    const target: Record<string, unknown> = { name: '' };
    const opts = { ...DEFAULT_OPTIONS, autoMap: true };
    applyAutoMapping(null, target, Target, new Set(), opts);
    expect(target.name).toBe('');
  });

  it('should skip own __proto__ key when target is Object (no prototype rewrite)', () => {
    const source = JSON.parse('{"__proto__": {"polluted": true}, "name": "John"}') as Record<string, unknown>;
    const target: Record<string, unknown> = {};
    const opts = { ...DEFAULT_OPTIONS, autoMap: true };
    applyAutoMapping(source, target, Object, new Set(), opts);
    expect(target.name).toBe('John');
    expect(Object.getPrototypeOf(target)).toBe(Object.prototype);
    expect(target.polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('should skip prototype key from auto-mapping', () => {
    const source = JSON.parse('{"prototype": "evil", "name": "John"}') as Record<string, unknown>;
    const target: Record<string, unknown> = {};
    const opts = { ...DEFAULT_OPTIONS, autoMap: true };
    applyAutoMapping(source, target, Object, new Set(), opts);
    expect(target.name).toBe('John');
    expect(target.prototype).toBeUndefined();
  });

  it('should apply a safe string excludePattern', () => {
    const source = { name: 'John', _secret: 'hidden' };
    const target: Record<string, unknown> = {};
    const opts = { ...DEFAULT_OPTIONS, autoMap: true, excludePattern: '^_' };
    applyAutoMapping(source, target, Object, new Set(), opts);
    expect(target.name).toBe('John');
    expect(target._secret).toBeUndefined();
  });

  it('should reject string excludePattern with nested quantifiers', () => {
    const source = { name: 'John' };
    const target: Record<string, unknown> = {};
    const opts = { ...DEFAULT_OPTIONS, autoMap: true, excludePattern: '(a+)+$' };
    expect(() => applyAutoMapping(source, target, Object, new Set(), opts)).toThrow('catastrophic backtracking');
  });

  it('should reject string excludePattern exceeding max length', () => {
    const source = { name: 'John' };
    const target: Record<string, unknown> = {};
    const opts = { ...DEFAULT_OPTIONS, autoMap: true, excludePattern: 'a'.repeat(1001) };
    expect(() => applyAutoMapping(source, target, Object, new Set(), opts)).toThrow('maximum length');
  });

  it('should accept a precompiled RegExp excludePattern without validation', () => {
    const source = { aaa: 1, name: 'John' };
    const target: Record<string, unknown> = {};
    const opts = { ...DEFAULT_OPTIONS, autoMap: true, excludePattern: /(a+)+$/ };
    applyAutoMapping(source, target, Object, new Set(), opts);
    expect(target.name).toBe('John');
    expect(target.aaa).toBeUndefined();
  });
});

describe('throwValidationErrors', () => {
  it('should not throw when map is empty', () => {
    expect(() => throwValidationErrors(new Map())).not.toThrow();
  });

  it('should throw ValidationError with accumulated errors', () => {
    const errors = new Map([
      ['email', ['invalid format']],
      ['age', ['too young', 'required']],
    ]);
    expect(() => throwValidationErrors(errors)).toThrow(ValidationError);
    try {
      throwValidationErrors(errors);
    } catch (e) {
      const ve = e as ValidationError;
      expect(ve.message).toContain('email: invalid format');
      expect(ve.message).toContain('age: too young, required');
    }
  });
});

describe('finalizeConversion', () => {
  it('should apply auto-mapping and throw validation errors', () => {
    const source = { name: 'John' };
    const target = new Target();
    const validationErrors = new Map([['field', ['error']]]);
    const opts = { ...DEFAULT_OPTIONS, throwOnValidationError: true };
    expect(() => finalizeConversion(source, target, Target, new Set(), opts, validationErrors)).toThrow(
      ValidationError,
    );
  });

  it('should not throw when throwOnValidationError is false', () => {
    const validationErrors = new Map([['field', ['error']]]);
    const opts = { ...DEFAULT_OPTIONS, throwOnValidationError: false };
    expect(() => finalizeConversion({}, new Target(), Target, new Set(), opts, validationErrors)).not.toThrow();
  });
});

describe('processSchemaValidationResult', () => {
  it('should not throw for valid result', () => {
    expect(() => processSchemaValidationResult({ valid: true }, true)).not.toThrow();
  });

  it('should throw ValidationError for invalid result when throwOnError is true', () => {
    expect(() => processSchemaValidationResult({ valid: false, errors: ['schema fail'] }, true)).toThrow(
      ValidationError,
    );
  });

  it('should not throw for invalid result when throwOnError is false', () => {
    expect(() => processSchemaValidationResult({ valid: false, errors: ['schema fail'] }, false)).not.toThrow();
  });

  it('should not throw for invalid result without errors array', () => {
    expect(() => processSchemaValidationResult({ valid: false }, true)).not.toThrow();
  });
});

describe('prepareRuntimeOptions', () => {
  it('should merge default, global, and base options', () => {
    const result = prepareRuntimeOptions({ strictMapping: false }, undefined, DEFAULT_OPTIONS, { autoMap: true });
    expect(result.strictMapping).toBe(false);
    expect(result.autoMap).toBe(true);
    expect(result.throwOnValidationError).toBe(true);
  });

  it('should merge context.data into options.context', () => {
    const result = prepareRuntimeOptions(
      { context: { locale: 'id' } },
      { data: { userId: 1 }, source: {}, targetType: Object as unknown as Constructor<unknown> } as MappingContext,
      DEFAULT_OPTIONS,
    );
    expect(result.context).toEqual({ locale: 'id', userId: 1 });
  });

  it('should use defaults when all parameters are undefined', () => {
    const result = prepareRuntimeOptions(undefined, undefined);
    expect(result.throwOnValidationError).toBe(true);
    expect(result.throwOnMissingFields).toBe(true);
  });
});
