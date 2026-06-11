import type { MappingContext } from './mapping-context.type';
import type { ValidationResult } from './validation-result.type';

/**
 * Validation function for field validation
 */
export type ValidateFn<T = unknown> = (value: T, fieldName: string, context?: MappingContext) => ValidationResult;
