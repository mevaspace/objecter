import { ValidationError, isValidationError } from '../../../src/errors/validation.error';

describe('ValidationError', () => {
  it('should set name to ValidationError', () => {
    const fieldErrors = new Map<string, string[]>();
    const error = new ValidationError('validation failed', fieldErrors);
    expect(error.name).toBe('ValidationError');
  });

  it('should store message and fieldErrors', () => {
    const fieldErrors = new Map<string, string[]>([
      ['email', ['invalid format']],
      ['age', ['must be positive', 'required']],
    ]);
    const error = new ValidationError('fail', fieldErrors);
    expect(error.message).toBe('fail');
    expect(error.fieldErrors).toBe(fieldErrors);
    expect(error.fieldErrors.get('email')).toEqual(['invalid format']);
    expect(error.fieldErrors.get('age')).toEqual(['must be positive', 'required']);
  });

  it('should be instance of Error and ValidationError', () => {
    const error = new ValidationError('msg', new Map());
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ValidationError);
  });
});

describe('isValidationError', () => {
  it('should return true for ValidationError instances', () => {
    const error = new ValidationError('msg', new Map());
    expect(isValidationError(error)).toBe(true);
  });

  it('should return false for plain Error', () => {
    expect(isValidationError(new Error('plain'))).toBe(false);
  });

  it('should return false for MappingError-like object', () => {
    expect(isValidationError({ name: 'ValidationError', message: 'fake' })).toBe(false);
  });

  it('should return false for null and undefined', () => {
    expect(isValidationError(null)).toBe(false);
    expect(isValidationError(undefined)).toBe(false);
  });
});
