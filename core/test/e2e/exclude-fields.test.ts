import { Objecter } from '../../src/objecter';
import { AutoMapTarget } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

class SecureTarget {
  id = 0;
  name = '';
  email = '';
}

describe('Feature: Exclude Fields', () => {
  describe('FieldMapping.exclude', () => {
    it('should skip a mapping when exclude is true', () => {
      const source = { id: 1, name: 'Ivan', email: 'ivan@test.com' };
      const result = Objecter.convert(source, SecureTarget, [
        { from: 'id' },
        { from: 'name' },
        { from: 'email', exclude: true },
      ]);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Ivan');
      expect(result.email).toBe('');
    });

    it('should include a mapping when exclude is false', () => {
      const source = { id: 1, name: 'Ivan' };
      const result = Objecter.convert(source, SecureTarget, [{ from: 'id' }, { from: 'name', exclude: false }]);
      expect(result.name).toBe('Ivan');
    });
  });

  describe('MappingOptions.excludeFields with autoMap', () => {
    it('should exclude listed field from autoMap', () => {
      const source = { id: 1, name: 'Ivan', email: 'ivan@test.com' };
      const result = Objecter.convert(source, SecureTarget, [], { autoMap: true, excludeFields: ['email'] });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Ivan');
      expect(result.email).toBe('');
    });

    it('should exclude multiple fields from autoMap', () => {
      const source = { id: 1, name: 'Ivan', email: 'ivan@test.com' };
      const result = Objecter.convert(source, SecureTarget, [], { autoMap: true, excludeFields: ['name', 'email'] });
      expect(result.id).toBe(1);
      expect(result.name).toBe('');
      expect(result.email).toBe('');
    });

    it('should type-check excludeFields against TSource keys', () => {
      interface SourceUser {
        id: number;
        name: string;
        password: string;
      }
      const source: SourceUser = { id: 1, name: 'Ivan', password: 'secret' };
      const result = Objecter.convert(source, SecureTarget, [], {
        autoMap: true,
        strictMapping: false,
        excludeFields: ['password'],
      });
      expect((result as unknown as Record<string, unknown>)['password']).toBeUndefined();
    });
  });

  describe('MappingOptions.excludePattern with autoMap', () => {
    it('should exclude fields matching string pattern', () => {
      const source = { id: 1, name: 'Ivan', internalId: 99, internalCode: 'X' };
      const result = Objecter.convert(source, AutoMapTarget, [], {
        autoMap: true,
        strictMapping: false,
        excludePattern: '^internal',
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Ivan');
      expect((result as unknown as Record<string, unknown>)['internalId']).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)['internalCode']).toBeUndefined();
    });

    it('should exclude fields matching RegExp pattern', () => {
      const source = { id: 1, name: 'Ivan', _private: 'hidden', _secret: 'shh' };
      const result = Objecter.convert(source, AutoMapTarget, [], {
        autoMap: true,
        strictMapping: false,
        excludePattern: /^_/,
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Ivan');
      expect((result as unknown as Record<string, unknown>)['_private']).toBeUndefined();
      expect((result as unknown as Record<string, unknown>)['_secret']).toBeUndefined();
    });
  });

  describe('excludeFields + excludePattern combined', () => {
    it('should apply both exclusion mechanisms', () => {
      const source = { id: 1, name: 'Ivan', email: 'ivan@test.com', _token: 'abc' };
      const result = Objecter.convert(source, SecureTarget, [], {
        autoMap: true,
        excludeFields: ['email'],
        excludePattern: /^_/,
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe('Ivan');
      expect(result.email).toBe('');
      expect((result as unknown as Record<string, unknown>)['_token']).toBeUndefined();
    });
  });
});
