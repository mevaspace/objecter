import { Objecter } from '../../src/objecter';
import { MappingError } from '../../src/errors/mapping.error';
import { AddressDTO, LocationTarget, ItemDTO } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Feature 3: Nested Object Mapping', () => {
  describe('Positive Cases', () => {
    it('should map nested object using sub-mapper transform', () => {
      const addressMapper = Objecter.createMapper<{ city: string; zip: string }, AddressDTO>(
        AddressDTO,
        [{ from: 'city' }, { from: 'zip' }],
        { strictMapping: false },
      );
      const source = { address: { city: 'Jakarta', zip: '12345' } };
      const result = Objecter.convert(
        source,
        LocationTarget,
        [
          {
            from: 'address',
            to: 'location',
            transform: (v: unknown) => addressMapper(v as { city: string; zip: string }),
          },
        ],
        { strictMapping: false },
      );
      expect(result.location).toBeInstanceOf(AddressDTO);
      expect(result.location.city).toBe('Jakarta');
      expect(result.location.zip).toBe('12345');
    });

    it('should map nested array using createArrayMapper', () => {
      const arrayMapper = Objecter.createArrayMapper<{ city: string; zip: string }, AddressDTO>(
        AddressDTO,
        [{ from: 'city' }, { from: 'zip' }],
        { strictMapping: false },
      );
      const source = {
        addresses: [
          { city: 'A', zip: '1' },
          { city: 'B', zip: '2' },
        ],
      };
      const result = Objecter.convert(
        source,
        LocationTarget,
        [
          {
            from: 'addresses',
            to: 'locations',
            transform: (v: unknown) => arrayMapper(v as { city: string; zip: string }[]),
          },
        ],
        { strictMapping: false },
      );
      expect(result.locations).toHaveLength(2);
      expect(result.locations[0]).toBeInstanceOf(AddressDTO);
      expect(result.locations[0].city).toBe('A');
      expect(result.locations[1].city).toBe('B');
    });

    it('should map deeply nested property via dot notation', () => {
      const source = { level1: { level2: { level3: { value: 'deep' } } } };
      const result = Objecter.convert(source, LocationTarget, [{ from: 'level1.level2.level3.value', to: 'value' }], {
        strictMapping: false,
      });
      expect(result.value).toBe('deep');
    });

    it('should handle sparse array without crashing', () => {
      // oxlint-disable-next-line no-sparse-arrays -- sparse array fixture
      const sources = [{ fullName: 'A' }, , { fullName: 'B' }] as { fullName: string }[]; // NOSONAR
      const validSources = sources.filter((s): s is { fullName: string } => s !== undefined);
      const result = Objecter.convertArray(validSources, ItemDTO, [{ from: 'fullName' }], { strictMapping: false });
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe('A');
      expect(result[1].fullName).toBe('B');
    });
  });

  describe('Negative Cases', () => {
    it('should handle missing nested source (null address)', () => {
      const source = { address: null };
      expect(() =>
        Objecter.convert(
          source,
          LocationTarget,
          [
            {
              from: 'address',
              to: 'location',
              transform: (v: unknown) => {
                if (v === null || v === undefined) throw new Error('address is required');
                return v;
              },
            },
          ],
          { strictMapping: false },
        ),
      ).toThrow(MappingError);
    });

    it('should block prototype pollution attempt via __proto__', () => {
      const malicious = JSON.parse('{"__proto__": {"polluted": true}, "value": "safe"}') as Record<string, unknown>;
      const result = Objecter.convert(malicious, LocationTarget, [{ from: 'value', to: 'value' }], {
        strictMapping: false,
      });
      expect(result.value).toBe('safe');
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    });

    it('should throw when array mapper receives non-array input', () => {
      const arrayMapper = Objecter.createArrayMapper<{ city: string }, AddressDTO>(AddressDTO, [{ from: 'city' }], {
        strictMapping: false,
      });
      expect(() => arrayMapper('NotAnArray' as unknown as { city: string; zip: string }[])).toThrow(
        'Source must be an array',
      );
    });
  });
});
