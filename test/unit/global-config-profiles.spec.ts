import { Objecter, MappingError } from '../../src';

class TargetDto {
  id: number = 0;
  name: string = '';
  value: number = 0;
}

describe('Objecter Global Config and Mapping Profiles', () => {
  afterEach(() => {
    Objecter.resetConfig();
    Objecter.clearProfiles();
  });

  describe('Global Configuration', () => {
    const mapping = [
      { from: 'id', to: 'id' },
      { from: 'name', to: 'name' },
    ];

    it('should use default options when no global config is set', () => {
      const source = { id: 1, name: 'Test' };
      const result = Objecter.convert(source, TargetDto, mapping);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test');
    });

    it('should apply global config to all conversions', () => {
      Objecter.configure({ autoMap: true });

      const source = { id: 1, name: 'Test', value: 100 };
      const result = Objecter.convert(source, TargetDto, [{ from: 'id', to: 'id' }]);

      expect(result.id).toBe(1);
      expect(result.value).toBe(100); // autoMap should copy this
    });

    it('should allow per-call options to override global config', () => {
      Objecter.configure({ autoMap: true });

      const source = { id: 1, name: 'Test', value: 100 };
      const result = Objecter.convert(source, TargetDto, [{ from: 'id', to: 'id' }], { autoMap: false });

      expect(result.id).toBe(1);
      expect(result.value).toBe(0); // autoMap false, value not copied
    });

    it('should reset global config with resetConfig()', () => {
      Objecter.configure({ autoMap: true });
      Objecter.resetConfig();

      const source = { id: 1, name: 'Test', value: 100 };
      const result = Objecter.convert(source, TargetDto, [{ from: 'id', to: 'id' }]);

      expect(result.value).toBe(0); // autoMap back to default (false)
    });

    it('should accumulate global config with multiple configure() calls', () => {
      Objecter.configure({ autoMap: true });
      Objecter.configure({ throwOnValidationError: false });

      const source = { id: 1, name: 'Test', value: 50 };
      const result = Objecter.convert(source, TargetDto, [{ from: 'id', to: 'id' }]);

      expect(result.value).toBe(50); // autoMap still true
    });
  });

  describe('Mapping Profiles', () => {
    const userMapping = [
      { from: 'id', to: 'id' },
      { from: 'name', to: 'name' },
    ];

    it('should register and use a profile', () => {
      Objecter.registerProfile<TargetDto>({ name: 'SourceToTarget', targetClass: TargetDto, mapping: userMapping });

      const source = { id: 1, name: 'John' };
      const result = Objecter.map<TargetDto>(source, 'SourceToTarget');

      expect(result).toBeInstanceOf(TargetDto);
      expect(result.id).toBe(1);
      expect(result.name).toBe('John');
    });

    it('should throw MappingError when profile not found', () => {
      expect(() => Objecter.map({}, 'NonExistentProfile')).toThrow(MappingError);
      expect(() => Objecter.map({}, 'NonExistentProfile')).toThrow("Profile 'NonExistentProfile' not found");
    });

    it('should throw MappingError when profile name is empty', () => {
      expect(() => Objecter.registerProfile({ name: '', targetClass: TargetDto, mapping: userMapping })).toThrow(
        MappingError,
      );
    });

    it('should throw MappingError when profile name is whitespace only', () => {
      expect(() => Objecter.registerProfile({ name: '   ', targetClass: TargetDto, mapping: userMapping })).toThrow(
        'Profile name must be a non-empty string',
      );
    });

    it('should allow profile options to be overridden in map()', () => {
      Objecter.registerProfile({
        name: 'WithAutoMap',
        targetClass: TargetDto,
        mapping: [{ from: 'id', to: 'id' }],
        options: { autoMap: true },
      });

      const source = { id: 1, name: 'Test', value: 200 };
      const result = Objecter.map<TargetDto>(source, 'WithAutoMap', { autoMap: false });

      expect(result.id).toBe(1);
      expect(result.value).toBe(0); // autoMap overridden to false
    });

    it('should return the profile for type-safe name usage', () => {
      const profile = Objecter.registerProfile({
        name: 'TypeSafeProfile',
        targetClass: TargetDto,
        mapping: userMapping,
      });

      expect(profile.name).toBe('TypeSafeProfile');
      const result = Objecter.map<TargetDto>({ id: 99, name: 'Safe' }, profile.name);
      expect(result.id).toBe(99);
    });

    it('should clear all profiles with clearProfiles()', () => {
      Objecter.registerProfile({ name: 'ToClear', targetClass: TargetDto, mapping: userMapping });

      Objecter.clearProfiles();

      expect(() => Objecter.map({}, 'ToClear')).toThrow("Profile 'ToClear' not found");
    });

    it('should validate mapping config during profile registration', () => {
      expect(() =>
        Objecter.registerProfile({ name: 'InvalidMapping', targetClass: TargetDto, mapping: [{ from: '', to: 'id' }] }),
      ).toThrow("Invalid mapping: 'from' must be a non-empty string");
    });

    it('should allow overwriting an existing profile with the same name', () => {
      Objecter.registerProfile({ name: 'Overwrite', targetClass: TargetDto, mapping: [{ from: 'id', to: 'id' }] });

      Objecter.registerProfile({ name: 'Overwrite', targetClass: TargetDto, mapping: [{ from: 'name', to: 'name' }] });

      const result = Objecter.map<TargetDto>({ id: 1, name: 'New' }, 'Overwrite');
      expect(result.id).toBe(0); // id mapping removed
      expect(result.name).toBe('New'); // new mapping applied
    });
  });
});
