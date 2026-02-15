import { Objecter } from '../../src/objecter';
import { ItemDTO } from './fixtures';

describe('Feature 9: Performance', () => {
  it('should map 10,000 items in under 1 second', () => {
    const sources = Array.from({ length: 10_000 }, (_, i) => ({ fullName: `User_${i}` }));

    const start = performance.now();
    const results = Objecter.convertArray(sources, ItemDTO, [{ from: 'fullName' }], { strictMapping: false });
    const elapsed = performance.now() - start;

    expect(results).toHaveLength(10_000);
    expect(results[0].fullName).toBe('User_0');
    expect(results[9999].fullName).toBe('User_9999');
    expect(elapsed).toBeLessThan(1000);
  });

  it('should map 100,000 items in under 5 seconds', () => {
    const sources = Array.from({ length: 100_000 }, (_, i) => ({ fullName: `User_${i}` }));

    const start = performance.now();
    const results = Objecter.convertArray(sources, ItemDTO, [{ from: 'fullName' }], { strictMapping: false });
    const elapsed = performance.now() - start;

    expect(results).toHaveLength(100_000);
    expect(elapsed).toBeLessThan(5000);
  });

  it('should demonstrate generator memory efficiency for large arrays', () => {
    const sources = Array.from({ length: 10_000 }, (_, i) => ({ fullName: `User_${i}` }));
    const gen = Objecter.convertArrayGenerator(sources, ItemDTO, [{ from: 'fullName' }], { strictMapping: false });

    let count = 0;
    for (const item of gen) {
      expect(item).toBeInstanceOf(ItemDTO);
      count++;
    }
    expect(count).toBe(10_000);
  });
});
