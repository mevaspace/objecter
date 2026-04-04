import { asTarget } from '../../../src/utils/as-target.util';

describe('asTarget', () => {
  it('should return Object constructor casted as type', () => {
    const target = asTarget<{ someField: string }>();
    expect(target).toBe(Object);
  });
});
