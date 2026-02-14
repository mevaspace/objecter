import { MappingError, isMappingError } from '../../../src/errors/mapping.error';

describe('MappingError', () => {
  it('should set name to MappingError', () => {
    const error = new MappingError('test message', 'fieldA', 'value');
    expect(error.name).toBe('MappingError');
  });

  it('should store message, field, sourceValue, and errors', () => {
    const errors = ['err1', 'err2'];
    const error = new MappingError('fail', 'fieldX', 42, errors);
    expect(error.message).toBe('fail');
    expect(error.field).toBe('fieldX');
    expect(error.sourceValue).toBe(42);
    expect(error.errors).toEqual(['err1', 'err2']);
  });

  it('should be instance of Error and MappingError', () => {
    const error = new MappingError('msg', 'f', null);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MappingError);
  });

  it('should work without optional errors parameter', () => {
    const error = new MappingError('msg', 'f', undefined);
    expect(error.errors).toBeUndefined();
  });
});

describe('isMappingError', () => {
  it('should return true for MappingError instances', () => {
    const error = new MappingError('msg', 'f', null);
    expect(isMappingError(error)).toBe(true);
  });

  it('should return false for plain Error', () => {
    expect(isMappingError(new Error('plain'))).toBe(false);
  });

  it('should return false for string', () => {
    expect(isMappingError('not an error')).toBe(false);
  });

  it('should return false for null', () => {
    expect(isMappingError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isMappingError(undefined)).toBe(false);
  });
});
