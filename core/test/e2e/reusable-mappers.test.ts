import { Objecter } from '../../src/objecter';
import { UserDTO, ItemDTO } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Feature 4: Reusable Mappers', () => {
  describe('Positive Cases', () => {
    it('should create reusable mapper and produce consistent results for multiple items', () => {
      const mapper = Objecter.createMapper<{ fullName: string }, ItemDTO>(ItemDTO, [{ from: 'fullName' }], {
        strictMapping: false,
      });
      const data = Array.from({ length: 100 }, (_, i) => ({ fullName: `User_${i}` }));
      const results = data.map((d) => mapper(d));
      expect(results).toHaveLength(100);
      results.forEach((r, i) => {
        expect(r).toBeInstanceOf(ItemDTO);
        expect(r.fullName).toBe(`User_${i}`);
      });
    });

    it('should maintain isolation between mapper instances with different options', () => {
      const strictMapper = Objecter.createMapper<{ id: number }, UserDTO>(UserDTO, [{ from: 'id', to: 'id' }], {
        strictMapping: true,
      });
      const looseMapper = Objecter.createMapper<{ id: number }, UserDTO>(UserDTO, [{ from: 'id', to: 'id' }], {
        strictMapping: false,
      });

      expect(looseMapper({ id: 1 }).id).toBe(1);
      expect(strictMapper({ id: 1 }).id).toBe(1);
    });

    it('should handle concurrent execution without data leaking', () => {
      const mapper = Objecter.createMapper<{ fullName: string }, ItemDTO>(
        ItemDTO,
        [{ from: 'fullName', transform: (v: unknown) => (v as string).toUpperCase() }],
        { strictMapping: false },
      );

      const r1 = mapper({ fullName: 'alice' });
      const r2 = mapper({ fullName: 'bob' });
      const r3 = mapper({ fullName: 'charlie' });

      expect(r1.fullName).toBe('ALICE');
      expect(r2.fullName).toBe('BOB');
      expect(r3.fullName).toBe('CHARLIE');
    });
  });
});
