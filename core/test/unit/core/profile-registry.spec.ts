import { registerProfile, clearProfiles, getProfile, validateMappingConfig } from '../../../src/core/profile-registry';
import { MappingError } from '../../../src/errors/mapping.error';

class TargetClass {
  name = '';
}

afterEach(() => {
  clearProfiles();
});

describe('registerProfile', () => {
  it('should register a valid profile and return it', () => {
    const profile = { name: 'test-profile', targetClass: TargetClass, mapping: [{ from: 'name' }] };
    const result = registerProfile(profile);
    expect(result).toBe(profile);
  });

  it('should throw MappingError for empty name', () => {
    expect(() => registerProfile({ name: '', targetClass: TargetClass, mapping: [{ from: 'name' }] })).toThrow(
      MappingError,
    );
  });

  it('should throw MappingError for whitespace-only name', () => {
    expect(() => registerProfile({ name: '   ', targetClass: TargetClass, mapping: [{ from: 'name' }] })).toThrow(
      MappingError,
    );
  });

  it('should throw MappingError for non-string name', () => {
    expect(() => registerProfile({ name: 123 as any, targetClass: TargetClass, mapping: [{ from: 'name' }] })).toThrow(
      MappingError,
    );
  });

  it('should throw MappingError for invalid mapping (not array)', () => {
    expect(() => registerProfile({ name: 'p', targetClass: TargetClass, mapping: 'bad' as any })).toThrow(MappingError);
  });

  it('should overwrite existing profile with same name', () => {
    registerProfile({ name: 'dup', targetClass: TargetClass, mapping: [{ from: 'a' }] });
    registerProfile({ name: 'dup', targetClass: TargetClass, mapping: [{ from: 'b' }] });
    const profile = getProfile('dup');
    expect(profile!.mapping[0].from).toBe('b');
  });
});

describe('getProfile', () => {
  it('should return registered profile', () => {
    registerProfile({ name: 'found', targetClass: TargetClass, mapping: [{ from: 'x' }] });
    expect(getProfile('found')).toBeDefined();
    expect(getProfile('found')!.name).toBe('found');
  });

  it('should return undefined for unknown profile', () => {
    expect(getProfile('unknown')).toBeUndefined();
  });
});

describe('clearProfiles', () => {
  it('should remove all profiles', () => {
    registerProfile({ name: 'a', targetClass: TargetClass, mapping: [{ from: 'x' }] });
    registerProfile({ name: 'b', targetClass: TargetClass, mapping: [{ from: 'y' }] });
    clearProfiles();
    expect(getProfile('a')).toBeUndefined();
    expect(getProfile('b')).toBeUndefined();
  });
});

describe('validateMappingConfig', () => {
  it('should pass for valid mapping array', () => {
    expect(() => validateMappingConfig([{ from: 'a' }, { from: 'b', to: 'c' }])).not.toThrow();
  });

  it('should throw for non-array', () => {
    expect(() => validateMappingConfig('not-array' as any)).toThrow(MappingError);
  });

  it('should throw for empty from', () => {
    expect(() => validateMappingConfig([{ from: '' }])).toThrow(MappingError);
  });

  it('should throw for non-string from', () => {
    expect(() => validateMappingConfig([{ from: 42 as any }])).toThrow(MappingError);
  });

  it('should throw for duplicate target paths', () => {
    expect(() =>
      validateMappingConfig([
        { from: 'a', to: 'x' },
        { from: 'b', to: 'x' },
      ]),
    ).toThrow(MappingError);
  });

  it('should treat missing "to" as "from" for duplicate detection', () => {
    expect(() => validateMappingConfig([{ from: 'name' }, { from: 'name' }])).toThrow(MappingError);
  });

  it('should allow different targets for same from', () => {
    expect(() =>
      validateMappingConfig([
        { from: 'name', to: 'a' },
        { from: 'name', to: 'b' },
      ]),
    ).not.toThrow();
  });
});
