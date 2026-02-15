import { Transformers } from '../../../src/transformers/transformers';

describe('Transformers', () => {
  const dummySource = {};
  const dummyContext = { source: {}, targetType: Object, data: {} } as any;

  describe('toUpperCase()', () => {
    const transform = Transformers.toUpperCase();
    it('should uppercase string', () => {
      expect(transform('hello', dummySource, dummyContext)).toBe('HELLO');
    });
    it('should return non-string as-is', () => {
      expect(transform(42 as any, dummySource, dummyContext)).toBe(42);
    });
  });

  describe('toLowerCase()', () => {
    const transform = Transformers.toLowerCase();
    it('should lowercase string', () => {
      expect(transform('HELLO', dummySource, dummyContext)).toBe('hello');
    });
    it('should return non-string as-is', () => {
      expect(transform(42 as any, dummySource, dummyContext)).toBe(42);
    });
  });

  describe('trim()', () => {
    const transform = Transformers.trim();
    it('should trim whitespace', () => {
      expect(transform('  hello  ', dummySource, dummyContext)).toBe('hello');
    });
    it('should return non-string as-is', () => {
      expect(transform(42 as any, dummySource, dummyContext)).toBe(42);
    });
  });

  describe('toNumber()', () => {
    const transform = Transformers.toNumber();
    it('should convert valid number string', () => {
      expect(transform('42', dummySource, dummyContext)).toBe(42);
    });
    it('should convert numeric value', () => {
      expect(transform(3.14, dummySource, dummyContext)).toBe(3.14);
    });
    it('should throw for null', () => {
      expect(() => transform(null, dummySource, dummyContext)).toThrow(TypeError);
    });
    it('should throw for undefined', () => {
      expect(() => transform(undefined, dummySource, dummyContext)).toThrow(TypeError);
    });
    it('should throw for empty string', () => {
      expect(() => transform('', dummySource, dummyContext)).toThrow(TypeError);
    });
    it('should throw for NaN-producing value', () => {
      expect(() => transform('abc', dummySource, dummyContext)).toThrow(TypeError);
    });
    it('should throw for symbol with readable message', () => {
      expect(() => transform(Symbol('test'), dummySource, dummyContext)).toThrow(TypeError);
    });
  });

  describe('toString()', () => {
    const transform = Transformers.toString();
    it('should convert number to string', () => {
      expect(transform(42, dummySource, dummyContext)).toBe('42');
    });
    it('should convert boolean to string', () => {
      expect(transform(true, dummySource, dummyContext)).toBe('true');
    });
  });

  describe('toBoolean()', () => {
    const transform = Transformers.toBoolean();
    it('should return boolean as-is', () => {
      expect(transform(true, dummySource, dummyContext)).toBe(true);
      expect(transform(false, dummySource, dummyContext)).toBe(false);
    });
    it('should convert truthy strings', () => {
      expect(transform('true', dummySource, dummyContext)).toBe(true);
      expect(transform('1', dummySource, dummyContext)).toBe(true);
      expect(transform('yes', dummySource, dummyContext)).toBe(true);
      expect(transform('on', dummySource, dummyContext)).toBe(true);
      expect(transform('TRUE', dummySource, dummyContext)).toBe(true);
    });
    it('should convert falsy strings', () => {
      expect(transform('false', dummySource, dummyContext)).toBe(false);
      expect(transform('0', dummySource, dummyContext)).toBe(false);
      expect(transform('no', dummySource, dummyContext)).toBe(false);
      expect(transform('off', dummySource, dummyContext)).toBe(false);
    });
    it('should use Boolean() for unrecognized strings', () => {
      expect(transform('random', dummySource, dummyContext)).toBe(true);
    });
    it('should use Boolean() for non-string types', () => {
      expect(transform(1, dummySource, dummyContext)).toBe(true);
      expect(transform(0, dummySource, dummyContext)).toBe(false);
    });
  });

  describe('toDate()', () => {
    const transform = Transformers.toDate();
    it('should return Date as-is', () => {
      const date = new Date('2026-01-01');
      expect(transform(date, dummySource, dummyContext)).toBe(date);
    });
    it('should convert valid date string', () => {
      const result = transform('2026-01-01', dummySource, dummyContext);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2026);
    });
    it('should convert timestamp number', () => {
      const ts = Date.now();
      const result = transform(ts, dummySource, dummyContext);
      expect(result.getTime()).toBe(ts);
    });
    it('should throw for invalid date string', () => {
      expect(() => transform('not-a-date', dummySource, dummyContext)).toThrow(TypeError);
    });
  });

  describe('toISOString()', () => {
    const transform = Transformers.toISOString();
    it('should convert Date to ISO string', () => {
      const date = new Date('2026-01-01T00:00:00.000Z');
      expect(transform(date, dummySource, dummyContext)).toBe('2026-01-01T00:00:00.000Z');
    });
    it('should convert valid date string to ISO string', () => {
      const result = transform('2026-06-15', dummySource, dummyContext);
      expect(result).toContain('2026-06-15');
    });
    it('should throw for invalid input', () => {
      expect(() => transform('invalid', dummySource, dummyContext)).toThrow(TypeError);
    });
  });

  describe('parseJSON()', () => {
    const transform = Transformers.parseJSON<{ a: number }>();
    it('should parse valid JSON string', () => {
      expect(transform('{"a":1}', dummySource, dummyContext)).toEqual({ a: 1 });
    });
    it('should throw for invalid JSON', () => {
      expect(() => transform('{invalid}', dummySource, dummyContext)).toThrow(SyntaxError);
    });
    it('should return non-string as-is', () => {
      const obj = { a: 1 };
      expect(transform(obj as any, dummySource, dummyContext)).toBe(obj);
    });
  });

  describe('toJSON()', () => {
    const transform = Transformers.toJSON();
    it('should serialize object to JSON string', () => {
      expect(transform({ a: 1 }, dummySource, dummyContext)).toBe('{"a":1}');
    });
    it('should serialize primitives', () => {
      expect(transform(42, dummySource, dummyContext)).toBe('42');
    });
  });

  describe('round()', () => {
    it('should round to 0 decimals by default', () => {
      expect(Transformers.round()(3.7, dummySource, dummyContext)).toBe(4);
    });
    it('should round to specified decimals', () => {
      expect(Transformers.round(2)(3.456, dummySource, dummyContext)).toBe(3.46);
    });
  });

  describe('clamp()', () => {
    const transform = Transformers.clamp(0, 100);
    it('should return value within range', () => {
      expect(transform(50, dummySource, dummyContext)).toBe(50);
    });
    it('should clamp below minimum', () => {
      expect(transform(-5, dummySource, dummyContext)).toBe(0);
    });
    it('should clamp above maximum', () => {
      expect(transform(200, dummySource, dummyContext)).toBe(100);
    });
  });

  describe('defaultTo()', () => {
    const transform = Transformers.defaultTo('N/A');
    it('should return value if not null/undefined', () => {
      expect(transform('hello', dummySource, dummyContext)).toBe('hello');
    });
    it('should return default for null', () => {
      expect(transform(null, dummySource, dummyContext)).toBe('N/A');
    });
    it('should return default for undefined', () => {
      expect(transform(undefined, dummySource, dummyContext)).toBe('N/A');
    });
  });

  describe('mapValue()', () => {
    it('should map known value', () => {
      const transform = Transformers.mapValue({ a: 1, b: 2 });
      expect(transform('a', dummySource, dummyContext)).toBe(1);
    });
    it('should use fallback for unknown value', () => {
      const transform = Transformers.mapValue({ a: 1 }, 0);
      expect(transform('z', dummySource, dummyContext)).toBe(0);
    });
    it('should throw for unknown value without fallback', () => {
      const transform = Transformers.mapValue({ a: 1 });
      expect(() => transform('z', dummySource, dummyContext)).toThrow("No mapping found for value 'z'");
    });
  });

  describe('pipe()', () => {
    it('should chain multiple transforms', () => {
      const transform = Transformers.pipe(Transformers.trim(), Transformers.toUpperCase());
      expect(transform('  hello  ', dummySource, dummyContext)).toBe('HELLO');
    });
  });

  describe('when()', () => {
    const transform = Transformers.when((v: string) => v.length > 3, Transformers.toUpperCase());
    it('should apply transform when predicate is true', () => {
      expect(transform('hello', dummySource, dummyContext)).toBe('HELLO');
    });
    it('should return original when predicate is false', () => {
      expect(transform('hi', dummySource, dummyContext)).toBe('hi');
    });
  });

  describe('pick()', () => {
    it('should extract nested value', () => {
      const transform = Transformers.pick<string>('user.name');
      expect(transform({ user: { name: 'John' } }, dummySource, dummyContext)).toBe('John');
    });
  });

  describe('split()', () => {
    const transform = Transformers.split(',');
    it('should split string', () => {
      expect(transform('a,b,c', dummySource, dummyContext)).toEqual(['a', 'b', 'c']);
    });
    it('should return empty array for non-string', () => {
      expect(transform(42 as any, dummySource, dummyContext)).toEqual([]);
    });
  });

  describe('join()', () => {
    const transform = Transformers.join('-');
    it('should join array', () => {
      expect(transform(['a', 'b', 'c'], dummySource, dummyContext)).toBe('a-b-c');
    });
    it('should convert non-array to string', () => {
      expect(transform('hello' as any, dummySource, dummyContext)).toBe('hello');
    });
  });
});
