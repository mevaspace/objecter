import type { ValidateFn } from '../types';

/**
 * Collection of common validators for field validation
 */
export const Validators = {
  /**
   * Validates that value is not null or undefined
   */
  required: (): ValidateFn => (value, fieldName) => ({
    valid: value !== null && value !== undefined,
    errors: value === null || value === undefined ? [`${fieldName} is required`] : undefined,
  }),

  /**
   * Validates value matches regex pattern
   */
  pattern:
    (regex: RegExp, message?: string): ValidateFn<string> =>
    (value, fieldName) => ({
      valid: typeof value === 'string' && regex.test(value),
      errors:
        typeof value !== 'string' || !regex.test(value)
          ? [message || `${fieldName} does not match required pattern`]
          : undefined,
    }),

  /**
   * Validates value is one of allowed values
   */
  oneOf:
    <T>(allowedValues: T[]): ValidateFn<T> =>
    (value, fieldName) => ({
      valid: allowedValues.includes(value),
      errors: !allowedValues.includes(value) ? [`${fieldName} must be one of: ${allowedValues.join(', ')}`] : undefined,
    }),

  /**
   * Validates array is not empty
   */
  nonEmptyArray: (): ValidateFn<unknown[]> => (value, fieldName) => ({
    valid: Array.isArray(value) && value.length > 0,
    errors: !Array.isArray(value) || value.length === 0 ? [`${fieldName} must be a non-empty array`] : undefined,
  }),

  /**
   * Custom validator wrapper
   */
  custom:
    <T>(predicate: (value: T) => boolean, message: string): ValidateFn<T> =>
    (value, fieldName) => ({
      valid: predicate(value),
      errors: !predicate(value) ? [`${fieldName}: ${message}`] : undefined,
    }),
};
