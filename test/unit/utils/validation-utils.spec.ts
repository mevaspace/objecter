import { normalizeValidator, normalizeAsyncValidator } from '../../../src/utils/validation.utils';

describe('normalizeValidator', () => {
  describe('Zod-like schema', () => {
    it('should return valid result for successful safeParse', () => {
      const schema = { safeParse: (_data: unknown) => ({ success: true }) };
      const validate = normalizeValidator(schema as any);
      expect(validate('test', 'field', {} as any)).toEqual({ valid: true });
    });

    it('should return errors for failed safeParse', () => {
      const schema = {
        safeParse: () => ({ success: false, error: { errors: [{ message: 'too short' }, { message: 'invalid' }] } }),
      };
      const validate = normalizeValidator(schema as any);
      const result = validate('x', 'email', {} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['email: too short', 'email: invalid']);
    });

    it('should return fallback error when safeParse error has no errors array', () => {
      const schema = { safeParse: () => ({ success: false }) };
      const validate = normalizeValidator(schema as any);
      const result = validate('x', 'field', {} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['field validation failed']);
    });
  });

  describe('predicate function (returns boolean)', () => {
    it('should return valid when predicate returns true', () => {
      const predicate = (value: unknown) => typeof value === 'string';
      const validate = normalizeValidator(predicate as any);
      expect(validate('hello', 'name', {} as any)).toEqual({ valid: true });
    });

    it('should return invalid when predicate returns false', () => {
      const predicate = (value: unknown) => typeof value === 'string';
      const validate = normalizeValidator(predicate as any);
      const result = validate(42, 'name', {} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['name is invalid']);
    });
  });

  describe('ValidateFn (returns ValidationResult object)', () => {
    it('should pass through valid ValidationResult', () => {
      const validateFn = () => ({ valid: true });
      const validate = normalizeValidator(validateFn as any);
      expect(validate('x', 'f', {} as any)).toEqual({ valid: true });
    });

    it('should pass through invalid ValidationResult', () => {
      const validateFn = () => ({ valid: false, errors: ['custom error'] });
      const validate = normalizeValidator(validateFn as any);
      const result = validate('x', 'f', {} as any);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(['custom error']);
    });
  });

  describe('edge cases', () => {
    it('should handle validator returning unexpected type', () => {
      const weirdValidator = () => 'unexpected';
      const validate = normalizeValidator(weirdValidator as any);
      const result = validate('x', 'f', {} as any);
      expect(result.valid).toBe(false);
      expect(result.errors![0]).toContain('Validator returned invalid result type');
    });

    it('should return valid for non-function, non-schema validator', () => {
      const validate = normalizeValidator('not-a-function' as any);
      expect(validate('x', 'f', {} as any)).toEqual({ valid: true });
    });
  });
});

describe('normalizeAsyncValidator', () => {
  it('should handle async predicate returning true', async () => {
    const asyncPredicate = async () => await Promise.resolve(true);
    const result = await normalizeAsyncValidator(asyncPredicate as any, 'val', 'field');
    expect(result).toEqual({ valid: true });
  });

  it('should handle async predicate returning false', async () => {
    const asyncPredicate = async () => await Promise.resolve(false);
    const result = await normalizeAsyncValidator(asyncPredicate as any, 'val', 'field');
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['field is invalid']);
  });

  it('should handle async ValidateFn returning ValidationResult', async () => {
    const asyncValidateFn = async () => await Promise.resolve({ valid: false, errors: ['async err'] });
    const result = await normalizeAsyncValidator(asyncValidateFn as any, 'val', 'field');
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['async err']);
  });

  it('should return valid for non-function validators', async () => {
    const result = await normalizeAsyncValidator('not-a-fn' as any, 'val', 'field');
    expect(result).toEqual({ valid: true });
  });

  it('should handle async validator returning unexpected type', async () => {
    const weirdAsync = async () => await Promise.resolve('unexpected');
    const result = await normalizeAsyncValidator(weirdAsync as any, 'val', 'field');
    expect(result.valid).toBe(false);
    expect(result.errors![0]).toContain('Async validator returned invalid result type');
  });
});
