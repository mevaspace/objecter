import { ValidateFn } from './validate-fn.type';

/**
 * Validator type which can be:
 * 1. A standard ValidateFn (returns ValidationResult)
 * 2. A simple predicate function (returns boolean)
 * 3. A Zod-like schema object (has safeParse method)
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type Validator<T = any> =
  | ValidateFn<T>
  | ((value: T) => boolean)
  | { safeParse: (data: unknown) => { success: boolean; error?: { errors: { message: string }[] } } };

/**
 * Async validator type which can be:
 * 1. An AsyncValidateFn (returns Promise<ValidationResult>)
 * 2. An async predicate function (returns Promise<boolean>)
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type AsyncValidator<T = any> =
  | ((value: T, fieldName: string, context?: unknown) => Promise<{ valid: boolean; errors?: string[] }>)
  | ((value: T) => Promise<boolean>);
