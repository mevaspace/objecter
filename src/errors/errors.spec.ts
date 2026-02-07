import { MappingError, ValidationError } from './index';

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
