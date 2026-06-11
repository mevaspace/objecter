import type { MappingContext } from './mapping-context.type';

/**
 * Async transform function for value conversion
 * Use with convertAsync, convertArrayAsync, or mapAsync methods
 */
// oxlint-disable-next-line typescript/no-explicit-any
export type AsyncTransformFn<TInput = any, TOutput = unknown> = (
  value: TInput,
  source: unknown,
  context?: MappingContext,
) => Promise<TOutput>;
