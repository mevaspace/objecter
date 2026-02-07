import { Transformers } from './transformers';

describe('Transformers', () => {
  describe('toUpperCase', () => {
    it('should convert string to uppercase', () => {
      const transform = Transformers.toUpperCase();
      expect(transform('hello', {})).toBe('HELLO');
    });

    it('should return non-string as-is', () => {
      const transform = Transformers.toUpperCase();
      expect(transform(123 as any, {})).toBe(123);
    });
  });

  describe('toLowerCase', () => {
    it('should convert string to lowercase', () => {
      const transform = Transformers.toLowerCase();
      expect(transform('HELLO', {})).toBe('hello');
    });
  });

  describe('trim', () => {
    it('should trim whitespace', () => {
      const transform = Transformers.trim();
      expect(transform('  hello  ', {})).toBe('hello');
    });
  });

  describe('toNumber', () => {
    it('should convert string to number', () => {
      const transform = Transformers.toNumber();
      expect(transform('123', {})).toBe(123);
      expect(transform('12.34', {})).toBe(12.34);
    });

    it('should throw for invalid number', () => {
      const transform = Transformers.toNumber();
      expect(() => transform('abc', {})).toThrow('Cannot convert');
    });

    it('should throw for null/undefined/empty string (Strict Mode)', () => {
      const transform = Transformers.toNumber();
      expect(() => transform(null, {})).toThrow();
      expect(() => transform(undefined, {})).toThrow();
      expect(() => transform('', {})).toThrow();
    });
  });

  describe('toString', () => {
    it('should convert number to string', () => {
      const transform = Transformers.toString();
      expect(transform(123, {})).toBe('123');
    });
  });

  describe('toBoolean', () => {
    it('should return boolean as-is', () => {
      const transform = Transformers.toBoolean();
      expect(transform(true, {})).toBe(true);
      expect(transform(false, {})).toBe(false);
    });

    it('should convert truthy strings', () => {
      const transform = Transformers.toBoolean();
      expect(transform('true', {})).toBe(true);
      expect(transform('1', {})).toBe(true);
      expect(transform('yes', {})).toBe(true);
      expect(transform('on', {})).toBe(true);
    });

    it('should convert falsy strings', () => {
      const transform = Transformers.toBoolean();
      expect(transform('false', {})).toBe(false);
      expect(transform('0', {})).toBe(false);
      expect(transform('no', {})).toBe(false);
      expect(transform('off', {})).toBe(false);
    });

    it('should convert non-boolean/string using Boolean()', () => {
      const transform = Transformers.toBoolean();
      expect(transform(1, {})).toBe(true);
      expect(transform(0, {})).toBe(false);
      expect(transform(null, {})).toBe(false);
    });
  });

  describe('toDate', () => {
    it('should convert string to Date', () => {
      const transform = Transformers.toDate();
      const result = transform('2024-01-01', {});
      expect(result).toBeInstanceOf(Date);
    });

    it('should throw for invalid date', () => {
      const transform = Transformers.toDate();
      expect(() => transform('invalid', {})).toThrow('Cannot convert');
    });

    it('should return Date instance as-is', () => {
      const transform = Transformers.toDate();
      const date = new Date('2024-01-01');
      const result = transform(date, {});
      expect(result).toBe(date);
    });
  });

  describe('toISOString', () => {
    it('should format Date to ISO string', () => {
      const transform = Transformers.toISOString();
      const date = new Date('2024-01-01T00:00:00.000Z');
      expect(transform(date, {})).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should convert string to ISO string', () => {
      const transform = Transformers.toISOString();
      expect(transform('2024-01-01T00:00:00.000Z', {})).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should throw for invalid date string', () => {
      const transform = Transformers.toISOString();
      expect(() => transform('invalid-date', {})).toThrow('Cannot convert');
    });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON', () => {
      const transform = Transformers.parseJSON<{ a: number }>();
      expect(transform('{"a":1}', {})).toEqual({ a: 1 });
    });

    it('should throw for invalid JSON', () => {
      const transform = Transformers.parseJSON();
      expect(() => transform('invalid', {})).toThrow('Invalid JSON');
    });

    it('should return non-string value as-is', () => {
      const transform = Transformers.parseJSON<{ a: number }>();
      const obj = { a: 1 };
      expect(transform(obj as unknown as string, {})).toBe(obj);
    });
  });

  describe('toJSON', () => {
    it('should convert object to JSON', () => {
      const transform = Transformers.toJSON();
      expect(transform({ a: 1 }, {})).toBe('{"a":1}');
    });
  });

  describe('round', () => {
    it('should round to specified decimals', () => {
      const transform = Transformers.round(2);
      expect(transform(3.14159, {})).toBe(3.14);
    });

    it('should round to integer by default', () => {
      const transform = Transformers.round();
      expect(transform(3.7, {})).toBe(4);
    });
  });

  describe('clamp', () => {
    it('should clamp below min', () => {
      const transform = Transformers.clamp(0, 100);
      expect(transform(-10, {})).toBe(0);
    });

    it('should clamp above max', () => {
      const transform = Transformers.clamp(0, 100);
      expect(transform(150, {})).toBe(100);
    });

    it('should not change value in range', () => {
      const transform = Transformers.clamp(0, 100);
      expect(transform(50, {})).toBe(50);
    });
  });

  describe('defaultTo', () => {
    it('should return default for null', () => {
      const transform = Transformers.defaultTo('default');
      expect(transform(null, {})).toBe('default');
    });

    it('should return default for undefined', () => {
      const transform = Transformers.defaultTo('default');
      expect(transform(undefined, {})).toBe('default');
    });

    it('should return value if defined', () => {
      const transform = Transformers.defaultTo('default');
      expect(transform('value', {})).toBe('value');
    });
  });

  describe('mapValue', () => {
    it('should map value', () => {
      const transform = Transformers.mapValue({ a: 'A', b: 'B' });
      expect(transform('a', {})).toBe('A');
    });

    it('should return fallback if not found', () => {
      const transform = Transformers.mapValue({ a: 'A' }, 'X');
      expect(transform('z', {})).toBe('X');
    });

    it('should throw if not found and no fallback', () => {
      const transform = Transformers.mapValue({ a: 'A' });
      expect(() => transform('z', {})).toThrow('No mapping found');
    });
  });

  describe('pipe', () => {
    it('should chain transforms', () => {
      const transform = Transformers.pipe(Transformers.trim(), Transformers.toUpperCase());
      expect(transform('  hello  ', {})).toBe('HELLO');
    });
  });

  describe('when', () => {
    it('should apply transform when condition true', () => {
      const transform = Transformers.when<string>((v) => v.length > 3, Transformers.toUpperCase());
      expect(transform('hello', {})).toBe('HELLO');
    });

    it('should return as-is when condition false', () => {
      const transform = Transformers.when<string>((v) => v.length > 10, Transformers.toUpperCase());
      expect(transform('hello', {})).toBe('hello');
    });
  });

  describe('pick', () => {
    it('should extract nested value', () => {
      const transform = Transformers.pick('user.name');
      expect(transform({ user: { name: 'John' } }, {})).toBe('John');
    });
  });

  describe('split', () => {
    it('should split string by delimiter', () => {
      const transform = Transformers.split(',');
      expect(transform('a,b,c', {})).toEqual(['a', 'b', 'c']);
    });
  });

  describe('join', () => {
    it('should join array by delimiter', () => {
      const transform = Transformers.join('-');
      expect(transform(['a', 'b', 'c'], {})).toBe('a-b-c');
    });
  });
});
