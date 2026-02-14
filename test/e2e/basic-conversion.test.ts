import { Objecter } from '../../src/objecter';
import { MappingError } from '../../src/errors/mapping.error';
import { UserDTO, SimpleTarget, ReadonlyTarget } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Feature 1: Basic Conversion', () => {
  describe('Positive Cases', () => {
    it('should map standard fields with transform (firstName+lastName → fullName)', () => {
      const source = { id: 1, firstName: 'John', lastName: 'Doe' };
      const result = Objecter.convert(
        source,
        UserDTO,
        [
          { from: 'id', to: 'id' },
          {
            from: 'firstName',
            to: 'fullName',
            transform: (_v: unknown, s: unknown) => {
              const src = s as { firstName: string; lastName: string };
              return src.firstName + ' ' + src.lastName;
            },
          },
        ],
        { strictMapping: false },
      );
      expect(result).toBeInstanceOf(UserDTO);
      expect(result.id).toBe(1);
      expect(result.fullName).toBe('John Doe');
    });

    it('should ignore extra fields not in mapping (no data leak)', () => {
      const source = { id: 1, internalCode: 'hidden_code' };
      const result = Objecter.convert(source, SimpleTarget, [{ from: 'id', to: 'id' }], { strictMapping: false });
      expect(result.id).toBe(1);
      expect((result as unknown as Record<string, unknown>)['internalCode']).toBeUndefined();
    });

    it('should map from getter accessor', () => {
      class SourceWithGetter {
        private readonly _first = 'John';
        private readonly _last = 'Doe';
        get fullName(): string {
          return this._first + ' ' + this._last;
        }
      }
      const source = new SourceWithGetter();
      const result = Objecter.convert(source, UserDTO, [{ from: 'fullName', to: 'name' }], { strictMapping: false });
      expect(result.name).toBe('John Doe');
    });
  });

  describe('Negative Cases', () => {
    it('should throw MappingError when required field is missing and throwOnMissingFields=true', () => {
      const source = { name: 'John' };
      expect(() =>
        Objecter.convert(source, UserDTO, [{ from: 'id', to: 'id' }], { throwOnMissingFields: true }),
      ).toThrow(MappingError);
    });

    it('should be case-sensitive for field names', () => {
      const source = { FirstName: 'John' };
      expect(() =>
        Objecter.convert(source, UserDTO, [{ from: 'firstName', to: 'name' }], { throwOnMissingFields: true }),
      ).toThrow(MappingError);
    });

    it('should handle readonly target assignment gracefully', () => {
      const source = { id: 42 };
      const result = Objecter.convert(source, ReadonlyTarget, [{ from: 'id', to: 'id' }], { strictMapping: false });
      expect(result).toBeInstanceOf(ReadonlyTarget);
    });
  });
});
