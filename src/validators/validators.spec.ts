import { Validators } from './validator';

describe('Validators', () => {
  describe('required', () => {
    const validate = Validators.required();

    it('should fail for null', () => {
      const result = validate(null, 'field');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('field is required');
    });

    it('should fail for undefined', () => {
      const result = validate(undefined, 'field');
      expect(result.valid).toBe(false);
    });

    it('should pass for any value', () => {
      expect(validate('value', 'field').valid).toBe(true);
      expect(validate(0, 'field').valid).toBe(true);
      expect(validate('', 'field').valid).toBe(true);
    });
  });

  describe('pattern', () => {
    const validate = Validators.pattern(/^\d+$/, 'Must be digits only');

    it('should fail for non-matching string', () => {
      const result = validate('abc', 'field');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be digits only');
    });

    it('should pass for matching string', () => {
      expect(validate('123', 'field').valid).toBe(true);
    });
  });

  describe('oneOf', () => {
    const validate = Validators.oneOf(['a', 'b', 'c']);

    it('should fail for value not in list', () => {
      const result = validate('d', 'field');
      expect(result.valid).toBe(false);
    });

    it('should pass for value in list', () => {
      expect(validate('a', 'field').valid).toBe(true);
      expect(validate('b', 'field').valid).toBe(true);
    });
  });

  describe('nonEmptyArray', () => {
    const validate = Validators.nonEmptyArray();

    it('should fail for empty array', () => {
      const result = validate([], 'field');
      expect(result.valid).toBe(false);
    });

    it('should fail for non-array', () => {
      const result = validate('not array' as any, 'field');
      expect(result.valid).toBe(false);
    });

    it('should pass for non-empty array', () => {
      expect(validate([1], 'field').valid).toBe(true);
      expect(validate([1, 2, 3], 'field').valid).toBe(true);
    });
  });

  describe('custom', () => {
    const validate = Validators.custom<number>((v) => v % 2 === 0, 'Must be even');

    it('should fail when predicate returns false', () => {
      const result = validate(3, 'field');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('field: Must be even');
    });

    it('should pass when predicate returns true', () => {
      expect(validate(4, 'field').valid).toBe(true);
    });
  });
});
