import { Objecter } from '../../src/objecter';
import { MappingError } from '../../src/errors/mapping.error';

class UserDto {
  name = '';
  email = '';
  age = 0;
}

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Objecter.configure / resetConfig', () => {
  it('should configure global options that affect convert', () => {
    Objecter.configure({ strictMapping: false });
    const result = Objecter.convert({ name: 'John', extra: 'ignored' }, UserDto, [{ from: 'name' }]);
    expect(result.name).toBe('John');
  });

  it('should reset global options', () => {
    Objecter.configure({ strictMapping: false });
    Objecter.resetConfig();
    expect(() => Objecter.convert({ name: 'John' }, UserDto, [{ from: 'name', to: 'nonexistent' }])).toThrow(
      MappingError,
    );
  });
});

describe('Objecter.registerProfile / clearProfiles', () => {
  it('should register and use a profile with map()', () => {
    Objecter.registerProfile({
      name: 'user',
      targetClass: UserDto,
      mapping: [{ from: 'name' }, { from: 'email' }],
      options: { strictMapping: false },
    });

    const result = Objecter.map<UserDto>({ name: 'John', email: 'j@t.com' }, 'user');
    expect(result.name).toBe('John');
    expect(result.email).toBe('j@t.com');
  });

  it('should throw when mapping with unknown profile', () => {
    expect(() => Objecter.map({}, 'nonexistent')).toThrow(MappingError);
    expect(() => Objecter.map({}, 'nonexistent')).toThrow("Profile 'nonexistent' not found");
  });

  it('should clear profiles', () => {
    Objecter.registerProfile({ name: 'temp', targetClass: UserDto, mapping: [{ from: 'name' }] });
    Objecter.clearProfiles();
    expect(() => Objecter.map({}, 'temp')).toThrow(MappingError);
  });
});

describe('Objecter.map', () => {
  it('should merge profile options with per-call options', () => {
    Objecter.registerProfile({
      name: 'user',
      targetClass: UserDto,
      mapping: [{ from: 'name' }],
      options: { strictMapping: false },
    });
    const result = Objecter.map<UserDto>({ name: 'John' }, 'user', { throwOnMissingFields: false });
    expect(result.name).toBe('John');
  });
});

describe('Objecter.mapAsync', () => {
  it('should map using profile asynchronously', async () => {
    Objecter.registerProfile({
      name: 'async-user',
      targetClass: UserDto,
      mapping: [{ from: 'name', transform: async (v: unknown) => await Promise.resolve((v as string).toUpperCase()) }],
      options: { strictMapping: false },
    });
    const result = await Objecter.mapAsync<UserDto>({ name: 'john' }, 'async-user');
    expect(result.name).toBe('JOHN');
  });

  it('should throw for unknown profile in async mode', async () => {
    await expect(Objecter.mapAsync({}, 'unknown')).rejects.toThrow(MappingError);
  });
});

describe('Objecter.convert', () => {
  it('should convert with explicit mapping', () => {
    const result = Objecter.convert(
      { first: 'John', mail: 'j@t.com' },
      UserDto,
      [
        { from: 'first', to: 'name' },
        { from: 'mail', to: 'email' },
      ],
      { strictMapping: false },
    );
    expect(result).toBeInstanceOf(UserDto);
    expect(result.name).toBe('John');
    expect(result.email).toBe('j@t.com');
  });
});

describe('Objecter.convertAsync', () => {
  it('should convert with async transforms', async () => {
    const result = await Objecter.convertAsync(
      { name: 'john' },
      UserDto,
      [{ from: 'name', transform: async (v: unknown) => await Promise.resolve((v as string).toUpperCase()) }],
      { strictMapping: false },
    );
    expect(result.name).toBe('JOHN');
  });
});

describe('Objecter.convertArray', () => {
  it('should convert array of sources', () => {
    const sources = [{ name: 'A' }, { name: 'B' }];
    const result = Objecter.convertArray(sources, UserDto, [{ from: 'name' }], { strictMapping: false });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('A');
    expect(result[1].name).toBe('B');
  });
});

describe('Objecter.convertArrayAsync', () => {
  it('should convert array with async transforms', async () => {
    const result = await Objecter.convertArrayAsync(
      [{ name: 'a' }],
      UserDto,
      [{ from: 'name', transform: async (v: unknown) => await Promise.resolve((v as string).toUpperCase()) }],
      { strictMapping: false },
    );
    expect(result[0].name).toBe('A');
  });
});

describe('Objecter.convertArrayGenerator', () => {
  it('should yield converted items via generator', () => {
    const gen = Objecter.convertArrayGenerator([{ name: 'X' }, { name: 'Y' }], UserDto, [{ from: 'name' }], {
      strictMapping: false,
    });
    const results = [...gen];
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('X');
  });
});

describe('Objecter.createMapper', () => {
  it('should create a reusable mapper function', () => {
    const mapper = Objecter.createMapper<{ name: string }, UserDto>(UserDto, [{ from: 'name' }], {
      strictMapping: false,
    });
    const result = mapper({ name: 'John' });
    expect(result.name).toBe('John');
  });

  it('should merge context when provided', () => {
    let capturedContext: Record<string, unknown> = {};
    const mapper = Objecter.createMapper<{ name: string }, UserDto>(
      UserDto,
      [
        {
          from: 'name',
          transform: (_v, _s, ctx) => {
            if (ctx) capturedContext = ctx.data as Record<string, unknown>;
            return _v;
          },
        },
      ],
      { strictMapping: false, context: { base: true } },
    );
    mapper({ name: 'John' }, undefined, { data: { extra: 'yes' }, source: {}, targetType: UserDto });
    expect(capturedContext.base).toBe(true);
    expect(capturedContext.extra).toBe('yes');
  });
});

describe('Objecter.createArrayMapper', () => {
  it('should create a reusable array mapper', () => {
    const mapper = Objecter.createArrayMapper<{ name: string }, UserDto>(UserDto, [{ from: 'name' }], {
      strictMapping: false,
    });
    const results = mapper([{ name: 'A' }, { name: 'B' }]);
    expect(results).toHaveLength(2);
    expect(results[0].name).toBe('A');
  });

  it('should merge context in array mapper', () => {
    let capturedContext: Record<string, unknown> = {};
    const mapper = Objecter.createArrayMapper<{ name: string }, UserDto>(
      UserDto,
      [
        {
          from: 'name',
          transform: (_v, _s, ctx) => {
            if (ctx) capturedContext = ctx.data as Record<string, unknown>;
            return _v;
          },
        },
      ],
      { strictMapping: false },
    );
    mapper([{ name: 'A' }], undefined, { data: { ctx: 1 }, source: {}, targetType: UserDto });
    expect(capturedContext.ctx).toBe(1);
  });
});

describe('Objecter.merge', () => {
  it('should merge multiple sources', () => {
    const result = Objecter.merge(
      [{ name: 'John' }, { email: 'j@t.com' }],
      UserDto,
      [{ from: 'name' }, { from: 'email' }],
      { strictMapping: false },
    );
    expect(result.name).toBe('John');
    expect(result.email).toBe('j@t.com');
  });
});

describe('Objecter.toPlainObject', () => {
  it('should convert to plain object without mapping', () => {
    const source = new UserDto();
    source.name = 'John';
    const result = Objecter.toPlainObject(source);
    expect(result.name).toBe('John');
    expect(result).not.toBeInstanceOf(UserDto);
  });

  it('should convert to plain object with mapping', () => {
    const result = Objecter.toPlainObject({ firstName: 'John' }, [{ from: 'firstName', to: 'name' }]);
    expect(result).toEqual({ name: 'John' });
  });
});
