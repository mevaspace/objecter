import { MappingError, ValidationError, isMappingError, isValidationError } from './index';

describe('MappingError', () => {
  it('should create error with message and field', () => {
    const error = new MappingError('Test error', 'fieldName', 'sourceValue');
    expect(error.message).toBe('Test error');
    expect(error.field).toBe('fieldName');
    expect(error.sourceValue).toBe('sourceValue');
  });

  it('should be instance of Error', () => {
    const error = new MappingError('Test', 'field', null);
    expect(error).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const error = new MappingError('Test', 'field', null);
    expect(error.name).toBe('MappingError');
  });
});

describe('isMappingError', () => {
  it('should return true for MappingError', () => {
    const error = new MappingError('Test', 'field', null);
    expect(isMappingError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Test');
    expect(isMappingError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isMappingError(null)).toBe(false);
    expect(isMappingError(undefined)).toBe(false);
    expect(isMappingError('string')).toBe(false);
    expect(isMappingError({})).toBe(false);
  });
});

describe('ValidationError', () => {
  it('should create error with message and errors map', () => {
    const errors = new Map<string, string[]>();
    errors.set('email', ['Invalid email']);
    const error = new ValidationError('Validation failed', errors);
    expect(error.message).toBe('Validation failed');
    expect(error.fieldErrors).toBe(errors);
  });

  it('should be instance of Error', () => {
    const error = new ValidationError('Test', new Map());
    expect(error).toBeInstanceOf(Error);
  });

  it('should have correct name', () => {
    const error = new ValidationError('Test', new Map());
    expect(error.name).toBe('ValidationError');
  });
});

describe('isValidationError', () => {
  it('should return true for ValidationError', () => {
    const error = new ValidationError('Test', new Map());
    expect(isValidationError(error)).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Test');
    expect(isValidationError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isValidationError(null)).toBe(false);
    expect(isValidationError(undefined)).toBe(false);
    expect(isValidationError('string')).toBe(false);
    expect(isValidationError({})).toBe(false);
  });
});
