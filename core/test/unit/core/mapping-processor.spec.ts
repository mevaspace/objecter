import { processFieldMapping, processFieldMappingAsync, wrapMappingError } from '../../../src/core/mapping-processor';
import { MappingError } from '../../../src/errors/mapping.error';
import { ValidationError } from '../../../src/errors/validation.error';
import { DEFAULT_OPTIONS } from '../../../src/core/config-manager';
import { MappingContext } from '../../../src/types';

class Target {
  name = '';
  age = 0;
  email = '';
}

function createContext(source: unknown): MappingContext {
  return { source, targetType: Target, data: {} };
}

describe('processFieldMapping', () => {
  const baseOptions = { ...DEFAULT_OPTIONS, strictMapping: false } as Required<typeof DEFAULT_OPTIONS>;

  it('should map from source to target with same key', () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    processFieldMapping(
      { name: 'John' },
      target,
      { from: 'name' },
      createContext({ name: 'John' }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('John');
  });

  it('should map from source key to different target key', () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    processFieldMapping(
      { firstName: 'John' },
      target,
      { from: 'firstName', to: 'name' },
      createContext({ firstName: 'John' }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('John');
  });

  it('should apply transform function', () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    processFieldMapping(
      { name: 'john' },
      target,
      { from: 'name', transform: (v: unknown) => (v as string).toUpperCase() },
      createContext({ name: 'john' }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('JOHN');
  });

  it('should use defaultValue when source is null', () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    processFieldMapping(
      { name: null },
      target,
      { from: 'name', defaultValue: 'default' },
      createContext({ name: null }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('default');
  });

  it('should use defaultValue when source is undefined', () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    processFieldMapping({}, target, { from: 'name', defaultValue: 'N/A' }, createContext({}), baseOptions, errors);
    expect(target.name).toBe('N/A');
  });

  it('should skip field when skipIfNull is true and value is null', () => {
    const target: Record<string, unknown> = { name: 'original' };
    const errors = new Map<string, string[]>();
    processFieldMapping(
      { name: null },
      target,
      { from: 'name', skipIfNull: true },
      createContext({ name: null }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('original');
  });

  it('should skip field when skipIf predicate returns true', () => {
    const target: Record<string, unknown> = { name: 'original' };
    const errors = new Map<string, string[]>();
    processFieldMapping(
      { name: 'skip-me' },
      target,
      { from: 'name', skipIf: (v) => v === 'skip-me' },
      createContext({ name: 'skip-me' }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('original');
  });

  it('should throw when required field is missing and throwOnMissingFields is true', () => {
    const opts = { ...baseOptions, throwOnMissingFields: true };
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    expect(() => processFieldMapping({}, target, { from: 'name' }, createContext({}), opts, errors)).toThrow(
      "Required field 'name' is missing or null",
    );
  });

  it('should not throw when optional field is missing', () => {
    const opts = { ...baseOptions, throwOnMissingFields: true };
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    expect(() =>
      processFieldMapping({}, target, { from: 'name', optional: true }, createContext({}), opts, errors),
    ).not.toThrow();
  });

  it('should skip undefined values when copyUndefined is false', () => {
    const opts = { ...baseOptions, copyUndefined: false, throwOnMissingFields: false };
    const target: Record<string, unknown> = { name: 'original' };
    const errors = new Map<string, string[]>();
    processFieldMapping({}, target, { from: 'name', optional: true }, createContext({}), opts, errors);
    expect(target.name).toBe('original');
  });

  it('should copy undefined values when copyUndefined is true', () => {
    const opts = { ...baseOptions, copyUndefined: true, throwOnMissingFields: false };
    const target: Record<string, unknown> = { name: 'original' };
    const errors = new Map<string, string[]>();
    processFieldMapping({}, target, { from: 'name', optional: true }, createContext({}), opts, errors);
    expect(target.name).toBeUndefined();
  });

  it('should throw MappingError when strictMapping is true and target key does not exist', () => {
    const opts = { ...baseOptions, strictMapping: true };
    const target = new Target() as unknown as Record<string, unknown>;
    const errors = new Map<string, string[]>();
    expect(() =>
      processFieldMapping(
        { missing: 'val' },
        target,
        { from: 'missing', to: 'nonexistent' },
        createContext({ missing: 'val' }),
        opts,
        errors,
      ),
    ).toThrow(MappingError);
  });

  it('should accumulate validation errors', () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    processFieldMapping(
      { name: 'x' },
      target,
      { from: 'name', validate: () => ({ valid: false, errors: ['too short'] }) },
      createContext({ name: 'x' }),
      baseOptions,
      errors,
    );
    expect(errors.get('name')).toEqual(['too short']);
  });

  it('should not run transform when value is undefined', () => {
    const transformFn = jest.fn();
    const opts = { ...baseOptions, throwOnMissingFields: false, copyUndefined: true };
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    processFieldMapping({}, target, { from: 'name', transform: transformFn }, createContext({}), opts, errors);
    expect(transformFn).not.toHaveBeenCalled();
  });
});

describe('processFieldMappingAsync', () => {
  const baseOptions = { ...DEFAULT_OPTIONS, strictMapping: false } as Required<typeof DEFAULT_OPTIONS>;

  it('should handle async transform returning Promise', async () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    await processFieldMappingAsync(
      { name: 'john' },
      target,
      { from: 'name', transform: async (v: unknown) => await Promise.resolve((v as string).toUpperCase()) },
      createContext({ name: 'john' }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('JOHN');
  });

  it('should handle sync transform in async context', async () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    await processFieldMappingAsync(
      { name: 'john' },
      target,
      { from: 'name', transform: (v: unknown) => (v as string).toUpperCase() },
      createContext({ name: 'john' }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('JOHN');
  });

  it('should run async validators', async () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    await processFieldMappingAsync(
      { email: 'bad' },
      target,
      { from: 'email', validateAsync: async () => await Promise.resolve({ valid: false, errors: ['invalid email'] }) },
      createContext({ email: 'bad' }),
      baseOptions,
      errors,
    );
    expect(errors.get('email')).toEqual(['invalid email']);
  });

  it('should run both sync and async validators', async () => {
    const target: Record<string, unknown> = {};
    const errors = new Map<string, string[]>();
    await processFieldMappingAsync(
      { email: 'bad' },
      target,
      {
        from: 'email',
        validate: () => ({ valid: false, errors: ['sync error'] }),
        validateAsync: async () => await Promise.resolve({ valid: false, errors: ['async error'] }),
      },
      createContext({ email: 'bad' }),
      baseOptions,
      errors,
    );
    expect(errors.get('email')).toEqual(['sync error', 'async error']);
  });

  it('should skip field when skipIfNull is true and value is null', async () => {
    const target: Record<string, unknown> = { name: 'original' };
    const errors = new Map<string, string[]>();
    await processFieldMappingAsync(
      { name: null },
      target,
      { from: 'name', skipIfNull: true },
      createContext({ name: null }),
      baseOptions,
      errors,
    );
    expect(target.name).toBe('original');
  });
});

describe('wrapMappingError', () => {
  it('should re-throw MappingError with prepended field path', () => {
    const original = new MappingError('inner error', 'child', 'val');
    try {
      wrapMappingError(original, { from: 'parent' }, { parent: { child: 'val' } });
    } catch (e) {
      expect(e).toBeInstanceOf(MappingError);
      const me = e as MappingError;
      expect(me.field).toBe('parent.child');
    }
  });

  it('should pass through ValidationError unchanged', () => {
    const original = new ValidationError('validation fail', new Map());
    expect(() => wrapMappingError(original, { from: 'f' }, {})).toThrow(ValidationError);
  });

  it('should wrap generic Error into MappingError', () => {
    const original = new Error('generic failure');
    try {
      wrapMappingError(original, { from: 'field' }, { field: 'val' });
    } catch (e) {
      expect(e).toBeInstanceOf(MappingError);
      const me = e as MappingError;
      expect(me.message).toContain("Error mapping field 'field'");
      expect(me.field).toBe('field');
    }
  });
});
