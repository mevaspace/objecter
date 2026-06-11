import type { MappingContext } from './mapping-context.type';
import type { ValidationResult } from './validation-result.type';

/**
 * Async validation function for field validation
 * Use with convertAsync, convertArrayAsync, or mapAsync methods
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type AsyncValidateFn<T = any> = (
  value: T,
  fieldName: string,
  context?: MappingContext,
) => Promise<ValidationResult>;
