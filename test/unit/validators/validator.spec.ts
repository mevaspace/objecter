import { Validators } from '../../../src/validators/validator';

describe('Validators', () => {
  const dummyContext = { source: {}, targetType: Object, data: {} } as any;

  describe('required()', () => {
    const validate = Validators.required();

    it('should return valid for non-null values', () => {
      expect(validate('hello', 'name', dummyContext).valid).toBe(true);
      expect(validate(0, 'count', dummyContext).valid).toBe(true);
      expect(validate(false, 'flag', dummyContext).valid).toBe(true);
      expect(validate('', 'empty', dummyContext).valid).toBe(true);
    });

    it('should return invalid for null', () => {
      const result = validate(null, 'name', dummyContext);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['name is required']);
    });

    it('should return invalid for undefined', () => {
      const result = validate(undefined, 'name', dummyContext);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['name is required']);
    });
  });

  describe('pattern()', () => {
    const emailPattern = Validators.pattern(/^[^@]+@[^@]+$/);

    it('should return valid for matching string', () => {
      expect(emailPattern('test@example.com', 'email', dummyContext).valid).toBe(true);
    });

    it('should return invalid for non-matching string', () => {
      const result = emailPattern('not-email', 'email', dummyContext);
      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('does not match required pattern');
    });

    it('should return invalid for non-string input', () => {
      const result = emailPattern(42 as any, 'email', dummyContext);
      expect(result.valid).toBe(false);
    });

    it('should use custom error message', () => {
      const validate = Validators.pattern(/^\d+$/, 'Must be digits only');
      const result = validate('abc', 'code', dummyContext);
      expect(result.errors).toEqual(['Must be digits only']);
    });
  });

  describe('oneOf()', () => {
    const validate = Validators.oneOf(['admin', 'user', 'guest']);

    it('should return valid for allowed value', () => {
      expect(validate('admin', 'role', dummyContext).valid).toBe(true);
    });

    it('should return invalid for disallowed value', () => {
      const result = validate('superadmin', 'role', dummyContext);
      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('must be one of');
    });
  });

  describe('nonEmptyArray()', () => {
    const validate = Validators.nonEmptyArray();

    it('should return valid for non-empty array', () => {
      expect(validate([1, 2], 'items', dummyContext).valid).toBe(true);
    });

    it('should return invalid for empty array', () => {
      const result = validate([], 'items', dummyContext);
      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('must be a non-empty array');
    });

    it('should return invalid for non-array', () => {
      const result = validate('not-array' as any, 'items', dummyContext);
      expect(result.valid).toBe(false);
    });
  });

  describe('custom()', () => {
    const isPositive = Validators.custom<number>((v) => v > 0, 'must be positive');

    it('should return valid when predicate passes', () => {
      expect(isPositive(5, 'amount', dummyContext).valid).toBe(true);
    });

    it('should return invalid when predicate fails', () => {
      const result = isPositive(-1, 'amount', dummyContext);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['amount: must be positive']);
    });
  });
});
