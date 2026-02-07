import { ValidateFn } from './validate-fn.type';

/**
 * Validator type which can be:
 * 1. A standard ValidateFn (returns ValidationResult)
 * 2. A simple predicate function (returns boolean)
 * 3. A Zod-like schema object (has safeParse method)
 */
export type Validator<T = any> =
  | ValidateFn<T>
  | ((value: T) => boolean)
  | { safeParse: (data: unknown) => { success: boolean; error?: { errors: { message: string }[] } } };
