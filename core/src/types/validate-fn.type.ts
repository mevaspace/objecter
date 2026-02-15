import type { MappingContext } from './mapping-context.interface';
import type { ValidationResult } from './validation-result.interface';

/**
 * Validation function for field validation
 */
export type ValidateFn<T = any> = (value: T, fieldName: string, context?: MappingContext) => ValidationResult;
