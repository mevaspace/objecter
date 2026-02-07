import { ValidateFn, Validator, ValidationResult } from '../types';

/**
 * Normalizes a validator into a standardized ValidateFn
 */
export function normalizeValidator<T>(validator: Validator<T>): ValidateFn<T> {
  // Check if it's a Zod-like schema (duck typing)
  if (typeof validator === 'object' && validator !== null && 'safeParse' in validator) {
    const schema = validator as {
      safeParse: (data: unknown) => { success: boolean; error?: { errors: { message: string }[] } };
    };
    return (value, fieldName) => {
      const result = schema.safeParse(value);
      if (result.success) {
        return { valid: true };
      }
      return {
        valid: false,
        errors: result.error?.errors.map((e) => `${fieldName}: ${e.message}`) || [`${fieldName} validation failed`],
      };
    };
  }

  // Check if it's a simple predicate function (returns boolean)
  // We need to distinguish between ValidateFn (returns ValidationResult object) and predicate (returns boolean)
  // Since we can't easily check return type at runtime without calling it, we might need a convention or try-catch?
  // Actually, ValidateFn returns { valid: boolean, errors?: string[] }.
  // A predicate returns boolean.
  // We can wrap it and check the result.
  // BUT: We are returning a wrapper function, not calling it yet.

  // Wait, if we pass a function, how do we know if it is (val) => boolean or (val) => ValidationResult?
  // We can't know for sure until we call it.
  // So the normalization function returns a wrapper that handles both?

  return (value, fieldName, context) => {
    // If it's the schema object handled above, we already returned.
    // If it's a function:
    if (typeof validator === 'function') {
      const result = (validator as (...args: unknown[]) => unknown)(value, fieldName, context);

      // If result is boolean (predicate)
      if (typeof result === 'boolean') {
        return result ? { valid: true } : { valid: false, errors: [`${fieldName} is invalid`] };
      }

      // If result is object with 'valid' property (ValidateFn)
      if (typeof result === 'object' && result !== null && 'valid' in result) {
        return result as ValidationResult;
      }

      // Fallback if weird return type
      return { valid: false, errors: [`${fieldName}: Validator returned invalid result type`] };
    }

    return { valid: true };
  };
}
