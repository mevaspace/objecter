import { Objecter } from '../../src/objecter';
import { AutoMapTarget, UserDTO } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Feature 5: Auto Mapping', () => {
  describe('Positive Cases', () => {
    it('should auto map matching fields and ignore extra', () => {
      const source = { id: 1, name: 'A', extra: 'B' };
      const result = Objecter.convert(source, AutoMapTarget, [], { autoMap: true });
      expect(result.id).toBe(1);
      expect(result.name).toBe('A');
      expect((result as unknown as Record<string, unknown>)['extra']).toBeUndefined();
    });

    it('should combine auto map with explicit mapping for override', () => {
      const source = { id: 1, status: 'ACTIVE' };
      const result = Objecter.convert(
        source,
        UserDTO,
        [{ from: 'status', to: 'status', transform: (v: unknown) => (v as string).toLowerCase() }],
        { autoMap: true, strictMapping: false },
      );
      expect(result.id).toBe(1);
      expect(result.status).toBe('active');
    });
  });

  describe('Negative Cases', () => {
    it('should copy value as-is when types mismatch (string id → number field)', () => {
      const source = { id: '123', name: 'test' };
      const result = Objecter.convert(source, AutoMapTarget, [], { autoMap: true });
      expect(result.id).toBe('123');
    });
  });
});
