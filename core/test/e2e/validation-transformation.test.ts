import { Objecter } from '../../src/objecter';
import { Transformers } from '../../src/transformers/transformers';
import { MappingError } from '../../src/errors/mapping.error';
import { ValidationError } from '../../src/errors/validation.error';
import { UserDTO, TrimTarget, PriceTarget, DataTarget, DateTarget } from './fixtures';

afterEach(() => {
  Objecter.resetConfig();
  Objecter.clearProfiles();
});

describe('Feature 2: Field Validation & Transformation', () => {
  describe('Positive Cases', () => {
    it('should validate age >= 18 and trim email', () => {
      const source = { age: 25, email: ' test@example.com ' };
      const result = Objecter.convert(
        source,
        UserDTO,
        [
          { from: 'age', to: 'age', validate: (v: unknown) => (v as number) >= 18 },
          { from: 'email', to: 'email', transform: Transformers.trim() },
        ],
        { strictMapping: false },
      );
      expect(result.age).toBe(25);
      expect(result.email).toBe('test@example.com');
    });

    it('should trim empty string to empty string', () => {
      const source = { text: '' };
      const result = Objecter.convert(
        source,
        TrimTarget,
        [{ from: 'text', to: 'text', transform: Transformers.trim() }],
        { strictMapping: false },
      );
      expect(result.text).toBe('');
    });

    it('should skip validation on optional null field', () => {
      const source = { age: null };
      const result = Objecter.convert(source, UserDTO, [{ from: 'age', to: 'age', optional: true, skipIfNull: true }], {
        strictMapping: false,
      });
      expect(result).toBeInstanceOf(UserDTO);
    });

    it('should validate Date object via custom predicate', () => {
      const source = { date: new Date('2023-01-01') };
      const isValidDate = (v: unknown): boolean => v instanceof Date && !Number.isNaN(v.getTime());
      const result = Objecter.convert(source, DateTarget, [{ from: 'date', to: 'date', validate: isValidDate }], {
        strictMapping: false,
      });
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should sanitize XSS via transform', () => {
      const source = { bio: '<script>alert(1)</script>' };
      const sanitize = (v: unknown) => (v as string).replaceAll(/</gi, '&lt;').replaceAll(/>/gi, '&gt;');
      const result = Objecter.convert(source, DataTarget, [{ from: 'bio', to: 'bio', transform: sanitize }], {
        strictMapping: false,
      });
      expect(result.bio).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result.bio).not.toContain('<script>');
    });

    it('should use context data in transform (currency conversion)', () => {
      const source = { price: 100 };
      const result = Objecter.convert(
        source,
        PriceTarget,
        [
          {
            from: 'price',
            to: 'idrPrice',
            transform: (val: unknown, _src: unknown, ctx) => {
              const rate = (ctx?.data as Record<string, number>)?.currencyRate ?? 1;
              return (val as number) * rate;
            },
          },
        ],
        { strictMapping: false, context: { currencyRate: 15000 } },
      );
      expect(result.idrPrice).toBe(1500000);
    });
  });

  describe('Negative Cases', () => {
    it('should throw ValidationError when age < 18', () => {
      const source = { age: 15 };
      expect(() =>
        Objecter.convert(source, UserDTO, [{ from: 'age', to: 'age', validate: (v: unknown) => (v as number) >= 18 }], {
          strictMapping: false,
          throwOnValidationError: true,
        }),
      ).toThrow(ValidationError);
    });

    it('should wrap transform error (JSON.parse) as MappingError', () => {
      const source = { data: '{invalid-json' };
      expect(() =>
        Objecter.convert(
          source,
          DataTarget,
          [{ from: 'data', to: 'data', transform: (v: unknown) => JSON.parse(v as string) as unknown }],
          { strictMapping: false },
        ),
      ).toThrow(MappingError);
    });

    it('should reject NaN via custom validation', () => {
      const source = { age: Number.NaN };
      const isFiniteNumber = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v);
      expect(() =>
        Objecter.convert(source, UserDTO, [{ from: 'age', to: 'age', validate: isFiniteNumber }], {
          strictMapping: false,
          throwOnValidationError: true,
        }),
      ).toThrow(ValidationError);
    });

    it('should wrap NPE from transform on null as MappingError', () => {
      const source = { data: null };
      expect(() =>
        Objecter.convert(
          source,
          DataTarget,
          [{ from: 'data', to: 'data', transform: (v: unknown) => (v as string).toString() }],
          { strictMapping: false },
        ),
      ).toThrow(MappingError);
    });
  });
});
