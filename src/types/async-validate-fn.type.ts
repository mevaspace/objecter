import type { MappingContext } from './mapping-context.interface';
import type { ValidationResult } from './validation-result.interface';

/**
 * Async validation function for field validation
 * Use with convertAsync, convertArrayAsync, or mapAsync methods
 */
export type AsyncValidateFn<T = any> = (
  value: T,
  fieldName: string,
  context?: MappingContext,
) => Promise<ValidationResult>;
