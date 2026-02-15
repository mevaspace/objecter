import { Objecter } from '../../src/objecter';
import { UserDetailDTO } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Feature 8: Merging Objects', () => {
  describe('Positive Cases', () => {
    it('should merge two sources into one target', () => {
      const result = Objecter.merge([{ id: 1 }, { name: 'John' }], UserDetailDTO, [{ from: 'id' }, { from: 'name' }], {
        strictMapping: false,
      });
      expect(result.id).toBe(1);
      expect(result.name).toBe('John');
    });

    it('should let later source override earlier (override strategy)', () => {
      const result = Objecter.merge([{ role: 'user' }, { role: 'admin' }], UserDetailDTO, [{ from: 'role' }], {
        strictMapping: false,
      });
      expect(result.role).toBe('admin');
    });

    it('should merge heterogeneous sources into single target', () => {
      const basicInfo = { id: 1, name: 'John' };
      const metaData = { role: 'admin', email: 'john@test.com' };
      const result = Objecter.merge(
        [basicInfo, metaData],
        UserDetailDTO,
        [{ from: 'id' }, { from: 'name' }, { from: 'role' }, { from: 'email' }],
        { strictMapping: false },
      );
      expect(result.id).toBe(1);
      expect(result.name).toBe('John');
      expect(result.role).toBe('admin');
      expect(result.email).toBe('john@test.com');
    });

    it('should maintain reference integrity (no source mutation)', () => {
      const sourceA = { name: 'John' };
      const sourceB = { name: 'Jane' };
      const originalA = { ...sourceA };
      Objecter.merge([sourceA, sourceB], UserDetailDTO, [{ from: 'name' }], { strictMapping: false });
      expect(sourceA).toEqual(originalA);
    });
  });

  describe('Negative Cases', () => {
    it('should handle null elements in source array gracefully', () => {
      const result = Objecter.merge([null, undefined, { id: 1 }], UserDetailDTO, [{ from: 'id' }], {
        strictMapping: false,
      });
      expect(result.id).toBe(1);
    });
  });
});
