import type { MappingContext } from './mapping-context.interface';

/**
 * Async transform function for value conversion
 * Use with convertAsync, convertArrayAsync, or mapAsync methods
 */
export type AsyncTransformFn<TInput = any, TOutput = unknown> = (
  value: TInput,
  source: unknown,
  context?: MappingContext,
) => Promise<TOutput>;
