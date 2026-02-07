import { Objecter } from '../../dist/index';

describe('E2E TypeScript Consumer', () => {
  it('should convert using built artifact', () => {
    class Target {
      id: number = 0;
      name: string = '';
    }

    const source = { id: 1, name: 'TS' };
    const mapping = [
      { from: 'id', to: 'id' },
      { from: 'name', to: 'name' },
    ];

    const result = Objecter.convert(source, Target, mapping);
    expect(result.id).toBe(1);
    expect(result.name).toBe('TS');
    expect(result).toBeInstanceOf(Target);
  });
});
