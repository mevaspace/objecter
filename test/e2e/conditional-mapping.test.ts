import { Objecter } from '../../src/objecter';
import { UserDTO } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Feature 6: Conditional Mapping', () => {
  describe('Positive Cases', () => {
    it('should skip email mapping when user role is admin (skipIf)', () => {
      const source = { role: 'admin', email: 'private@admin.com', name: 'Admin' };
      const result = Objecter.convert(
        source,
        UserDTO,
        [
          { from: 'name', to: 'name' },
          { from: 'role', to: 'role' },
          { from: 'email', to: 'email', skipIf: (_v, s) => (s as Record<string, unknown>).role === 'admin' },
        ],
        { strictMapping: false },
      );
      expect(result.role).toBe('admin');
      expect(result.email).toBe('');
    });

    it('should use context for conditional skip (hideSensitive)', () => {
      const source = { name: 'John', email: 'john@example.com' };
      const result = Objecter.convert(
        source,
        UserDTO,
        [
          { from: 'name', to: 'name' },
          {
            from: 'email',
            to: 'email',
            skipIf: (_v, _s, ctx) => (ctx?.data as Record<string, boolean>)?.hideSensitive === true,
          },
        ],
        { strictMapping: false, context: { hideSensitive: true } },
      );
      expect(result.name).toBe('John');
      expect(result.email).toBe('');
    });

    it('should skip mapping when value is null (skipIfNull)', () => {
      const source = { email: null, name: 'John' };
      const result = Objecter.convert(
        source,
        UserDTO,
        [
          { from: 'name', to: 'name' },
          { from: 'email', to: 'email', skipIfNull: true },
        ],
        { strictMapping: false },
      );
      expect(result.name).toBe('John');
      expect(result.email).toBe('');
    });
  });

  describe('Negative Cases', () => {
    it('should NOT skip when skipIf returns false (non-admin gets email)', () => {
      const source = { role: 'user', email: 'public@user.com' };
      const result = Objecter.convert(
        source,
        UserDTO,
        [
          { from: 'role', to: 'role' },
          { from: 'email', to: 'email', skipIf: (_v, s) => (s as Record<string, unknown>).role === 'admin' },
        ],
        { strictMapping: false },
      );
      expect(result.email).toBe('public@user.com');
    });
  });
});
