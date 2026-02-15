import {
  convert,
  convertAsync,
  convertArray,
  convertArrayAsync,
  convertArrayGenerator,
  merge,
  toPlainObject,
} from '../../../src/core/object-converter';
import { MappingError } from '../../../src/errors/mapping.error';
import { ValidationError } from '../../../src/errors/validation.error';
import { DEFAULT_OPTIONS } from '../../../src/core/config-manager';

class UserDto {
  fullName = '';
  email = '';
  age = 0;
}

const baseOptions = { ...DEFAULT_OPTIONS, strictMapping: false } as Required<typeof DEFAULT_OPTIONS>;

describe('convert', () => {
  it('should convert source to target instance', () => {
    const result = convert(
      { fullName: 'John', email: 'john@test.com' },
      UserDto,
      [{ from: 'fullName' }, { from: 'email' }],
      baseOptions,
    );
    expect(result).toBeInstanceOf(UserDto);
    expect(result.fullName).toBe('John');
    expect(result.email).toBe('john@test.com');
  });

  it('should throw MappingError for null source', () => {
    expect(() => convert(null, UserDto, [], baseOptions)).toThrow(MappingError);
    expect(() => convert(null, UserDto, [], baseOptions)).toThrow('Source object cannot be null or undefined');
  });

  it('should throw MappingError for undefined source', () => {
    expect(() => convert(undefined, UserDto, [], baseOptions)).toThrow(MappingError);
  });

  it('should apply transform function', () => {
    const result = convert(
      { fullName: 'john' },
      UserDto,
      [{ from: 'fullName', transform: (v: unknown) => (v as string).toUpperCase() }],
      baseOptions,
    );
    expect(result.fullName).toBe('JOHN');
  });

  it('should run schema validation when validateSchema is provided', () => {
    const opts = { ...baseOptions, validateSchema: (_target: unknown) => ({ valid: false, errors: ['schema error'] }) };
    expect(() => convert({ fullName: 'John' }, UserDto, [{ from: 'fullName' }], opts)).toThrow(ValidationError);
  });

  it('should not throw schema validation when result is valid', () => {
    const opts = { ...baseOptions, validateSchema: () => ({ valid: true }) };
    expect(() => convert({ fullName: 'John' }, UserDto, [{ from: 'fullName' }], opts)).not.toThrow();
  });

  it('should map from→to with different keys', () => {
    const result = convert({ first_name: 'John' }, UserDto, [{ from: 'first_name', to: 'fullName' }], baseOptions);
    expect(result.fullName).toBe('John');
  });
});

describe('convertAsync', () => {
  it('should convert with async transform', async () => {
    const result = await convertAsync(
      { fullName: 'john' },
      UserDto,
      [{ from: 'fullName', transform: async (v: unknown) => await Promise.resolve((v as string).toUpperCase()) }],
      baseOptions,
    );
    expect(result.fullName).toBe('JOHN');
  });

  it('should throw for null source', async () => {
    await expect(convertAsync(null, UserDto, [], baseOptions)).rejects.toThrow(MappingError);
  });

  it('should run async schema validation', async () => {
    const opts = {
      ...baseOptions,
      validateSchemaAsync: async () => await Promise.resolve({ valid: false, errors: ['async schema err'] }),
    };
    await expect(convertAsync({ fullName: 'John' }, UserDto, [{ from: 'fullName' }], opts)).rejects.toThrow(
      ValidationError,
    );
  });

  it('should run sync validateSchema in async context', async () => {
    const opts = { ...baseOptions, validateSchema: () => ({ valid: false, errors: ['sync schema err'] }) };
    await expect(convertAsync({ fullName: 'John' }, UserDto, [{ from: 'fullName' }], opts)).rejects.toThrow(
      ValidationError,
    );
  });
});

describe('convertArray', () => {
  it('should convert array of sources', () => {
    const sources = [{ fullName: 'John' }, { fullName: 'Jane' }];
    const result = convertArray(sources, UserDto, [{ from: 'fullName' }], baseOptions);
    expect(result).toHaveLength(2);
    expect(result[0].fullName).toBe('John');
    expect(result[1].fullName).toBe('Jane');
  });

  it('should throw MappingError for non-array source', () => {
    expect(() => convertArray('not-array' as any, UserDto, [], baseOptions)).toThrow(MappingError);
    expect(() => convertArray('not-array' as any, UserDto, [], baseOptions)).toThrow('Source must be an array');
  });

  it('should wrap MappingError with index information', () => {
    const sources = [{ fullName: 'John' }, null];
    try {
      convertArray(sources as any, UserDto, [{ from: 'fullName' }], baseOptions);
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MappingError);
      expect((e as MappingError).message).toContain('index 1');
    }
  });

  it('should wrap transform errors as MappingError with index', () => {
    const mapping = [
      {
        from: 'fullName',
        transform: () => {
          throw new TypeError('custom type error');
        },
      },
    ];
    expect(() => convertArray([{ fullName: 'x' }], UserDto, mapping, baseOptions)).toThrow(MappingError);
  });
});

describe('convertArrayAsync', () => {
  it('should convert array with async transforms', async () => {
    const sources = [{ fullName: 'John' }, { fullName: 'Jane' }];
    const result = await convertArrayAsync(
      sources,
      UserDto,
      [{ from: 'fullName', transform: async (v: unknown) => await Promise.resolve((v as string).toUpperCase()) }],
      baseOptions,
    );
    expect(result).toHaveLength(2);
    expect(result[0].fullName).toBe('JOHN');
  });

  it('should throw MappingError for non-array source', async () => {
    await expect(convertArrayAsync('bad' as any, UserDto, [], baseOptions)).rejects.toThrow('Source must be an array');
  });

  it('should wrap MappingError with index in async mode', async () => {
    try {
      await convertArrayAsync([{ fullName: 'ok' }, null] as any, UserDto, [{ from: 'fullName' }], baseOptions);
      fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MappingError);
      expect((e as MappingError).message).toContain('index 1');
    }
  });

  it('should wrap transform errors as MappingError in async context', async () => {
    const mapping = [
      {
        from: 'fullName',
        transform: () => {
          throw new TypeError('async type error');
        },
      },
    ];
    await expect(convertArrayAsync([{ fullName: 'x' }], UserDto, mapping, baseOptions)).rejects.toThrow(MappingError);
  });
});

describe('convertArrayGenerator', () => {
  it('should yield converted items lazily', () => {
    const sources = [{ fullName: 'A' }, { fullName: 'B' }];
    const gen = convertArrayGenerator(sources, UserDto, [{ from: 'fullName' }], baseOptions);

    const first = gen.next();
    expect(first.done).toBe(false);
    expect(first.value.fullName).toBe('A');

    const second = gen.next();
    expect(second.done).toBe(false);
    expect(second.value.fullName).toBe('B');

    const third = gen.next();
    expect(third.done).toBe(true);
  });

  it('should throw MappingError for non-array', () => {
    expect(() => {
      const gen = convertArrayGenerator('bad' as any, UserDto, [], baseOptions);
      gen.next();
    }).toThrow('Source must be an array');
  });

  it('should throw MappingError with index for item failure', () => {
    const sources = [{ fullName: 'ok' }, null] as any;
    const gen = convertArrayGenerator(sources, UserDto, [{ from: 'fullName' }], baseOptions);
    gen.next(); // first item succeeds
    expect(() => gen.next()).toThrow(/index 1/);
  });

  it('should collect all items via spread', () => {
    const sources = [{ fullName: 'X' }, { fullName: 'Y' }];
    const results = [...convertArrayGenerator(sources, UserDto, [{ from: 'fullName' }], baseOptions)];
    expect(results).toHaveLength(2);
  });
});

describe('merge', () => {
  it('should merge multiple sources into one target', () => {
    const sources = [{ fullName: 'John' }, { email: 'john@test.com' }];
    const result = merge(sources, UserDto, [{ from: 'fullName' }, { from: 'email' }], baseOptions);
    expect(result.fullName).toBe('John');
    expect(result.email).toBe('john@test.com');
  });

  it('should let later sources override earlier ones', () => {
    const sources = [{ fullName: 'John' }, { fullName: 'Jane' }];
    const result = merge(sources, UserDto, [{ from: 'fullName' }], baseOptions);
    expect(result.fullName).toBe('Jane');
  });

  it('should skip non-object sources', () => {
    const sources = [null, undefined, 'string', { fullName: 'John' }];
    const result = merge(sources, UserDto, [{ from: 'fullName' }], baseOptions);
    expect(result.fullName).toBe('John');
  });
});

describe('toPlainObject', () => {
  it('should throw for null source', () => {
    expect(() => toPlainObject(null)).toThrow(MappingError);
  });

  it('should throw for undefined source', () => {
    expect(() => toPlainObject(undefined)).toThrow(MappingError);
  });

  it('should copy all fields when no mapping provided', () => {
    const source = { a: 1, b: 'hello' };
    const result = toPlainObject(source);
    expect(result).toEqual({ a: 1, b: 'hello' });
    expect(result).not.toBe(source);
  });

  it('should strip class prototype', () => {
    const source = new UserDto();
    source.fullName = 'John';
    const result = toPlainObject(source);
    expect(result.fullName).toBe('John');
    expect(result).not.toBeInstanceOf(UserDto);
  });

  it('should apply mapping when provided', () => {
    const source = { firstName: 'John', lastName: 'Doe' };
    const result = toPlainObject(source, [
      { from: 'firstName', to: 'first' },
      { from: 'lastName', to: 'last' },
    ]);
    expect(result).toEqual({ first: 'John', last: 'Doe' });
  });
});
